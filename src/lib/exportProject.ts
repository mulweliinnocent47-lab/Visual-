import { ProjectData } from '@/types/blocks';

export function exportAsJSON(project: ProjectData): void {
  const data = JSON.stringify(project, null, 2);
  downloadFile(`${project.name}.json`, data, 'application/json');
}

export function exportAsHTML(project: ProjectData): void {
  const blocks = project.blocks;
  const sorted = [...blocks].sort((a, b) => a.y - b.y);

  const vars = blocks.filter(b => b.type === 'variable');
  const varInits = vars.map(v => `  "${v.props.name}": "${v.props.value}"`).join(',\n');

  let uiHTML = '';
  let eventJS = '';

  sorted.forEach(block => {
    const eid = block.id.replace(/[^a-zA-Z0-9]/g, '_');
    if (block.type === 'button') {
      uiHTML += `    <button class="btn" id="${eid}" onclick="handleClick_${eid}()">${block.props.text}</button>\n`;
      // Build click handler
      let actions = '';
      block.connections.forEach(cId => {
        const c = blocks.find(b => b.id === cId);
        if (!c) return;
        if (c.type === 'math') {
          const op = c.props.op === '×' ? '*' : c.props.op === '÷' ? '/' : c.props.op;
          actions += `      var result = parseFloat(resolve("${c.props.a}")) ${op} parseFloat(resolve("${c.props.b}"));\n`;
          c.connections.forEach(dId => {
            const d = blocks.find(b => b.id === dId);
            if (d?.type === 'display') actions += `      document.getElementById("${dId.replace(/[^a-zA-Z0-9]/g, '_')}").textContent = result;\n`;
            if (d?.type === 'variable') actions += `      vars["${d.props.name}"] = String(result);\n`;
          });
        }
        if (c.type === 'alert') actions += `      showAlert("${c.props.message}");\n`;
        if (c.type === 'variable') {
          const inputConn = block.connections.find(id => blocks.find(b => b.id === id)?.type === 'input');
          if (inputConn) actions += `      vars["${c.props.name}"] = document.getElementById("${inputConn.replace(/[^a-zA-Z0-9]/g, '_')}").value;\n`;
        }
        if (c.type === 'display') {
          const varBlock = blocks.find(b => b.type === 'variable' && block.connections.includes(b.id));
          if (varBlock) actions += `      document.getElementById("${cId.replace(/[^a-zA-Z0-9]/g, '_')}").textContent = vars["${varBlock.props.name}"];\n`;
        }
      });
      eventJS += `    function handleClick_${eid}() {\n${actions}    }\n`;
    }
    if (block.type === 'text') {
      uiHTML += `    <p class="text">${block.props.text}</p>\n`;
    }
    if (block.type === 'input') {
      uiHTML += `    <input class="input" id="${eid}" placeholder="${block.props.placeholder}" />\n`;
    }
    if (block.type === 'display') {
      uiHTML += `    <div class="display" id="${eid}">${block.props.value}</div>\n`;
    }
    if (block.type === 'variable') {
      uiHTML += `    <div class="var-display">📦 ${block.props.name} = <span id="${eid}">${block.props.value}</span></div>\n`;
    }
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name} — Made with tydarSU</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Poppins', system-ui, sans-serif; background: #fafafa; color: #1a1f2e; display: flex; justify-content: center; padding: 24px; min-height: 100vh; }
    .app { width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 12px; }
    .btn { width: 100%; padding: 14px; background: #2563eb; color: white; border: none; border-radius: 16px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit; transition: opacity 0.2s, transform 0.15s; }
    .btn:hover { opacity: 0.9; }
    .btn:active { transform: scale(0.97); }
    .text { font-size: 14px; font-weight: 500; padding: 8px 0; }
    .input { width: 100%; padding: 14px; border: 1px solid #e2e5ea; border-radius: 16px; font-size: 14px; outline: none; font-family: inherit; background: white; transition: box-shadow 0.2s; }
    .input:focus { box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15); }
    .display { padding: 20px; background: #f0f2f5; border-radius: 16px; text-align: center; font-size: 28px; font-weight: 700; }
    .var-display { padding: 10px 16px; background: rgba(14, 165, 233, 0.08); border-radius: 16px; font-size: 12px; color: #64748b; }
    .alert-container { position: fixed; top: 16px; right: 16px; z-index: 100; }
    .alert-toast { background: white; border: 1px solid #e2e5ea; border-radius: 16px; padding: 12px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); font-size: 14px; margin-bottom: 8px; animation: slideUp 0.3s ease; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  </style>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="app">
${uiHTML}  </div>
  <div class="alert-container" id="alerts"></div>
  <script>
    var vars = {\n${varInits}\n    };
    function resolve(val) { return vars[val] !== undefined ? vars[val] : val; }
    function showAlert(msg) {
      var el = document.createElement('div');
      el.className = 'alert-toast';
      el.textContent = '💬 ' + msg;
      document.getElementById('alerts').appendChild(el);
      setTimeout(function() { el.remove(); }, 2500);
    }
${eventJS}  </script>
</body>
</html>`;

  downloadFile(`${project.name}.html`, html, 'text/html');
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
