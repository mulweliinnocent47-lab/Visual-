import { useState } from 'react';
import { X, Paintbrush, Layout, Database, Zap, Sparkles, Settings2 } from 'lucide-react';
import { Block, BlockStyle, BlockLayout, BlockEvents, BlockRenderControl } from '@/types/blocks';

interface InspectorPanelProps {
  block: Block | null;
  onUpdate: (id: string, updates: Partial<Block>) => void;
  onClose: () => void;
}

type TabKey = 'style' | 'layout' | 'data' | 'events' | 'animation' | 'advanced';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'style', label: 'Style', icon: <Paintbrush size={13} /> },
  { key: 'layout', label: 'Layout', icon: <Layout size={13} /> },
  { key: 'data', label: 'Data', icon: <Database size={13} /> },
  { key: 'events', label: 'Events', icon: <Zap size={13} /> },
  { key: 'animation', label: 'Anim', icon: <Sparkles size={13} /> },
  { key: 'advanced', label: 'Adv', icon: <Settings2 size={13} /> },
];

const inputCls = "w-full text-[11px] px-2 py-1.5 rounded-lg border border-border bg-secondary/50 outline-none focus:ring-1 focus:ring-primary/40 transition-all text-foreground";
const labelCls = "text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block";
const smallInputCls = "w-16 text-[11px] px-1.5 py-1.5 rounded-lg border border-border bg-secondary/50 outline-none focus:ring-1 focus:ring-primary/40 text-foreground";
const selectCls = "text-[11px] px-1.5 py-1.5 rounded-lg border border-border bg-secondary/50 outline-none text-foreground";

export default function InspectorPanel({ block, onUpdate, onClose }: InspectorPanelProps) {
  const [tab, setTab] = useState<TabKey>('style');

  if (!block) return null;

  const setStyle = (key: keyof BlockStyle, val: any) => {
    onUpdate(block.id, { style: { ...block.style, [key]: val } });
  };
  const setLayout = (key: keyof BlockLayout, val: any) => {
    onUpdate(block.id, { layout: { ...block.layout, [key]: val } });
  };
  const setEvents = (key: keyof BlockEvents, val: any) => {
    onUpdate(block.id, { events: { ...block.events, [key]: val } });
  };
  const setRender = (key: keyof BlockRenderControl, val: any) => {
    onUpdate(block.id, { renderControl: { ...block.renderControl, [key]: val } });
  };

  return (
    <div className="w-64 bg-card border-l border-border flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs">🔧</span>
          <span className="text-[11px] font-semibold text-foreground truncate max-w-[140px]">{block.label}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary text-muted-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50 px-1 gap-0.5 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 px-2 py-2 text-[10px] font-medium transition-all whitespace-nowrap border-b-2 ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tab === 'style' && <StyleTab block={block} setStyle={setStyle} />}
        {tab === 'layout' && <LayoutTab block={block} setLayout={setLayout} />}
        {tab === 'data' && <DataTab block={block} />}
        {tab === 'events' && <EventsTab block={block} setEvents={setEvents} />}
        {tab === 'animation' && <AnimationTab block={block} setRender={setRender} />}
        {tab === 'advanced' && <AdvancedTab block={block} setRender={setRender} onUpdate={onUpdate} />}
      </div>
    </div>
  );
}

