import { X } from 'lucide-react';
import { Block } from '@/types/blocks';

interface BlockCustomizerProps {
  isOpen: boolean;
  block: Block | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Block>) => void;
}

const PRESET_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Rose', value: 'hsl(350, 70%, 55%)' },
  { name: 'Amber', value: 'hsl(35, 90%, 55%)' },
  { name: 'Emerald', value: 'hsl(155, 60%, 45%)' },
  { name: 'Sky', value: 'hsl(200, 80%, 50%)' },
  { name: 'Violet', value: 'hsl(270, 65%, 55%)' },
  { name: 'Slate', value: 'hsl(220, 15%, 45%)' },
];

const SIZE_PRESETS = [
  { key: 'compact', label: 'Compact', icon: '▪' },
  { key: 'normal', label: 'Normal', icon: '▫' },
];

export default function BlockCustomizer({ isOpen, block, onClose, onUpdate }: BlockCustomizerProps) {
  if (!isOpen || !block) return null;

  const currentColor = block.props._customColor || '';
  const currentSize = block.props._sizePreset || 'normal';
  const currentIcon = block.props._customIcon || '';

  const setProp = (key: string, val: any) => {
    onUpdate(block.id, { props: { ...block.props, [key]: val } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20" onClick={onClose} />
      <div className="relative bg-card rounded-t-3xl sm:rounded-2xl w-full sm:max-w-xs p-5 medium-shadow animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">🎨 Customize Block</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Label */}
        <div className="mb-4">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Label</label>
          <input
            className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-secondary/30 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            value={block.label}
            onChange={e => onUpdate(block.id, { label: e.target.value })}
          />
        </div>

        {/* Custom Icon */}
        <div className="mb-4">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Custom Icon (emoji)</label>
          <input
            className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-secondary/30 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            value={currentIcon}
            onChange={e => setProp('_customIcon', e.target.value)}
            placeholder="e.g. 🚀"
            maxLength={4}
          />
        </div>

        {/* Color */}
        <div className="mb-4">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Color</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map(c => (
              <button
                key={c.name}
                onClick={() => setProp('_customColor', c.value)}
                className={`w-8 h-8 rounded-xl border-2 transition-all active:scale-90 ${
                  currentColor === c.value ? 'border-primary scale-110' : 'border-border'
                }`}
                style={{ backgroundColor: c.value || 'hsl(var(--secondary))' }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Size */}
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Size</label>
          <div className="flex gap-2">
            {SIZE_PRESETS.map(s => (
              <button
                key={s.key}
                onClick={() => setProp('_sizePreset', s.key)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                  currentSize === s.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                }`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
