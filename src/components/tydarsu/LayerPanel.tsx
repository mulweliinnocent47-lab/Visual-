import { Eye, EyeOff, Lock, Unlock, Trash2, Copy, GripVertical } from 'lucide-react';
import { Block, BLOCK_DEFINITIONS, BLOCK_COLORS } from '@/types/blocks';

interface LayerPanelProps {
  blocks: Block[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleLock: (id: string) => void;
}

export default function LayerPanel({ blocks, selectedId, onSelect, onRemove, onDuplicate, onToggleLock }: LayerPanelProps) {
  const sorted = [...blocks].sort((a, b) => a.y - b.y);

  return (
    <div className="space-y-0.5">
      {sorted.map(block => {
        const def = BLOCK_DEFINITIONS[block.type];
        const isSelected = selectedId === block.id;
        return (
          <div
            key={block.id}
            onClick={() => onSelect(block.id)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all text-[10px] group ${
              isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-secondary/60 border border-transparent'
            }`}
          >
            <GripVertical size={10} className="text-muted-foreground/40" />
            <span className="text-xs">{def.icon}</span>
            <span className={`flex-1 font-medium truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
              {block.label}
            </span>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); onToggleLock(block.id); }} className="p-0.5 rounded hover:bg-secondary text-muted-foreground">
                {block.locked ? <Lock size={10} /> : <Unlock size={10} />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDuplicate(block.id); }} className="p-0.5 rounded hover:bg-secondary text-muted-foreground">
                <Copy size={10} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onRemove(block.id); }} className="p-0.5 rounded hover:bg-destructive/20 text-destructive">
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        );
      })}
      {blocks.length === 0 && (
        <p className="text-[10px] text-muted-foreground text-center py-4">No blocks yet</p>
      )}
    </div>
  );
}
