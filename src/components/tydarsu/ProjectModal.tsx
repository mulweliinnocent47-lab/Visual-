import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { ProjectData } from '@/types/blocks';

interface ProjectModalProps {
  isOpen: boolean;
  mode: 'load' | 'new';
  onClose: () => void;
  onLoad: (id: string) => void;
  onNew: (name: string) => void;
  getSavedProjects: () => ProjectData[];
  loadCloudProjects?: () => Promise<ProjectData[]>;
}

export default function ProjectModal({ isOpen, mode, onClose, onLoad, onNew, getSavedProjects }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [projects, setProjects] = useState<ProjectData[]>([]);

  useEffect(() => {
    if (isOpen && mode === 'load') {
      setProjects(getSavedProjects());
    }
  }, [isOpen, mode, getSavedProjects]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20" onClick={onClose} />
      <div className="relative bg-card rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-5 medium-shadow animate-slide-up max-h-[70vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">
            {mode === 'new' ? 'New Project' : 'Open Project'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {mode === 'new' ? (
          <div className="space-y-3">
            <input
              className="w-full py-2.5 px-3 rounded-xl border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Project name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
            <button
              onClick={() => { if (name.trim()) { onNew(name.trim()); onClose(); } }}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Create
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No saved projects</p>
            ) : (
              projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => { onLoad(p.id); onClose(); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-secondary transition-all text-left"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground">{p.blocks.length} blocks • {new Date(p.updatedAt).toLocaleDateString()}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
