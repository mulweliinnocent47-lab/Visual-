import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ProjectData, Block, buildBlockInlineStyle } from '@/types/blocks';

export async function exportAsTypescriptProject(project: ProjectData) {
  const zip = new JSZip();

  // Get all screens
  const screens = project.blocks.filter(b => b.type === 'screen');
  const screenNames = screens.map(s => s.props.screenName || 'Main');
  if (screenNames.length === 0) screenNames.push('Main');

  // package.json
  zip.file('package.json', JSON.stringify({
    name: project.name.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    private: true,
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^18.3.0',
      'react-dom': '^18.3.0',
      'react-router-dom': '^6.30.0',
    },
    devDependencies: {
      '@types/react': '^18.3.0',
      '@types/react-dom': '^18.3.0',
      '@vitejs/plugin-react': '^4.3.0',
      typescript: '^5.5.0',
      vite: '^5.4.0',
    },
  }, null, 2));

  // tsconfig
  zip.file('tsconfig.json', JSON.stringify({
    compilerOptions: {
      target: 'ES2020', useDefineForClassFields: true, lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext', skipLibCheck: true, moduleResolution: 'bundler',
      allowImportingTsExtensions: true, isolatedModules: true, moduleDetection: 'force',
      noEmit: true, jsx: 'react-jsx', strict: true, noUnusedLocals: false,
      noUnusedParameters: false, noFallthroughCasesInSwitch: true,
      paths: { '@/*': ['./src/*'] },
    },
    include: ['src'],
  }, null, 2));

  // vite.config.ts
  zip.file('vite.config.ts', `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
`);

  // index.html
  zip.file('index.html', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${project.name}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`);

  // main.tsx
  zip.file('src/main.tsx', `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
`);

  // index.css
  zip.file('src/index.css', `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; background: #fafafa; color: #1a1f2e; }
.app-container { max-width: 430px; margin: 0 auto; min-height: 100vh; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
button { cursor: pointer; font-family: inherit; }
input { font-family: inherit; }
`);

  // App.tsx with routing
  const screenImports = screenNames.map(name => {
    const safeName = name.replace(/[^a-zA-Z0-9]/g, '');
    return `import ${safeName}Screen from './screens/${safeName}';`;
  }).join('\n');

  const screenRoutes = screenNames.map(name => {
    const safeName = name.replace(/[^a-zA-Z0-9]/g, '');
    const path = name === 'Main' ? '/' : `/${safeName.toLowerCase()}`;
    return `        <Route path="${path}" element={<${safeName}Screen />} />`;
  }).join('\n');

  zip.file('src/App.tsx', `import { BrowserRouter, Routes, Route } from 'react-router-dom';
${screenImports}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
${screenRoutes}
      </Routes>
    </BrowserRouter>
  );
}
`);

  // Generate screen files
  for (const screenName of screenNames) {
    const safeName = screenName.replace(/[^a-zA-Z0-9]/g, '');
    const screenBlock = screens.find(s => s.props.screenName === screenName);
    const screenBlockIds = screenBlock ? new Set(screenBlock.connections) : null;

    const screenBlocks = screenBlockIds
      ? project.blocks.filter(b => screenBlockIds.has(b.id) || b.screenId === screenName)
      : project.blocks;

    const uiBlocks = screenBlocks
      .filter(b => ['button', 'text', 'input', 'display', 'image', 'videoPlayer', 'audioPlayer', 'fileUpload'].includes(b.type))
      .sort((a, b) => a.y - b.y);

    const hasVariables = screenBlocks.some(b => b.type === 'variable' || b.type === 'globalState');
    const hasInputs = screenBlocks.some(b => b.type === 'input');
    const hasNav = screenBlocks.some(b => b.type === 'navigateTo');

    let stateLines = '';
    let imports = "import React, { useState } from 'react';\n";
    if (hasNav) imports += "import { useNavigate } from 'react-router-dom';\n";

    if (hasVariables) {
      const vars = screenBlocks.filter(b => b.type === 'variable' || b.type === 'globalState');
      vars.forEach(v => {
        const init = v.props.varType === 'number' ? (parseFloat(v.props.value) || 0) : `'${v.props.value || ''}'`;
        stateLines += `  const [${v.props.name}, set${capitalize(v.props.name)}] = useState<${v.props.varType === 'number' ? 'number' : 'string'}>(${init});\n`;
      });
    }

    if (hasInputs) {
      const inputs = screenBlocks.filter(b => b.type === 'input');
      inputs.forEach(inp => {
        const varName = `input_${inp.id.slice(-6)}`;
        stateLines += `  const [${varName}, set${capitalize(varName)}] = useState('');\n`;
      });
    }

    const jsxElements = uiBlocks.map(b => generateBlockJSX(b, project.blocks, screenBlocks)).join('\n');

    const screenContent = `${imports}
