import { useState, useRef, useEffect } from 'react';
import { X, Link, Settings, AlertTriangle, Palette } from 'lucide-react';
import { Block, BLOCK_DEFINITIONS, BLOCK_COLORS } from '@/types/blocks';
import BlockSettings from './BlockSettings';
import { DEFAULT_BLOCK_SIZE, type BlockSize } from '@/lib/wires';

interface WorkspaceBlockProps {
  block: Block;
  allBlocks: Block[];
  onUpdate: (id: string, updates: Partial<Block>) => void;
  onRemove: (id: string) => void;
  onStartConnect: (id: string) => void;
  isConnecting: boolean;
  onFinishConnect: (id: string) => void;
  isActive?: boolean;
  onCustomize?: (block: Block) => void;
  isSelected?: boolean;
  onSelect?: () => void;
  /** Reports the block's measured size so wires can meet its edges exactly. */
  onMeasure?: (id: string, size: BlockSize) => void;
  /** Called when a drag starts from the output port. */
  onWireStart?: (id: string, e: React.PointerEvent) => void;
  /** True while a dragged wire is hovering over this block. */
  isDropTarget?: boolean;
}

export default function WorkspaceBlock({
  block, allBlocks, onUpdate, onRemove, onStartConnect, isConnecting, onFinishConnect, isActive, onCustomize,
  isSelected, onSelect, onMeasure, onWireStart, isDropTarget,
}: WorkspaceBlockProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [justConnected, setJustConnected] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; blockX: number; blockY: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [portY, setPortY] = useState(DEFAULT_BLOCK_SIZE.portY);
  const def = BLOCK_DEFINITIONS[block.type];
  const color = BLOCK_COLORS[block.type];
  const isContainer = def.isContainer;
  const isCompact = block.props._sizePreset === 'compact';
  const customColor = block.props._customColor;
  const customIcon = block.props._customIcon;

  // Measure the block so connection wires start and end exactly on its edges.
  useEffect(() => {
    const root = rootRef.current;
    const header = headerRef.current;
    if (!root || !header) return;
    const measure = () => {
      const size: BlockSize = { w: root.offsetWidth, h: root.offsetHeight, portY: Math.round(header.offsetHeight / 2) + 1 };
      setPortY(size.portY);
      onMeasure?.(block.id, size);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    observer.observe(header);
    return () => observer.disconnect();
  }, [block.id, onMeasure]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.block-action')) return;
    if (block.locked) return;
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, blockX: block.x, blockY: block.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    onUpdate(block.id, {
      x: Math.max(0, dragRef.current.blockX + dx),
      y: Math.max(0, dragRef.current.blockY + dy),
    });
  };

  const handlePointerUp = () => {
    if (isDragging) {
      const snap = 12;
      onUpdate(block.id, {
        x: Math.round(block.x / snap) * snap,
        y: Math.round(block.y / snap) * snap,
      });
    }
    setIsDragging(false);
    dragRef.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isConnecting) {
      onFinishConnect(block.id);
      setJustConnected(true);
      setTimeout(() => setJustConnected(false), 600);
    } else {
      onSelect?.();
    }
  };

  const connectedNames = block.connections.filter(Boolean).map(cId => {
    const b = allBlocks.find(bl => bl.id === cId);
    return b ? `${BLOCK_DEFINITIONS[b.type].icon} ${b.label}` : cId.slice(-4);
  });

  const actionBtn = "p-1.5 rounded-lg hover:bg-primary-foreground/20 text-primary-foreground/80 hover:text-primary-foreground transition-all active:scale-90";

  return (
    <div
      ref={rootRef}
      data-block-id={block.id}
      className={`absolute select-none
        ${isDragging ? 'z-50 scale-[1.04]' : 'z-10 hover:z-20 transition-all duration-150'}
        ${justConnected ? 'animate-snap-bounce animate-connect-glow' : ''}
        ${isActive ? 'animate-pulse-soft' : ''}
        ${block.locked ? 'opacity-80' : ''}
      `}
      style={{
        left: block.x,
        top: block.y,
        touchAction: 'none',
        boxShadow: isDragging ? 'var(--shadow-block-drag)' : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
    >
      <div
        className={`
          rounded-2xl bg-card border overflow-hidden
          transition-all duration-200 animate-pop-in
          ${isDragging ? 'block-shadow-drag' : 'card-shadow hover:block-shadow-hover'}
          ${isConnecting || isDropTarget ? 'ring-2 ring-primary ring-offset-2 cursor-pointer glow-primary' : ''}
          ${isSelected ? 'ring-2 ring-primary elevated-shadow' : ''}
          ${isActive ? 'ring-2 ring-primary/40' : ''}
          ${block.error ? 'border-destructive' : 'border-border/40'}
          ${isContainer ? 'border-dashed border-2' : ''}
          ${isCompact ? 'min-w-[140px]' : 'min-w-[176px]'}
        `}
      >
        {/* Header */}
        <div
          ref={headerRef}
          className={`${customColor ? '' : color} ${isCompact ? 'px-2.5 py-2' : 'px-3.5 py-2.5'} flex items-center justify-between`}
          style={customColor ? { backgroundColor: customColor } : undefined}
        >
          <div className="flex items-center gap-2">
            <span className={isCompact ? 'text-xs' : 'text-sm'}>{customIcon || def.icon}</span>
            <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} font-bold text-primary-foreground tracking-tight`}>{block.label}</span>
            {isContainer && <span className="text-[9px] bg-primary-foreground/20 px-2 py-0.5 rounded-full text-primary-foreground font-medium">container</span>}
            {block.locked && <span className="text-[9px]">🔒</span>}
          </div>
          <div className="flex gap-0.5 block-action">
            {block.error && (
              <span className="p-1 text-destructive-foreground" title={block.error}>
                <AlertTriangle size={11} />
              </span>
            )}
            <button onClick={(e) => { e.stopPropagation(); onStartConnect(block.id); }} className={actionBtn} title="Connect">
              <Link size={11} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }} className={actionBtn} title="Settings">
              <Settings size={11} />
            </button>
            {onCustomize && (
              <button onClick={(e) => { e.stopPropagation(); onCustomize(block); }} className={actionBtn} title="Customize">
                <Palette size={11} />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onRemove(block.id); }} className={actionBtn} title="Delete">
              <X size={11} />
            </button>
          </div>
        </div>

        {/* Error */}
        {block.error && (
          <div className="px-3 py-2 bg-destructive/10 border-t border-destructive/20 animate-slide-up">
            <p className="text-[10px] text-destructive font-semibold">⚠ {block.error}</p>
          </div>
        )}

        {/* Settings panel */}
        {showSettings && (
          <div className="p-3 space-y-2 block-action animate-slide-up" onClick={e => e.stopPropagation()}>
            <BlockSettings block={block} onUpdate={onUpdate} />
          </div>
        )}

        {/* Connections */}
        {connectedNames.length > 0 && (
          <div className="px-3 py-2 flex flex-wrap gap-1 border-t border-border/30">
            {connectedNames.map((name, i) => (
              <span key={i} className="text-[10px] bg-primary/8 text-primary px-2 py-0.5 rounded-full font-semibold">
                → {name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Input port: where wires arrive */}
      {block.type !== 'onStart' && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute w-3 h-3 rounded-full border-2 border-primary transition-colors ${isDropTarget || isConnecting ? 'bg-primary' : 'bg-card'}`}
          style={{ left: -6, top: portY - 6 }}
        />
      )}

      {/* Output port: drag from here to another block to connect */}
      {onWireStart && (
        <button
          type="button"
          className="block-action absolute w-6 h-6 flex items-center justify-center rounded-full cursor-crosshair group"
          style={{ right: -12, top: portY - 12, touchAction: 'none' }}
          title="Drag to connect to another block"
          aria-label={`Connect from ${block.label}`}
          onPointerDown={(e) => onWireStart(block.id, e)}
          onClick={(e) => {
            e.stopPropagation();
            // Keyboard activation has no pointer; fall back to tap-to-link.
            if (e.detail === 0) onStartConnect(block.id);
          }}
        >
          <span className="w-3 h-3 rounded-full bg-primary border-2 border-card shadow-sm group-hover:scale-125 group-active:scale-125 transition-transform" />
        </button>
      )}
    </div>
  );
}