function StyleTab({ block, setStyle }: { block: Block; setStyle: (k: keyof BlockStyle, v: any) => void }) {
  const s = block.style || {};
  return (
    <>
      <Section title="Colors">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Background</label>
            <input type="color" value={s.backgroundColor || '#ffffff'} onChange={e => setStyle('backgroundColor', e.target.value)} className="w-full h-7 rounded-lg cursor-pointer border border-border" />
          </div>
          <div>
            <label className={labelCls}>Text</label>
            <input type="color" value={s.textColor || '#000000'} onChange={e => setStyle('textColor', e.target.value)} className="w-full h-7 rounded-lg cursor-pointer border border-border" />
          </div>
        </div>
      </Section>

      <Section title="Typography">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Size (px)</label>
            <input type="number" className={smallInputCls} value={s.fontSize || ''} onChange={e => setStyle('fontSize', parseInt(e.target.value) || undefined)} placeholder="14" />
          </div>
          <div>
            <label className={labelCls}>Weight</label>
            <select className={selectCls} value={s.fontWeight || ''} onChange={e => setStyle('fontWeight', e.target.value || undefined)}>
              <option value="">Default</option>
              <option value="300">Light</option>
              <option value="400">Normal</option>
              <option value="500">Medium</option>
              <option value="600">Semibold</option>
              <option value="700">Bold</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Font Family</label>
          <select className={selectCls + ' w-full'} value={s.fontFamily || ''} onChange={e => setStyle('fontFamily', e.target.value || undefined)}>
            <option value="">Default</option>
            <option value="Inter">Inter</option>
            <option value="Poppins">Poppins</option>
            <option value="Roboto">Roboto</option>
            <option value="monospace">Monospace</option>
            <option value="serif">Serif</option>
          </select>
        </div>
      </Section>

      <Section title="Border">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Width</label>
            <input type="number" className={smallInputCls} value={s.borderWidth ?? ''} onChange={e => setStyle('borderWidth', parseInt(e.target.value) || undefined)} />
          </div>
          <div>
            <label className={labelCls}>Radius</label>
            <input type="number" className={smallInputCls} value={s.borderRadius ?? ''} onChange={e => setStyle('borderRadius', parseInt(e.target.value) || undefined)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Border Color</label>
          <input type="color" value={s.borderColor || '#cccccc'} onChange={e => setStyle('borderColor', e.target.value)} className="w-full h-7 rounded-lg cursor-pointer border border-border" />
        </div>
      </Section>

      <Section title="Shadow">
        <div className="grid grid-cols-3 gap-1">
          <div><label className={labelCls}>X</label><input type="number" className={smallInputCls} value={s.shadowX ?? ''} onChange={e => setStyle('shadowX', parseInt(e.target.value) || 0)} /></div>
          <div><label className={labelCls}>Y</label><input type="number" className={smallInputCls} value={s.shadowY ?? ''} onChange={e => setStyle('shadowY', parseInt(e.target.value) || 0)} /></div>
          <div><label className={labelCls}>Blur</label><input type="number" className={smallInputCls} value={s.shadowBlur ?? ''} onChange={e => setStyle('shadowBlur', parseInt(e.target.value) || 0)} /></div>
        </div>
      </Section>

      <Section title="Effects">
        <div>
          <label className={labelCls}>Opacity</label>
          <input type="range" min="0" max="1" step="0.05" value={s.opacity ?? 1} onChange={e => setStyle('opacity', parseFloat(e.target.value))} className="w-full" />
          <span className="text-[9px] text-muted-foreground">{Math.round((s.opacity ?? 1) * 100)}%</span>
        </div>
      </Section>

      <Section title="Gradient">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>From</label>
            <input type="color" value={s.gradientFrom || '#3b82f6'} onChange={e => setStyle('gradientFrom', e.target.value)} className="w-full h-7 rounded-lg cursor-pointer border border-border" />
          </div>
          <div>
            <label className={labelCls}>To</label>
            <input type="color" value={s.gradientTo || '#8b5cf6'} onChange={e => setStyle('gradientTo', e.target.value)} className="w-full h-7 rounded-lg cursor-pointer border border-border" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Direction</label>
          <select className={selectCls + ' w-full'} value={s.gradientDirection || '135deg'} onChange={e => setStyle('gradientDirection', e.target.value)}>
            <option value="to right">→ Right</option>
            <option value="to bottom">↓ Down</option>
            <option value="135deg">↘ Diagonal</option>
            <option value="to top">↑ Up</option>
            <option value="45deg">↗ Diagonal Up</option>
          </select>
        </div>
      </Section>

      <Section title="Hover">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Hover BG</label>
            <input type="color" value={s.hoverBg || '#eeeeee'} onChange={e => setStyle('hoverBg', e.target.value)} className="w-full h-7 rounded-lg cursor-pointer border border-border" />
          </div>
          <div>
            <label className={labelCls}>Hover Scale</label>
            <input type="number" className={smallInputCls} value={s.hoverScale ?? ''} step="0.01" onChange={e => setStyle('hoverScale', parseFloat(e.target.value) || undefined)} placeholder="1.05" />
          </div>
        </div>
      </Section>
    </>
  );
}

function LayoutTab({ block, setLayout }: { block: Block; setLayout: (k: keyof BlockLayout, v: any) => void }) {
  const l = block.layout || {};
  return (
    <>
      <Section title="Size">
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Width</label><input className={inputCls} value={l.width || ''} onChange={e => setLayout('width', e.target.value || undefined)} placeholder="auto" /></div>
          <div><label className={labelCls}>Height</label><input className={inputCls} value={l.height || ''} onChange={e => setLayout('height', e.target.value || undefined)} placeholder="auto" /></div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div><label className={labelCls}>Min W</label><input className={inputCls} value={l.minWidth || ''} onChange={e => setLayout('minWidth', e.target.value || undefined)} /></div>
          <div><label className={labelCls}>Max W</label><input className={inputCls} value={l.maxWidth || ''} onChange={e => setLayout('maxWidth', e.target.value || undefined)} /></div>
        </div>
      </Section>

      <Section title="Position">
        <div>
          <label className={labelCls}>Type</label>
          <select className={selectCls + ' w-full'} value={l.position || 'relative'} onChange={e => setLayout('position', e.target.value as any)}>
            <option value="relative">Relative</option>
            <option value="absolute">Absolute</option>
            <option value="fixed">Fixed</option>
          </select>
        </div>
        {l.position === 'absolute' || l.position === 'fixed' ? (
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div><label className={labelCls}>X</label><input className={inputCls} value={l.posX || ''} onChange={e => setLayout('posX', e.target.value)} /></div>
            <div><label className={labelCls}>Y</label><input className={inputCls} value={l.posY || ''} onChange={e => setLayout('posY', e.target.value)} /></div>
          </div>
        ) : null}
      </Section>

      <Section title="Margin">
        <div className="grid grid-cols-4 gap-1">
          {(['marginTop', 'marginRight', 'marginBottom', 'marginLeft'] as const).map(k => (
            <div key={k}>
              <label className={labelCls}>{k.replace('margin', '')[0]}</label>
              <input type="number" className={smallInputCls} value={l[k] ?? ''} onChange={e => setLayout(k, parseInt(e.target.value) || 0)} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Padding">
        <div className="grid grid-cols-4 gap-1">
          {(['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const).map(k => (
            <div key={k}>
              <label className={labelCls}>{k.replace('padding', '')[0]}</label>
              <input type="number" className={smallInputCls} value={l[k] ?? ''} onChange={e => setLayout(k, parseInt(e.target.value) || 0)} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Transform">
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Rotation°</label><input type="number" className={smallInputCls} value={l.rotation ?? ''} onChange={e => setLayout('rotation', parseInt(e.target.value) || 0)} /></div>
          <div><label className={labelCls}>Scale</label><input type="number" step="0.1" className={smallInputCls} value={l.scale ?? ''} onChange={e => setLayout('scale', parseFloat(e.target.value) || undefined)} placeholder="1" /></div>
        </div>
        <div><label className={labelCls}>Z-Index</label><input type="number" className={smallInputCls} value={l.zIndex ?? ''} onChange={e => setLayout('zIndex', parseInt(e.target.value) || undefined)} /></div>
      </Section>

      <Section title="Flex">
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Align Self</label>
            <select className={selectCls + ' w-full'} value={l.alignSelf || ''} onChange={e => setLayout('alignSelf', e.target.value || undefined)}>
              <option value="">Auto</option><option value="start">Start</option><option value="center">Center</option><option value="end">End</option><option value="stretch">Stretch</option>
            </select>
          </div>
          <div><label className={labelCls}>Gap</label><input type="number" className={smallInputCls} value={l.gap ?? ''} onChange={e => setLayout('gap', parseInt(e.target.value) || undefined)} /></div>
        </div>
      </Section>

      <Section title="Container">
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Overflow</label>
            <select className={selectCls + ' w-full'} value={l.overflow || 'visible'} onChange={e => setLayout('overflow', e.target.value as any)}>
              <option value="visible">Visible</option><option value="hidden">Hidden</option><option value="scroll">Scroll</option><option value="auto">Auto</option>
            </select>
          </div>
          <div><label className={labelCls}>Wrap</label>
            <button onClick={() => setLayout('flexWrap', !l.flexWrap)} className={`w-full py-1.5 rounded-lg text-[10px] font-medium transition-all ${l.flexWrap ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}>
              {l.flexWrap ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </Section>
    </>
  );
}

function DataTab({ block }: { block: Block }) {
  return (
    <div className="space-y-2">
      <Section title="Block Info">
        <div className="space-y-1 text-[10px] text-muted-foreground">
          <div className="flex justify-between"><span>ID</span><span className="font-mono text-foreground">{block.id.slice(-8)}</span></div>
          <div className="flex justify-between"><span>Type</span><span className="font-mono text-foreground">{block.type}</span></div>
          <div className="flex justify-between"><span>Position</span><span className="font-mono text-foreground">{block.x}, {block.y}</span></div>
          <div className="flex justify-between"><span>Connections</span><span className="font-mono text-foreground">{block.connections.length}</span></div>
        </div>
      </Section>
      <Section title="Properties">
        <div className="space-y-1">
          {Object.entries(block.props).filter(([k]) => !k.startsWith('_')).map(([k, v]) => (
            <div key={k} className="flex justify-between text-[10px]">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-mono text-foreground truncate max-w-[100px]">{String(v)}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function EventsTab({ block, setEvents }: { block: Block; setEvents: (k: keyof BlockEvents, v: any) => void }) {
  const ev = block.events || {};
  const isUI = ['button', 'input', 'text', 'display', 'image'].includes(block.type);
  return (
    <>
      {isUI && (
        <Section title="Click Events">
          <div><label className={labelCls}>On Double Click</label><input className={inputCls} value={ev.onDoubleClick || ''} onChange={e => setEvents('onDoubleClick', e.target.value)} placeholder="Block ID to trigger" /></div>
          <div><label className={labelCls}>On Long Press</label><input className={inputCls} value={ev.onLongPress || ''} onChange={e => setEvents('onLongPress', e.target.value)} placeholder="Block ID to trigger" /></div>
        </Section>
      )}

      <Section title="Options">
        <div><label className={labelCls}>Debounce (ms)</label><input type="number" className={inputCls} value={ev.debounceMs ?? ''} onChange={e => setEvents('debounceMs', parseInt(e.target.value) || undefined)} placeholder="300" /></div>
        <div className="flex items-center gap-2 mt-2">
          <input type="checkbox" checked={ev.confirmAction || false} onChange={e => setEvents('confirmAction', e.target.checked)} className="rounded border-border" />
          <span className="text-[10px] text-muted-foreground">Require confirmation</span>
        </div>
        {ev.confirmAction && (
          <div className="mt-1"><label className={labelCls}>Confirm Message</label><input className={inputCls} value={ev.confirmMessage || ''} onChange={e => setEvents('confirmMessage', e.target.value)} placeholder="Are you sure?" /></div>
        )}
      </Section>

      {block.type === 'input' && (
        <Section title="Input Events">
          <div><label className={labelCls}>On Submit</label><input className={inputCls} value={ev.onSubmit || ''} onChange={e => setEvents('onSubmit', e.target.value)} placeholder="Block ID" /></div>
        </Section>
      )}
    </>
  );
}

function AnimationTab({ block, setRender }: { block: Block; setRender: (k: keyof BlockRenderControl, v: any) => void }) {
  const rc = block.renderControl || {};
  return (
    <>
      <Section title="Mount Animation">
        <select className={selectCls + ' w-full'} value={rc.mountAnimation || ''} onChange={e => setRender('mountAnimation', e.target.value || undefined)}>
          <option value="">None</option>
          <option value="fadeIn">Fade In</option>
          <option value="slideUp">Slide Up</option>
          <option value="slideDown">Slide Down</option>
          <option value="scaleIn">Scale In</option>
          <option value="bounce">Bounce</option>
        </select>
      </Section>
      <Section title="Unmount Animation">
        <select className={selectCls + ' w-full'} value={rc.unmountAnimation || ''} onChange={e => setRender('unmountAnimation', e.target.value || undefined)}>
          <option value="">None</option>
          <option value="fadeOut">Fade Out</option>
          <option value="slideDown">Slide Down</option>
          <option value="scaleOut">Scale Out</option>
        </select>
      </Section>
    </>
  );
}

function AdvancedTab({ block, setRender, onUpdate }: { block: Block; setRender: (k: keyof BlockRenderControl, v: any) => void; onUpdate: (id: string, u: Partial<Block>) => void }) {
  const rc = block.renderControl || {};
  return (
    <>
      <Section title="Conditional Rendering">
        <div><label className={labelCls}>Show if variable</label><input className={inputCls} value={rc.showCondition || ''} onChange={e => setRender('showCondition', e.target.value || undefined)} placeholder="variableName" /></div>
        <div className="mt-1"><label className={labelCls}>Equals value</label><input className={inputCls} value={rc.showConditionValue || ''} onChange={e => setRender('showConditionValue', e.target.value || undefined)} placeholder="true" /></div>
        <div className="flex items-center gap-2 mt-2">
          <input type="checkbox" checked={rc.showIfLoggedIn || false} onChange={e => setRender('showIfLoggedIn', e.target.checked)} className="rounded border-border" />
          <span className="text-[10px] text-muted-foreground">Show only if logged in</span>
        </div>
      </Section>
      <Section title="Performance">
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={rc.lazyRender || false} onChange={e => setRender('lazyRender', e.target.checked)} className="rounded border-border" />
          <span className="text-[10px] text-muted-foreground">Lazy render</span>
        </div>
      </Section>
      <Section title="Lock">
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={block.locked || false} onChange={e => onUpdate(block.id, { locked: e.target.checked })} className="rounded border-border" />
          <span className="text-[10px] text-muted-foreground">Lock block (prevent drag)</span>
        </div>
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
        <span className="w-1 h-3 bg-primary rounded-full" />
        {title}
      </h4>
      <div className="space-y-1.5 pl-2">{children}</div>
    </div>
  );
}