export default function ${safeName}Screen() {
${stateLines}${hasNav ? '  const navigate = useNavigate();\n' : ''}
  return (
    <div className="app-container">
      <h2 style={{ fontSize: '18px', fontWeight: 600, padding: '8px 0' }}>📱 ${screenName}</h2>
${jsxElements}
    </div>
  );
}
`;
    zip.file(`src/screens/${safeName}.tsx`, screenContent);
  }

  // Generate and download
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `${project.name}.zip`);
}

function generateBlockJSX(block: Block, allBlocks: Block[], screenBlocks: Block[]): string {
  const indent = '      ';
  const inlineStyle = buildBlockInlineStyle(block.style, block.layout);
  const styleStr = Object.keys(inlineStyle).length > 0
    ? ` style={${JSON.stringify(inlineStyle)}}`
    : '';

  switch (block.type) {
    case 'button':
      return `${indent}<button onClick={() => { /* TODO: wire logic */ }}${styleStr} style={{ width: '100%', padding: '14px', backgroundColor: '${block.style?.backgroundColor || '#2563eb'}', color: '${block.style?.textColor || 'white'}', border: 'none', borderRadius: '${block.style?.borderRadius || 16}px', fontSize: '14px', fontWeight: 500, ...${JSON.stringify(inlineStyle)} }}>${block.props.text}</button>`;
    case 'text':
      return `${indent}<p${styleStr} style={{ fontSize: '14px', fontWeight: 500, padding: '8px 0', ...${JSON.stringify(inlineStyle)} }}>${block.props.text}</p>`;
    case 'input': {
      const varName = `input_${block.id.slice(-6)}`;
      return `${indent}<input placeholder="${block.props.placeholder || ''}" value={${varName}} onChange={e => set${capitalize(varName)}(e.target.value)}${styleStr} style={{ width: '100%', padding: '14px', border: '1px solid #e2e5ea', borderRadius: '16px', fontSize: '14px', outline: 'none', ...${JSON.stringify(inlineStyle)} }} />`;
    }
    case 'display':
      return `${indent}<div${styleStr} style={{ padding: '20px', background: '#f0f2f5', borderRadius: '16px', textAlign: 'center', fontSize: '28px', fontWeight: 700, ...${JSON.stringify(inlineStyle)} }}>{${block.props.value ? `'${block.props.value}'` : `'0'`}}</div>`;
    case 'image':
      return `${indent}<img src="${block.props.src || ''}" alt="${block.props.alt || ''}"${styleStr} style={{ width: '100%', borderRadius: '16px', objectFit: '${block.props.fit || 'cover'}', ...${JSON.stringify(inlineStyle)} }} />`;
    case 'videoPlayer':
      return `${indent}<video src="${block.props.src || ''}" controls${block.props.autoplay ? ' autoPlay' : ''}${styleStr} style={{ width: '100%', borderRadius: '16px', ...${JSON.stringify(inlineStyle)} }} />`;
    case 'audioPlayer':
      return `${indent}<audio src="${block.props.src || ''}" controls${styleStr} style={{ width: '100%', ...${JSON.stringify(inlineStyle)} }} />`;
    case 'fileUpload':
      return `${indent}<input type="file" accept="${block.props.accept || '*'}"${styleStr} style={{ padding: '16px', border: '2px dashed #e2e5ea', borderRadius: '16px', width: '100%', ...${JSON.stringify(inlineStyle)} }} />`;
    default:
      return '';
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
