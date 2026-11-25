import { useState, useRef } from 'react';
import { X, Upload, ClipboardPaste, Copy, Check, AlertTriangle } from 'lucide-react';
import { ProjectData } from '@/types/blocks';
import { toast } from 'sonner';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: ProjectData) => void;
  onDuplicate: () => void;
  currentProject: ProjectData;
}

export default function ImportModal({ isOpen, onClose, onImport, onDuplicate, currentProject }: ImportModalProps) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'paste' | 'file'>('paste');
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const tryImport = (text: string) => {
    if (text.length > 5_000_000) {
      setError('File too large (max 5MB)');
      return;
    }
    try {
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        setError('Invalid project format');
        return;
      }
      if (typeof data.name !== 'string' || !data.name.trim() || !Array.isArray(data.blocks)) {
        setError('Invalid project format: must have name and blocks');
        return;
      }
      onImport(data as ProjectData);
      toast.success(`Imported "${data.name}" successfully!`);
      setJsonText('');
      setError('');
      onClose();
    } catch {
      setError('Invalid JSON format');
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => tryImport(reader.result as string);
    reader.readAsText(file);
  };

  const handleDuplicate = () => {
    onDuplicate();
    toast.success('Project duplicated!');
    onClose();
  };

  const handleCopyShareJSON = () => {
    const json = JSON.stringify(currentProject, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      toast.success('Project JSON copied to clipboard!');
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20" onClick={onClose} />
      <div className="relative bg-card rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 medium-shadow animate-slide-up max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">📥 Import & Share</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Share current project */}
        <div className="mb-4 space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Share Current Project</p>
          <div className="flex gap-2">
            <button
              onClick={handleCopyShareJSON}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 active:scale-[0.97] transition-all"
            >
              <Copy size={14} />
              Copy as JSON
            </button>
            <button
              onClick={handleDuplicate}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 active:scale-[0.97] transition-all"
            >
              <Copy size={14} />
              Duplicate
            </button>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Import Project</p>

          {/* Tabs */}
          <div className="flex gap-1 mb-3 bg-secondary/50 rounded-xl p-1">
            <button
              onClick={() => setTab('paste')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${tab === 'paste' ? 'bg-card text-foreground block-shadow' : 'text-muted-foreground'}`}
            >
              <ClipboardPaste size={12} className="inline mr-1" /> Paste JSON
            </button>
            <button
              onClick={() => setTab('file')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${tab === 'file' ? 'bg-card text-foreground block-shadow' : 'text-muted-foreground'}`}
            >
              <Upload size={12} className="inline mr-1" /> Upload File
            </button>
          </div>

          {tab === 'paste' ? (
            <div className="space-y-2">
              <textarea
                className="w-full h-28 text-xs px-3 py-2.5 rounded-xl border border-border bg-secondary/30 outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono transition-all"
                placeholder="Paste project JSON here..."
                value={jsonText}
                onChange={e => { setJsonText(e.target.value); setError(''); }}
              />
              {error && (
                <div className="flex items-center gap-1.5 text-destructive text-[10px] animate-slide-up">
                  <AlertTriangle size={12} /> {error}
                </div>
              )}
              <button
                onClick={() => tryImport(jsonText)}
                disabled={!jsonText.trim()}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-medium hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
              >
                Import Project
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input ref={fileRef} type="file" accept=".json" onChange={handleFile} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-8 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all flex flex-col items-center gap-2"
              >
                <Upload size={24} />
                <span className="text-xs font-medium">Choose .json file</span>
              </button>
              {error && (
                <div className="flex items-center gap-1.5 text-destructive text-[10px] animate-slide-up">
                  <AlertTriangle size={12} /> {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
