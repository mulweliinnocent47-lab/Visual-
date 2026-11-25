import { useState } from 'react';
import { X } from 'lucide-react';
import { TEMPLATES, TEMPLATE_CATEGORIES, Template } from '@/lib/templates';
import { ProjectData } from '@/types/blocks';

interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (data: ProjectData) => void;
}

export default function TemplateGallery({ isOpen, onClose, onSelect }: TemplateGalleryProps) {
  const [activeTab, setActiveTab] = useState<string>('all');

  if (!isOpen) return null;

  const filtered = activeTab === 'all' ? TEMPLATES : TEMPLATES.filter(t => t.category === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20" onClick={onClose} />
      <div className="relative bg-card rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 medium-shadow animate-slide-up max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">📚 Templates</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Start with a pre-built project</p>

        {/* Category tabs */}
        <div className="flex gap-1 mb-4 bg-secondary/40 rounded-xl p-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all ${
              activeTab === 'all' ? 'bg-card text-foreground block-shadow' : 'text-muted-foreground'
            }`}
          >
            All
          </button>
          {TEMPLATE_CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveTab(cat.key)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all ${
                activeTab === cat.key ? 'bg-card text-foreground block-shadow' : 'text-muted-foreground'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {filtered.map((tpl, i) => (
            <button
              key={tpl.name}
              onClick={() => { onSelect(tpl.data); onClose(); }}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-secondary/40 hover:bg-secondary/80 active:scale-[0.97] transition-all text-center animate-slide-up"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
            >
              <span className="text-3xl">{tpl.icon}</span>
              <span className="text-xs font-semibold text-foreground">{tpl.name}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{tpl.description}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No templates in this category yet</p>
        )}
      </div>
    </div>
  );
}
