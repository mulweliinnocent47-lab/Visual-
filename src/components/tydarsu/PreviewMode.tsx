import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Block, buildBlockInlineStyle } from '@/types/blocks';
import { Interpreter, ExecutionState } from '@/lib/interpreter';
import VariableInspector from './VariableInspector';
import DevicePreview, { DeviceMode, getDeviceWidth } from './DevicePreview';
import { ChevronLeft, Activity, Move, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PreviewModeProps {
  blocks: Block[];
}

const pageVariants = {
  initial: { opacity: 0, x: 60, scale: 0.97 },
  animate: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.35, ease: [0.25, 0.8, 0.25, 1] } },
  exit: { opacity: 0, x: -40, scale: 0.97, transition: { duration: 0.25, ease: [0.25, 0.8, 0.25, 1] } },
};

export default function PreviewMode({ blocks }: PreviewModeProps) {
  const [state, setState] = useState<ExecutionState | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [alerts, setAlerts] = useState<string[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [slowMode, setSlowMode] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [showPerf, setShowPerf] = useState(false);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('mobile');
  const [editMode, setEditMode] = useState(false);
  const [blockPositions, setBlockPositions] = useState<Record<string, { order: number }>>({});
  const interpreterRef = useRef<Interpreter | null>(null);
  const prevScreenRef = useRef<string>('Main');

  useEffect(() => {
    const interpreter = new Interpreter(blocks, {
      onStateChange: (s) => setState({ ...s }),
      onBlockActivate: (id) => setActiveBlockId(id),
      onAlert: (msg) => {
        setAlerts(prev => [...prev, msg]);
        setTimeout(() => setAlerts(prev => prev.slice(1)), 2500);
      },
    }, slowMode);
    interpreterRef.current = interpreter;
    interpreter.start();
    return () => { interpreter.stop(); };
  }, [blocks]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { interpreterRef.current?.setSlowMode(slowMode); }, [slowMode]);

  const currentScreen = state?.currentScreen || 'Main';
  const displayValues = state?.displayValues ?? {};
  const variables = state?.variables ?? {};

  // Track direction for animation
  const screenStackLen = state?.screenStack.length ?? 1;
  const goingBack = useRef(false);
  useEffect(() => {
    if (prevScreenRef.current !== currentScreen) {
      goingBack.current = (state?.screenStack.length ?? 1) < screenStackLen;
      prevScreenRef.current = currentScreen;
    }
  }, [currentScreen, state?.screenStack.length, screenStackLen]);

  const screenBlocks = useMemo(() => {
    const screenBlock = blocks.find(b => b.type === 'screen' && b.props.screenName === currentScreen);
    if (screenBlock) {
      const ids = new Set(screenBlock.connections);
      return blocks.filter(b => ids.has(b.id) || b.screenId === currentScreen);
    }
    return blocks;
  }, [blocks, currentScreen]);

  const sorted = useMemo(() => {
    const s = [...screenBlocks].sort((a, b) => {
      const posA = blockPositions[a.id]?.order ?? a.y;
      const posB = blockPositions[b.id]?.order ?? b.y;
      return posA - posB;
    });
    return s;
  }, [screenBlocks, blockPositions]);

  const moveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    const idx = sorted.findIndex(b => b.id === blockId);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;
    const newPositions = { ...blockPositions };
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const currentOrder = blockPositions[blockId]?.order ?? sorted[idx].y;
    const swapOrder = blockPositions[sorted[swapIdx].id]?.order ?? sorted[swapIdx].y;
    newPositions[blockId] = { order: swapOrder };
    newPositions[sorted[swapIdx].id] = { order: currentOrder };
    setBlockPositions(newPositions);
  }, [sorted, blockPositions]);

  if (blocks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">📱</div>
          <p className="text-sm text-muted-foreground font-medium">No blocks to preview</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Add blocks and tap Run</p>
        </div>
      </div>
    );
  }

  const shouldRender = (block: Block): boolean => {
    const rc = block.renderControl;
    if (!rc) return true;
    if (rc.showCondition) {
      const val = String(variables[rc.showCondition] ?? '');
      if (rc.showConditionValue && val !== rc.showConditionValue) return false;
    }
    return true;
  };

  const renderBlock = (block: Block, index: number) => {
    if (!shouldRender(block)) return null;
    const isActive = activeBlockId === block.id;
    const activeClass = isActive ? 'ring-2 ring-primary/40 animate-pulse-soft' : '';
    const inlineStyle = buildBlockInlineStyle(block.style, block.layout);

    const wrapper = (content: React.ReactNode) => (
      <motion.div
        key={block.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3 }}
        layout={editMode}
        className={`relative ${editMode ? 'group' : ''}`}
      >
        {editMode && (
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => moveBlock(block.id, 'up')} className="p-1 rounded bg-secondary hover:bg-primary hover:text-primary-foreground text-muted-foreground text-[10px]">▲</button>
            <button onClick={() => moveBlock(block.id, 'down')} className="p-1 rounded bg-secondary hover:bg-primary hover:text-primary-foreground text-muted-foreground text-[10px]">▼</button>
          </div>
        )}
        {editMode && (
          <div className="absolute -right-2 -top-2 z-10">
            <span className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">{index + 1}</span>
          </div>
        )}
        <div className={editMode ? 'ring-1 ring-dashed ring-primary/30 rounded-2xl p-0.5' : ''}>
          {content}
        </div>
      </motion.div>
    );

    switch (block.type) {
      case 'button':
        return wrapper(
          <button onClick={() => interpreterRef.current?.handleButtonClick(block.id)}
            className={`w-full py-3.5 px-5 bg-primary text-primary-foreground rounded-2xl font-semibold text-sm hover:opacity-90 active:scale-[0.97] transition-all card-shadow hover:elevated-shadow ${activeClass}`}
            style={inlineStyle}
          >{block.props.text}</button>
        );
      case 'text':
        return wrapper(<p className={`text-sm text-foreground font-medium py-2 leading-relaxed ${activeClass}`} style={inlineStyle}>{block.props.text}</p>);
      case 'input':
        return wrapper(
          <div className="space-y-1.5">
            {block.props.label && <label className="text-xs font-semibold text-foreground/80 pl-1">{block.props.label}</label>}
            <input
              className={`w-full py-3.5 px-4 rounded-2xl border border-border bg-secondary/30 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-muted-foreground/50 ${activeClass}`}
              placeholder={block.props.placeholder}
              type={block.props.inputType || 'text'}
              maxLength={block.props.maxLength ? parseInt(block.props.maxLength) : undefined}
              required={block.props.required}
              value={inputValues[block.id] || ''}
              onChange={e => { const val = e.target.value; setInputValues(prev => ({ ...prev, [block.id]: val })); interpreterRef.current?.handleInputChange(block.id, val); }}
              style={inlineStyle}
            />
            {block.props.helperText && <p className="text-[11px] text-muted-foreground/70 pl-1">{block.props.helperText}</p>}
          </div>
        );
      case 'display':
        return wrapper(
          <div className={`py-5 px-5 rounded-2xl bg-card border border-border/50 card-shadow text-center ${activeClass}`} style={inlineStyle}>
            <span className="text-3xl font-extrabold text-foreground">{displayValues[block.id] ?? block.props.value}</span>
          </div>
        );
      case 'image':
        return wrapper(
          <div className={`rounded-2xl overflow-hidden card-shadow ${activeClass}`} style={inlineStyle}>
            <img src={block.props.src} alt={block.props.alt} className="w-full h-auto"
              style={{ objectFit: block.props.fit || 'cover', aspectRatio: block.props.aspectRatio || 'auto', borderRadius: '1rem' }}
              loading={block.props.lazyLoad ? 'lazy' : 'eager'}
            />
          </div>
        );
      case 'variable':
        return wrapper(
          <div className={`py-3 px-4 rounded-2xl bg-card border border-border/50 card-shadow flex items-center gap-3 ${activeClass}`} style={inlineStyle}>
            <span className="w-8 h-8 rounded-xl bg-block-variable/10 flex items-center justify-center text-sm">📦</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">{block.props.name}</p>
              <p className="text-xs text-muted-foreground font-mono-code truncate">{String(variables[block.props.name] ?? block.props.value)}</p>
            </div>
          </div>
        );
      case 'listCreate': {
        const list = variables[block.props.name];
        return wrapper(
          <div className={`py-3 px-4 rounded-2xl bg-card border border-border/50 card-shadow flex items-center gap-3 ${activeClass}`}>
            <span className="w-8 h-8 rounded-xl bg-block-variable/10 flex items-center justify-center text-sm">📋</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">{block.props.name}</p>
              <p className="text-xs text-muted-foreground font-mono-code truncate">{Array.isArray(list) ? `[${list.join(', ')}]` : '[]'}</p>
            </div>
          </div>
        );
      }
      case 'dynamicList': {
        const list = variables[block.props.listName];
        if (!Array.isArray(list)) return null;
        return wrapper(
          <div className="space-y-2">
            {list.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="py-3 px-4 rounded-2xl bg-card border border-border/50 card-shadow text-sm text-foreground">
                {(block.props.template || '{{item}}').replace(/\{\{item\}\}/g, String(item)).replace(/\{\{index\}\}/g, String(i))}
              </motion.div>
            ))}
          </div>
        );
      }
      case 'videoPlayer':
        return wrapper(
          <div className={`rounded-2xl overflow-hidden card-shadow ${activeClass}`} style={inlineStyle}>
            {block.props.src ? (
              <video src={block.props.src} controls={block.props.controls !== false} autoPlay={block.props.autoplay}
                loop={block.props.loop} muted={block.props.muted} className="w-full rounded-2xl" />
            ) : <div className="py-10 bg-secondary/50 rounded-2xl text-center text-muted-foreground text-sm">🎬 No video URL set</div>}
          </div>
        );
      case 'audioPlayer':
        return wrapper(
          <div className={`py-4 px-5 rounded-2xl bg-card border border-border/50 card-shadow ${activeClass}`} style={inlineStyle}>
            {block.props.src ? <audio src={block.props.src} controls className="w-full" loop={block.props.loop} /> : <p className="text-sm text-muted-foreground text-center">🔊 No audio URL set</p>}
          </div>
        );
      case 'fileUpload':
        return wrapper(
          <div className={`py-6 px-5 rounded-2xl border-2 border-dashed border-border bg-secondary/20 text-center ${activeClass}`} style={inlineStyle}>
            <div className="text-2xl mb-2">📁</div>
            <p className="text-sm font-medium text-foreground">Tap to upload</p>
            <p className="text-[11px] text-muted-foreground mt-1">Max {block.props.maxSize}MB</p>
          </div>
        );
      case 'globalState': case 'reactiveVar':
        return wrapper(
          <div className={`py-3 px-4 rounded-2xl bg-card border border-border/50 card-shadow flex items-center gap-3 ${activeClass}`}>
            <span className="w-8 h-8 rounded-xl bg-block-state/10 flex items-center justify-center text-sm">{block.type === 'globalState' ? '🌍' : '⚡'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">{block.props.name}</p>
              <p className="text-xs text-muted-foreground font-mono-code truncate">{String(variables[block.props.name] ?? block.props.value)}</p>
            </div>
          </div>
        );
      // Website blocks
      case 'navbar':
        return wrapper(
          <div className={`flex items-center justify-between py-3 px-4 rounded-2xl bg-card border border-border/50 card-shadow ${activeClass}`} style={inlineStyle}>
            <span className="text-sm font-bold text-foreground">{block.props.brand || 'Brand'}</span>
            <div className="flex gap-3">
              {(block.props.links || 'Home,About,Contact').split(',').map((link: string, i: number) => (
                <span key={i} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">{link.trim()}</span>
              ))}
            </div>
          </div>
        );
      case 'hero':
        return wrapper(
          <div className={`py-12 px-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 text-center ${activeClass}`} style={inlineStyle}>
            <h1 className="text-2xl font-extrabold text-foreground mb-2">{block.props.title || 'Welcome'}</h1>
            <p className="text-sm text-muted-foreground mb-4">{block.props.subtitle || 'Build something amazing'}</p>
            {block.props.ctaText && (
              <button onClick={() => interpreterRef.current?.handleButtonClick(block.id)}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-2xl font-semibold text-sm hover:opacity-90 active:scale-[0.97] transition-all">
                {block.props.ctaText}
              </button>
            )}
          </div>
        );
      case 'footer':
        return wrapper(
          <div className={`py-6 px-4 rounded-2xl bg-secondary/30 border border-border/30 text-center ${activeClass}`} style={inlineStyle}>
            <p className="text-xs text-muted-foreground">{block.props.text || '© 2026 Your Company'}</p>
            {block.props.links && (
              <div className="flex justify-center gap-4 mt-2">
                {block.props.links.split(',').map((link: string, i: number) => (
                  <span key={i} className="text-[11px] text-primary cursor-pointer hover:underline">{link.trim()}</span>
                ))}
              </div>
            )}
          </div>
        );
      case 'cardGrid': {
        const items = variables[block.props.listName];
        const cols = parseInt(block.props.columns || '2') || 2;
        return wrapper(
          <div className={`grid gap-3 ${activeClass}`} style={{ ...inlineStyle, gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.isArray(items) ? items.map((item, i) => (
              <div key={i} className="p-4 rounded-2xl bg-card border border-border/50 card-shadow">
                <p className="text-sm text-foreground">{String(item)}</p>
              </div>
            )) : (
              Array.from({ length: cols * 2 }).map((_, i) => (
                <div key={i} className="p-4 rounded-2xl bg-card border border-border/50 card-shadow">
                  <div className="w-full h-16 bg-secondary/50 rounded-xl mb-2" />
                  <div className="h-3 bg-secondary/50 rounded w-3/4 mb-1" />
                  <div className="h-2 bg-secondary/30 rounded w-1/2" />
                </div>
              ))
            )}
          </div>
        );
      }
      case 'separator':
        return wrapper(<hr className="border-border/50 my-2" style={inlineStyle} />);
      case 'link':
        return wrapper(
          <a href={block.props.url || '#'} target={block.props.target || '_blank'} rel="noopener noreferrer"
            className={`text-sm text-primary underline hover:text-primary/80 transition-colors ${activeClass}`} style={inlineStyle}>
            {block.props.text || 'Link'}
          </a>
        );
      case 'selectDropdown': {
        const options = (block.props.options || 'Option 1,Option 2,Option 3').split(',');
        return wrapper(
          <div className="space-y-1.5">
            {block.props.label && <label className="text-xs font-semibold text-foreground/80 pl-1">{block.props.label}</label>}
            <select
              className={`w-full py-3.5 px-4 rounded-2xl border border-border bg-secondary/30 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all ${activeClass}`}
              value={inputValues[block.id] || ''}
              onChange={e => { setInputValues(prev => ({ ...prev, [block.id]: e.target.value })); interpreterRef.current?.handleInputChange(block.id, e.target.value); }}
              style={inlineStyle}
            >
              <option value="">{block.props.placeholder || 'Select...'}</option>
              {options.map((opt: string, i: number) => <option key={i} value={opt.trim()}>{opt.trim()}</option>)}
            </select>
          </div>
        );
      }
      case 'checkbox':
        return wrapper(
          <label className={`flex items-center gap-3 py-2 cursor-pointer ${activeClass}`} style={inlineStyle}>
            <input type="checkbox" checked={inputValues[block.id] === 'true'}
              onChange={e => { const val = String(e.target.checked); setInputValues(prev => ({ ...prev, [block.id]: val })); interpreterRef.current?.handleInputChange(block.id, val); }}
              className="w-5 h-5 rounded border-border text-primary focus:ring-primary/20" />
            <span className="text-sm text-foreground">{block.props.label || 'Checkbox'}</span>
          </label>
        );
      case 'textarea':
        return wrapper(
          <div className="space-y-1.5">
            {block.props.label && <label className="text-xs font-semibold text-foreground/80 pl-1">{block.props.label}</label>}
            <textarea
              className={`w-full py-3 px-4 rounded-2xl border border-border bg-secondary/30 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none ${activeClass}`}
              placeholder={block.props.placeholder}
              rows={parseInt(block.props.rows || '4')}
              value={inputValues[block.id] || ''}
              onChange={e => { setInputValues(prev => ({ ...prev, [block.id]: e.target.value })); interpreterRef.current?.handleInputChange(block.id, e.target.value); }}
              style={inlineStyle}
            />
          </div>
        );
      case 'badge':
        return wrapper(
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
            block.props.variant === 'destructive' ? 'bg-destructive/10 text-destructive' :
            block.props.variant === 'secondary' ? 'bg-secondary text-secondary-foreground' :
            'bg-primary/10 text-primary'
          } ${activeClass}`} style={inlineStyle}>
            {block.props.text || 'Badge'}
          </span>
        );
      case 'avatar':
        return wrapper(
          <div className={`flex items-center gap-3 ${activeClass}`} style={inlineStyle}>
            {block.props.src ? (
              <img src={block.props.src} alt={block.props.name || 'Avatar'} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {(block.props.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            {block.props.name && <span className="text-sm font-medium text-foreground">{block.props.name}</span>}
          </div>
        );
      case 'progressBar': {
        const val = parseInt(String(variables[block.props.valueVar] ?? block.props.value ?? '50')) || 0;
        return wrapper(
          <div className={`space-y-1 ${activeClass}`} style={inlineStyle}>
            {block.props.label && <div className="flex justify-between"><span className="text-xs text-muted-foreground">{block.props.label}</span><span className="text-xs font-bold text-foreground">{val}%</span></div>}
            <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, val))}%` }} transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-primary rounded-full" />
            </div>
          </div>
        );
      }
      case 'tabsBlock': {
        const tabs = (block.props.tabs || 'Tab 1,Tab 2,Tab 3').split(',');
        const activeTab = inputValues[block.id] || tabs[0]?.trim();
        return wrapper(
          <div className={`space-y-3 ${activeClass}`} style={inlineStyle}>
            <div className="flex gap-1 bg-secondary/40 rounded-2xl p-1">
              {tabs.map((tab: string, i: number) => (
                <button key={i} onClick={() => { setInputValues(prev => ({ ...prev, [block.id]: tab.trim() })); interpreterRef.current?.handleInputChange(block.id, tab.trim()); }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${activeTab === tab.trim() ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {tab.trim()}
                </button>
              ))}
            </div>
          </div>
        );
      }
      case 'customCode': {
        return wrapper(
          <div className={`rounded-2xl border border-border/50 card-shadow overflow-hidden ${activeClass}`} style={inlineStyle}>
            <CustomCodeRenderer code={block.props.code || ''} language={block.props.language || 'html'} />
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6 relative bg-background">
      {/* Top controls */}
      <div className="absolute top-3 right-3 z-30 flex gap-1.5">
        <DevicePreview mode={deviceMode} onModeChange={setDeviceMode} />
        <button onClick={() => setEditMode(!editMode)} className={`p-2.5 rounded-2xl text-xs font-semibold transition-all active:scale-95 border ${editMode ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border card-shadow'}`} title="Reposition elements">
          <Move size={13} />
        </button>
        <button onClick={() => setShowPerf(!showPerf)} className={`p-2.5 rounded-2xl text-xs font-semibold transition-all active:scale-95 border ${showPerf ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border card-shadow'}`}>
          <Activity size={13} />
        </button>
        <button onClick={() => setSlowMode(!slowMode)} className={`px-3.5 py-2 rounded-2xl text-[11px] font-bold transition-all active:scale-95 border ${slowMode ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border card-shadow'}`}>
          {slowMode ? '🐢 ON' : '🐢'}
        </button>
      </div>

      {/* Screen indicator */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
        {state && state.screenStack.length > 1 && (
          <button onClick={() => interpreterRef.current?.handleGoBack()} className="p-2 rounded-2xl bg-card card-shadow border border-border/50 text-muted-foreground active:scale-95 transition-all">
            <ChevronLeft size={14} />
          </button>
        )}
        <span className="text-[11px] font-bold text-muted-foreground bg-card/90 px-3 py-1.5 rounded-full border border-border/50 card-shadow backdrop-blur-sm">
          📱 {currentScreen}
        </span>
        {editMode && <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">✏️ Edit Mode</span>}
      </div>

      {/* Performance panel */}
      {showPerf && state && (
        <div className="absolute top-14 right-3 z-30 bg-card border border-border/50 rounded-2xl p-4 card-shadow animate-slide-up w-52">
          <p className="text-xs font-bold text-foreground mb-3">⚡ Performance</p>
          <div className="space-y-2 text-[11px]">
            {[['Steps', state.stepCount], ['Time', `${state.executionTimeMs}ms`], ['Variables', Object.keys(state.variables).length], ['Screen', state.currentScreen]].map(([label, val]) => (
              <div key={String(label)} className="flex justify-between items-center">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono-code font-semibold text-foreground">{val}</span>
              </div>
            ))}
          </div>
          {state.executionLog.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-1 max-h-24 overflow-y-auto">
              {state.executionLog.slice(-8).map((log, i) => (
                <p key={i} className="text-[10px] text-muted-foreground truncate font-mono-code">{log}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alerts */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        <AnimatePresence>
          {alerts.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              className="bg-card border border-border/50 rounded-2xl px-5 py-3.5 elevated-shadow text-sm text-foreground font-medium">
              💬 {msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Device frame */}
      <div className="mx-auto pt-12 transition-all duration-300" style={{ maxWidth: getDeviceWidth(deviceMode) }}>
        {deviceMode !== 'desktop' ? (
          <div className="bg-card border border-border/40 rounded-[2rem] p-5 card-shadow min-h-[600px] overflow-hidden">
            <div className="flex justify-center mb-4"><div className="w-24 h-1.5 bg-border/60 rounded-full" /></div>
            <AnimatePresence mode="wait">
              <motion.div key={currentScreen} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-3">
                {sorted.map((block, i) => renderBlock(block, i))}
              </motion.div>
            </AnimatePresence>
            <div className="flex justify-center mt-6"><div className="w-32 h-1 bg-border/40 rounded-full" /></div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={currentScreen} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-3">
              {sorted.map((block, i) => renderBlock(block, i))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <VariableInspector variables={variables} isOpen={inspectorOpen} onToggle={() => setInspectorOpen(!inspectorOpen)} />
    </div>
  );
}

/** Renders user custom HTML/JS/CSS code safely in an iframe */
function CustomCodeRenderer({ code, language }: { code: string; language: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;
    let html = '';
    if (language === 'html' || language === 'htmlcss') {
      html = code;
    } else if (language === 'javascript' || language === 'typescript') {
      html = `<!DOCTYPE html><html><body><div id="root"></div><script>${code}<\/script></body></html>`;
    } else if (language === 'css') {
      html = `<!DOCTYPE html><html><head><style>${code}</style></head><body><div class="demo">Styled Content</div></body></html>`;
    } else {
      html = `<pre style="font-family:monospace;padding:12px;font-size:12px;white-space:pre-wrap">${code}</pre>`;
    }
    const blob = new Blob([html], { type: 'text/html' });
    iframeRef.current.src = URL.createObjectURL(blob);
  }, [code, language]);

  return (
    <iframe ref={iframeRef} sandbox="allow-scripts" className="w-full min-h-[120px] border-0 rounded-2xl bg-white" title="Custom Code" />
  );
}
