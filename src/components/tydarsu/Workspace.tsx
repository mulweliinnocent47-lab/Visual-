import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Menu, ZoomIn, ZoomOut, RotateCcw, Undo2, Redo2, Layers, Copy, Trash2, Lock } from 'lucide-react';
import { Block } from '@/types/blocks';
import WorkspaceBlock from './WorkspaceBlock';
import LayerPanel from './LayerPanel';
import WireLayer from './WireLayer';
import { computeWires, getOutPort, type BlockSize, type Point } from '@/lib/wires';

interface WorkspaceProps {
  blocks: Block[];
  onUpdate: (id: string, updates: Partial<Block>) => void;
  onRemove: (id: string) => void;
  onConnect: (fromId: string, toId: string) => void;
  onDisconnect?: (fromId: string, toId: string) => void;
  onToggleSidebar: () => void;
  onCustomize?: (block: Block) => void;
  onSelectBlock?: (block: Block | null) => void;
  selectedBlockId?: string | null;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onDuplicate?: (id: string) => void;
}

export default function Workspace({
  blocks, onUpdate, onRemove, onConnect, onDisconnect, onToggleSidebar, onCustomize,
  onSelectBlock, selectedBlockId, onUndo, onRedo, canUndo, canRedo, onDuplicate,
}: WorkspaceProps) {
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showLayers, setShowLayers] = useState(false);
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());
  const canvasRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const lastTouchDist = useRef<number | null>(null);

  // Wires: measured block sizes, the selected wire, and a wire being dragged out of a port.
  const [sizes, setSizes] = useState<Record<string, BlockSize>>({});
  const [selectedWireKey, setSelectedWireKey] = useState<string | null>(null);
  const [dragWire, setDragWire] = useState<{ fromId: string; to: Point; overTarget: string | null } | null>(null);
  const dragState = useRef<{ fromId: string; startX: number; startY: number; moved: boolean } | null>(null);

  const startConnect = useCallback((id: string) => setConnectingFrom(id), []);

  const finishConnect = useCallback((toId: string) => {
    if (connectingFrom && connectingFrom !== toId) onConnect(connectingFrom, toId);
    setConnectingFrom(null);
  }, [connectingFrom, onConnect]);

  const wires = useMemo(() => computeWires(blocks, sizes), [blocks, sizes]);

  const handleMeasure = useCallback((id: string, size: BlockSize) => {
    setSizes(prev => {
      const old = prev[id];
      return old && old.w === size.w && old.h === size.h && old.portY === size.portY ? prev : { ...prev, [id]: size };
    });
  }, []);

  const handleDisconnect = useCallback((fromId: string, toId: string) => {
    onDisconnect?.(fromId, toId);
    setSelectedWireKey(null);
  }, [onDisconnect]);

  // A selected wire that no longer exists (block removed, link changed) is deselected.
  useEffect(() => {
    if (selectedWireKey && !wires.some(w => w.key === selectedWireKey)) setSelectedWireKey(null);
  }, [wires, selectedWireKey]);

  // Screen position -> canvas position, undoing the zoom.
  const toCanvasPoint = useCallback((clientX: number, clientY: number): Point => {
    const rect = innerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom };
  }, [zoom]);

  const beginWire = useCallback((fromId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    dragState.current = { fromId, startX: e.clientX, startY: e.clientY, moved: false };
    setSelectedWireKey(null);
    setDragWire({ fromId, to: toCanvasPoint(e.clientX, e.clientY), overTarget: null });
  }, [toCanvasPoint]);

  const isDraggingWire = dragWire !== null;
  useEffect(() => {
    if (!isDraggingWire) return;
    const blockAt = (x: number, y: number) =>
      document.elementFromPoint(x, y)?.closest('[data-block-id]')?.getAttribute('data-block-id') ?? null;

    const move = (e: PointerEvent) => {
      const st = dragState.current;
      if (!st) return;
      if (!st.moved && Math.hypot(e.clientX - st.startX, e.clientY - st.startY) > 6) st.moved = true;
      const over = blockAt(e.clientX, e.clientY);
      setDragWire({ fromId: st.fromId, to: toCanvasPoint(e.clientX, e.clientY), overTarget: over && over !== st.fromId ? over : null });
    };
    const finish = (e: PointerEvent) => {
      const st = dragState.current;
      dragState.current = null;
      setDragWire(null);
      if (!st || e.type === 'pointercancel') return;
      if (!st.moved) { setConnectingFrom(st.fromId); return; } // a tap keeps the tap-to-link flow
      const over = blockAt(e.clientX, e.clientY);
      if (over && over !== st.fromId) onConnect(st.fromId, over);
    };
    const cancel = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { dragState.current = null; setDragWire(null); }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    window.addEventListener('keydown', cancel);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      window.removeEventListener('keydown', cancel);
    };
  }, [isDraggingWire, toCanvasPoint, onConnect]);

  const zoomIn = () => setZoom(z => Math.min(z + 0.15, 2.5));
  const zoomOut = () => setZoom(z => Math.max(z - 0.15, 0.3));
  const resetZoom = () => setZoom(1);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); onUndo?.(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); onRedo?.(); }
      if (e.key === 'Escape') { setConnectingFrom(null); setSelectedWireKey(null); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
        const wire = selectedWireKey ? wires.find(w => w.key === selectedWireKey) : undefined;
        if (wire && !typing) {
          e.preventDefault();
          handleDisconnect(wire.fromId, wire.toId);
          return;
        }
        if (selectedBlockId && !typing) {
          e.preventDefault();
          onRemove(selectedBlockId);
          onSelectBlock?.(null);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && selectedBlockId) {
        e.preventDefault();
        onDuplicate?.(selectedBlockId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onUndo, onRedo, selectedBlockId, onRemove, onSelectBlock, onDuplicate, selectedWireKey, wires, handleDisconnect]);

  // Pinch-to-zoom
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastTouchDist.current !== null) {
          const delta = (dist - lastTouchDist.current) * 0.005;
          setZoom(z => Math.min(Math.max(z + delta, 0.3), 2.5));
        }
        lastTouchDist.current = dist;
      }
    };
    const handleTouchEnd = () => { lastTouchDist.current = null; };
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(z => Math.min(Math.max(z - e.deltaY * 0.002, 0.3), 2.5));
      }
    };
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('workspace-canvas-inner')) {
      onSelectBlock?.(null);
      setSelectedWireKey(null);
    }
  };

  const toolbarBtn = "p-2.5 rounded-2xl bg-card card-shadow border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/50 active:scale-95 transition-all disabled:opacity-25";

  return (
    <div ref={canvasRef} className="flex-1 relative overflow-auto workspace-grid" onClick={handleCanvasClick}>
      {/* Mobile sidebar toggle */}
      <button onClick={onToggleSidebar} className="md:hidden absolute top-3 left-3 z-20 p-3 rounded-2xl bg-card card-shadow border border-border/40 text-muted-foreground active:scale-95 transition-all">
        <Menu size={18} />
      </button>

      {/* Top toolbar */}
      <div className="absolute top-3 right-3 z-20 flex gap-1.5">
        <button onClick={onUndo} disabled={!canUndo} className={toolbarBtn} title="Undo (Ctrl+Z)">
          <Undo2 size={15} />
        </button>
        <button onClick={onRedo} disabled={!canRedo} className={toolbarBtn} title="Redo (Ctrl+Y)">
          <Redo2 size={15} />
        </button>

        <div className="w-px h-8 bg-border/30 mx-0.5 self-center" />

        <button onClick={() => setShowLayers(!showLayers)} className={`p-2.5 rounded-2xl border transition-all active:scale-95 ${showLayers ? 'bg-primary text-primary-foreground border-primary' : 'bg-card card-shadow border-border/40 text-muted-foreground hover:text-foreground'}`} title="Layers">
          <Layers size={15} />
        </button>

        <div className="w-px h-8 bg-border/30 mx-0.5 self-center" />

        <button onClick={zoomOut} className={toolbarBtn}>
          <ZoomOut size={15} />
        </button>
        <span className="flex items-center px-3 text-[11px] font-mono-code font-semibold text-muted-foreground bg-card card-shadow border border-border/40 rounded-2xl">
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={zoomIn} className={toolbarBtn}>
          <ZoomIn size={15} />
        </button>
        <button onClick={resetZoom} className={toolbarBtn}>
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Layer panel */}
      {showLayers && (
        <div className="absolute top-16 right-3 z-30 w-60 bg-card border border-border/40 rounded-2xl card-shadow animate-slide-up max-h-80 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border/30">
            <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">📑 Layers</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <LayerPanel
              blocks={blocks}
              selectedId={selectedBlockId || null}
              onSelect={(id) => {
                const b = blocks.find(bl => bl.id === id);
                if (b) onSelectBlock?.(b);
              }}
              onRemove={onRemove}
              onDuplicate={(id) => onDuplicate?.(id)}
              onToggleLock={(id) => {
                const b = blocks.find(bl => bl.id === id);
                if (b) onUpdate(id, { locked: !b.locked });
              }}
            />
          </div>
        </div>
      )}

      {/* Drag-to-connect hint */}
      {dragWire && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-bold elevated-shadow pointer-events-none">
          {dragWire.overTarget ? 'Release to connect' : 'Drag onto a block to connect'}
        </div>
      )}

      {/* Connecting mode banner */}
      {connectingFrom && !dragWire && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-bold animate-slide-up elevated-shadow">
          Tap another block to connect
          <button onClick={() => setConnectingFrom(null)} className="ml-3 opacity-70 hover:opacity-100 transition-opacity">✕</button>
        </div>
      )}

      {/* Empty state */}
      {blocks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center animate-intro-fade-up">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/5 flex items-center justify-center animate-float">
              <span className="text-4xl">🧱</span>
            </div>
            <p className="text-sm text-foreground font-semibold">Add blocks from the sidebar</p>
            <p className="text-xs text-muted-foreground mt-1.5">to start building your app</p>
          </div>
        </div>
      )}

      {/* Zoomable canvas */}
      <div
        ref={innerRef}
        className="workspace-canvas-inner relative min-h-full min-w-full origin-top-left transition-transform duration-300 ease-out animate-zoom-in"
        style={{ transform: `scale(${zoom})` }}
      >
        {/* Connection wires */}
        <WireLayer
          wires={wires}
          selectedBlockId={selectedBlockId ?? null}
          selectedWireKey={selectedWireKey}
          onSelectWire={setSelectedWireKey}
          onDisconnect={handleDisconnect}
          dragWire={(() => {
            const source = dragWire ? blocks.find(b => b.id === dragWire.fromId) : undefined;
            return dragWire && source
              ? { from: getOutPort(source, sizes[source.id]), to: dragWire.to, overTarget: dragWire.overTarget !== null }
              : null;
          })()}
        />

        {/* Blocks */}
        {blocks.map(block => (
          <WorkspaceBlock
            key={block.id}
            block={block}
            allBlocks={blocks}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onStartConnect={startConnect}
            isConnecting={connectingFrom !== null && connectingFrom !== block.id}
            onFinishConnect={finishConnect}
            onMeasure={handleMeasure}
            onWireStart={beginWire}
            isDropTarget={dragWire?.overTarget === block.id}
            onCustomize={onCustomize}
            isSelected={selectedBlockId === block.id}
            onSelect={() => {
              onSelectBlock?.(block);
            }}
          />
        ))}
      </div>
    </div>
  );
}
