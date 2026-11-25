import { X, Download, FileJson, FileCode, FolderArchive } from 'lucide-react';
import { ProjectData } from '@/types/blocks';
import { exportAsJSON, exportAsHTML } from '@/lib/exportProject';
import { exportAsTypescriptProject } from '@/lib/exportTypescript';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData;
}

export default function ExportModal({ isOpen, onClose, project }: ExportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20" onClick={onClose} />
      <div className="relative bg-card rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-5 medium-shadow animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">📦 Export Project</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => { exportAsJSON(project); onClose(); }}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-secondary/40 hover:bg-secondary/80 active:scale-[0.97] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileJson size={20} className="text-primary" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-foreground">Export as JSON</div>
              <div className="text-[10px] text-muted-foreground">Save project data for later</div>
            </div>
          </button>

          <button
            onClick={() => { exportAsHTML(project); onClose(); }}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-secondary/40 hover:bg-secondary/80 active:scale-[0.97] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-block-text/10 flex items-center justify-center">
              <FileCode size={20} className="text-block-text" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-foreground">Export as HTML</div>
              <div className="text-[10px] text-muted-foreground">Standalone app that works anywhere</div>
            </div>
          </button>

          <button
            onClick={() => { exportAsTypescriptProject(project); onClose(); }}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-secondary/40 hover:bg-secondary/80 active:scale-[0.97] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-block-screen/10 flex items-center justify-center">
              <FolderArchive size={20} className="text-block-screen" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-foreground">Export as React/TypeScript</div>
              <div className="text-[10px] text-muted-foreground">Download full project with screens as .tsx files</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
