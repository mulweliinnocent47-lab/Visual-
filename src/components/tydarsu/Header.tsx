import { Play, Save, FolderOpen, Plus, Square, Download, BookOpen, Upload, User, LogOut, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import ThemeSwitcher from './ThemeSwitcher';
import { LearningToggle } from './LearningMode';

interface HeaderProps {
  projectName: string;
  isPreview: boolean;
  theme: string;
  learningMode: boolean;
  onRun: () => void;
  onStop: () => void;
  onSave: () => void;
  onLoad: () => void;
  onNew: () => void;
  onExport: () => void;
  onImport: () => void;
  onTemplates: () => void;
  onSetTheme: (t: string) => void;
  onToggleLearning: () => void;
  onAiAssistant?: () => void;
}

export default function Header({
  projectName, isPreview, theme, learningMode,
  onRun, onStop, onSave, onLoad, onNew, onExport, onImport, onTemplates, onSetTheme, onToggleLearning, onAiAssistant,
}: HeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const iconBtn = "p-2.5 rounded-2xl hover:bg-secondary/80 active:scale-95 transition-all text-muted-foreground hover:text-foreground";

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-5 bg-card/90 glass-sidebar z-50 relative border-b border-border/40">
      {/* Left: Logo + Project */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-black text-primary tracking-tighter">tS</span>
          </div>
          <h1 className="text-lg font-extrabold tracking-tight text-foreground hidden sm:block">
            tydar<span className="text-primary">SU</span>
          </h1>
        </div>
        <div className="hidden sm:flex items-center">
          <span className="text-xs text-muted-foreground font-medium truncate max-w-[120px] bg-secondary/50 px-3 py-1 rounded-full border border-border/50">
            {projectName}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-0.5">
        {/* Run/Stop - prominent */}
        {!isPreview ? (
          <button onClick={onRun} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-2xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all elevated-shadow mr-1">
            <Play size={14} />
            <span className="hidden sm:inline">Run</span>
          </button>
        ) : (
          <button onClick={onStop} className="flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-2xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all elevated-shadow mr-1">
            <Square size={14} />
            <span className="hidden sm:inline">Stop</span>
          </button>
        )}

        {/* AI - highlighted */}
        <button onClick={onAiAssistant} className="p-2.5 rounded-2xl bg-primary/10 hover:bg-primary/20 active:scale-95 transition-all text-primary" title="AI Assistant">
          <Sparkles size={16} />
        </button>

        <div className="w-px h-6 bg-border/50 mx-1 hidden sm:block" />

        {/* Tool buttons */}
        <button onClick={onTemplates} className={iconBtn} title="Templates"><BookOpen size={16} /></button>
        <button onClick={onImport} className={`${iconBtn} hidden sm:block`} title="Import"><Upload size={16} /></button>
        <button onClick={onExport} className={`${iconBtn} hidden sm:block`} title="Export"><Download size={16} /></button>
        <button onClick={onSave} className={iconBtn} title="Save"><Save size={16} /></button>
        <button onClick={onLoad} className={`${iconBtn} hidden sm:block`} title="Open"><FolderOpen size={16} /></button>
        <button onClick={onNew} className={`${iconBtn} hidden sm:block`} title="New"><Plus size={16} /></button>

        <div className="w-px h-6 bg-border/50 mx-1 hidden sm:block" />

        <ThemeSwitcher theme={theme} onSetTheme={onSetTheme} />
        <LearningToggle isEnabled={learningMode} onToggle={onToggleLearning} />

        <div className="w-px h-6 bg-border/50 mx-1" />

        {/* Auth */}
        {user ? (
          <div className="flex items-center gap-1">
            <div className="hidden sm:flex w-7 h-7 rounded-full bg-primary/10 items-center justify-center">
              <span className="text-[10px] font-bold text-primary">{user.email?.[0]?.toUpperCase()}</span>
            </div>
            <button onClick={signOut} className={iconBtn} title="Sign Out"><LogOut size={16} /></button>
          </div>
        ) : (
          <button onClick={() => navigate('/auth')} className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-secondary hover:bg-secondary/80 active:scale-95 transition-all text-foreground text-xs font-medium" title="Sign In">
            <User size={14} />
            <span className="hidden sm:inline">Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
