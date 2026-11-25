import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, Loader2, Wand2, LogIn, PencilLine, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ProjectData, Block } from '@/types/blocks';
import { applyAiEdit, buildAiContext, describeAiEdit, MAX_AI_CONTEXT_BLOCKS, type AiEdit, type PreviewItem } from '@/lib/aiEdit';
import { toast } from 'sonner';

type Mode = 'build' | 'edit' | 'explain';

interface AiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadProject: (data: ProjectData) => void;
  onMergeBlocks: (blocks: Block[]) => void;
  /** The project being edited. Edit and Explain read from it. */
  project: ProjectData;
  /** Replaces the project's blocks. The caller records an undo step first. */
  onApplyBlocks: (blocks: Block[]) => void;
}

const MAX_PROMPT_CHARS = 1000;

const MODES: Array<{ key: Mode; label: string; icon: typeof Wand2; subtitle: string; cta: string; busy: string; placeholder: string }> = [
  {
    key: 'build', label: 'Build', icon: Wand2,
    subtitle: 'Describe an app and AI will create it',
    cta: 'Generate App', busy: 'Generating...',
    placeholder: 'Describe the app you want to build...',
  },
  {
    key: 'edit', label: 'Edit', icon: PencilLine,
    subtitle: 'Ask AI to change your current project',
    cta: 'Suggest changes', busy: 'Thinking...',
    placeholder: 'What should change? For example: add a reset button that sets the count back to 0',
  },
  {
    key: 'explain', label: 'Explain', icon: BookOpen,
    subtitle: 'Get your project explained in plain words',
    cta: 'Explain my project', busy: 'Reading...',
    placeholder: 'Ask a question about your project (optional)',
  },
];

const EXAMPLES: Record<Mode, string[]> = {
  build: [
    'A todo list app with add, delete, and mark complete',
    'A login screen with email, password, and social login',
    'A weather app that fetches data from an API',
    'A chat app with message input and message list',
    'A calculator with basic operations',
    'An e-commerce product page with image, price, and add to cart',
  ],
  edit: [
    'Add a reset button that sets the count back to 0',
    'Show a message when the number reaches 10',
    'Make the button text friendlier',
    'Remove blocks that nothing uses',
  ],
  explain: [
    'Why does my button do nothing?',
    'What happens when the app starts?',
    'Which blocks are not connected to anything?',
  ],
};

/** The server explains problems (sign-in needed, hourly limit) in the response body. */
async function readFunctionError(err: unknown): Promise<string> {
  const response = (err as { context?: Response } | null)?.context;
  if (response && typeof response.json === 'function') {
    try {
      const body = await response.json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // fall through to the generic message
    }
  }
  return err instanceof Error ? err.message : 'Failed to reach the AI';
}

async function callAi(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('ai-block-generator', { body });
  if (error) throw new Error(await readFunctionError(error));
  if (data?.error) throw new Error(data.error);
  return data;
}

const MARKER: Record<PreviewItem['kind'], { symbol: string; className: string; label: string }> = {
  add: { symbol: '+', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400', label: 'Add' },
  change: { symbol: '~', className: 'bg-primary/10 text-primary', label: 'Change' },
  remove: { symbol: '−', className: 'bg-destructive/10 text-destructive', label: 'Remove' },
};

export default function AiAssistant({ isOpen, onClose, onLoadProject, onMergeBlocks, project, onApplyBlocks }: AiAssistantProps) {
  const [mode, setMode] = useState<Mode>('build');
  const [prompts, setPrompts] = useState<Record<Mode, string>>({ build: '', edit: '', explain: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [buildResult, setBuildResult] = useState<any>(null);
  const [edit, setEdit] = useState<AiEdit | null>(null);
  const [explanation, setExplanation] = useState('');
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const preview = useMemo(() => (edit ? describeAiEdit(project.blocks, edit) : []), [edit, project.blocks]);

  if (!isOpen) return null;

  const config = MODES.find((m) => m.key === mode)!;
  const prompt = prompts[mode];
  const hasBlocks = project.blocks.length > 0;
  const tooBig = project.blocks.length > MAX_AI_CONTEXT_BLOCKS;
  const needsProject = mode !== 'build';
  const blocked = needsProject && (!hasBlocks || tooBig);
  const canSubmit = !loading && !!user && !blocked && (mode === 'explain' || prompt.trim().length > 0);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setError('');
  };

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      if (mode === 'build') {
        setBuildResult(null);
        const data = await callAi({ mode: 'generate', prompt: prompt.trim() });
        if (!Array.isArray(data?.blocks)) throw new Error('No valid blocks returned');
        setBuildResult(data);
      } else if (mode === 'edit') {
        setEdit(null);
        const data = await callAi({ mode: 'edit', prompt: prompt.trim(), project: buildAiContext(project) });
        if (!Array.isArray(data?.add) || !Array.isArray(data?.update) || !Array.isArray(data?.remove)) {
          throw new Error('The AI reply could not be read. Try again.');
        }
        setEdit(data as AiEdit);
      } else {
        setExplanation('');
        const data = await callAi({
          mode: 'explain',
          ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
          project: buildAiContext(project),
        });
        if (typeof data?.explanation !== 'string') throw new Error('The AI reply could not be read. Try again.');
        setExplanation(data.explanation);
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
      toast.error('AI request failed');
    } finally {
      setLoading(false);
    }
  };

  const loadAsNewProject = () => {
    if (!buildResult) return;
    const next: ProjectData = {
      id: `ai_${Date.now()}`,
      name: buildResult.name || 'AI Generated App',
      blocks: buildResult.blocks,
      screens: buildResult.screens,
      activeScreen: buildResult.activeScreen,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onLoadProject(next);
    toast.success('AI project loaded!');
    onClose();
  };

  const mergeIntoCurrentProject = () => {
    if (!buildResult?.blocks) return;
    // Offset positions so they don't overlap existing blocks.
    // One shared stamp keeps every id and connection in sync.
    const stamp = Date.now();
    const offsetBlocks = buildResult.blocks.map((b: Block) => ({
      ...b,
      id: `ai_${b.id}_${stamp}`,
      x: b.x + 40,
      y: b.y + 40,
      connections: b.connections.map((c: string) => (c ? `ai_${c}_${stamp}` : c)),
    }));
    onMergeBlocks(offsetBlocks);
    toast.success('AI blocks added to workspace!');
    onClose();
  };

  const applyEdit = () => {
    if (!edit || preview.length === 0) return;
    onApplyBlocks(applyAiEdit(project.blocks, edit));
    toast.success(`Applied ${preview.length} ${preview.length === 1 ? 'change' : 'changes'}. You can undo this.`);
    setEdit(null);
    setPrompts((p) => ({ ...p, edit: '' }));
    onClose();
  };

  const counts = {
    add: preview.filter((i) => i.kind === 'add').length,
    change: preview.filter((i) => i.kind === 'change').length,
    remove: preview.filter((i) => i.kind === 'remove').length,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg p-5 block-shadow animate-slide-up max-h-[90vh] overflow-auto border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles size={16} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">AI Assistant</h3>
              <p className="text-[10px] text-muted-foreground">{config.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {!authLoading && !user && (
          <div className="p-4 rounded-xl bg-secondary/40 border border-border space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sign in to use the AI Assistant. Your account keeps the AI fair for everyone.
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <LogIn size={14} /> Sign in
            </button>
          </div>
        )}

        {(authLoading || user) && (
          <div className="space-y-3">
            {/* Mode */}
            <div className="flex items-center gap-0.5 bg-secondary/60 rounded-xl p-0.5" role="group" aria-label="AI mode">
              {MODES.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => switchMode(key)}
                  aria-pressed={mode === key}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-300 ${
                    mode === key ? 'bg-card block-shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            {needsProject && (
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {!hasBlocks
                  ? 'Your workspace is empty. Add some blocks first, or use Build to start a new app.'
                  : tooBig
                    ? `This project has more than ${MAX_AI_CONTEXT_BLOCKS} blocks, which is too large for the AI to read.`
                    : mode === 'edit'
                      ? 'The AI reads your blocks and suggests changes. Nothing changes until you apply them.'
                      : 'The AI reads your blocks to explain them. Nothing is changed.'}
              </p>
            )}

            <textarea
              value={prompt}
              maxLength={MAX_PROMPT_CHARS}
              onChange={(e) => setPrompts((p) => ({ ...p, [mode]: e.target.value }))}
              placeholder={config.placeholder}
              className={`w-full ${mode === 'explain' ? 'min-h-[64px]' : 'min-h-[100px]'} p-3 rounded-xl border border-border bg-secondary/30 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-all`}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
            />
            <p className="text-[10px] text-muted-foreground text-right">{prompt.length}/{MAX_PROMPT_CHARS}</p>

            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES[mode].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setPrompts((p) => ({ ...p, [mode]: ex }))}
                  className="px-2.5 py-1 rounded-lg bg-secondary/50 text-[10px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-all truncate max-w-[200px]"
                >
                  {ex}
                </button>
              ))}
            </div>

            <button
              onClick={submit}
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> {config.busy}</> : <><config.icon size={16} /> {config.cta}</>}
            </button>
          </div>
        )}

        {error && (
          <div role="alert" className="mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Build result */}
        {mode === 'build' && buildResult && (
          <div className="mt-4 space-y-3 animate-slide-up">
            <div className="p-3 rounded-xl bg-secondary/40 border border-border">
              <p className="text-xs font-semibold text-foreground mb-1">✨ {buildResult.name || 'Generated App'}</p>
              <p className="text-[10px] text-muted-foreground">{buildResult.blocks?.length || 0} blocks • {buildResult.screens?.length || 0} screens</p>
              {buildResult.dropped > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {buildResult.dropped} unsupported {buildResult.dropped === 1 ? 'block was' : 'blocks were'} left out.
                </p>
              )}
            </div>

            <div className="max-h-32 overflow-y-auto p-2 rounded-xl bg-secondary/20 border border-border space-y-1">
              {buildResult.blocks?.slice(0, 12).map((b: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="px-1.5 py-0.5 rounded bg-secondary font-mono">{b.type}</span>
                  <span className="truncate">{b.label || b.props?.text || b.props?.name || b.props?.screenName || ''}</span>
                </div>
              ))}
              {(buildResult.blocks?.length || 0) > 12 && (
                <p className="text-[9px] text-muted-foreground/60">+{buildResult.blocks.length - 12} more blocks</p>
              )}
            </div>

            <details className="rounded-xl border border-border">
              <summary className="px-3 py-2 text-[10px] font-semibold text-muted-foreground cursor-pointer hover:text-foreground">
                View Raw JSON
              </summary>
              <pre className="px-3 pb-3 text-[9px] text-muted-foreground max-h-40 overflow-auto font-mono whitespace-pre-wrap">
                {JSON.stringify(buildResult, null, 2)}
              </pre>
            </details>

            <div className="flex gap-2">
              <button
                onClick={loadAsNewProject}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Load as New Project
              </button>
              <button
                onClick={mergeIntoCurrentProject}
                className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 active:scale-[0.98] transition-all border border-border"
              >
                Add to Current
              </button>
            </div>
          </div>
        )}

        {/* Edit preview */}
        {mode === 'edit' && edit && (
          <div className="mt-4 space-y-3 animate-slide-up">
            <div className="p-3 rounded-xl bg-secondary/40 border border-border">
              <p className="text-xs font-semibold text-foreground mb-1">Review before applying</p>
              <p className="text-[11px] text-foreground/80 leading-relaxed">{edit.summary}</p>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {[
                  counts.add > 0 && `${counts.add} to add`,
                  counts.change > 0 && `${counts.change} to change`,
                  counts.remove > 0 && `${counts.remove} to remove`,
                ].filter(Boolean).join(' · ') || 'No changes'}
              </p>
            </div>

            {preview.length > 0 ? (
              <ul className="max-h-64 overflow-y-auto space-y-1.5" aria-label="Suggested changes">
                {preview.map((item) => {
                  const marker = MARKER[item.kind];
                  return (
                    <li key={`${item.kind}-${item.id}`} className="flex gap-2.5 p-2.5 rounded-xl border border-border bg-secondary/20">
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${marker.className}`}
                        title={marker.label}
                        aria-label={marker.label}
                      >
                        {marker.symbol}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                        {item.lines.map((line, i) => (
                          <p key={i} className="text-[10px] text-muted-foreground break-words">{line}</p>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Nothing would change. Try describing the change differently.</p>
            )}

            {(edit.dropped ?? 0) > 0 && (
              <p className="text-[10px] text-muted-foreground">
                {edit.dropped} {edit.dropped === 1 ? 'suggestion was' : 'suggestions were'} left out because {edit.dropped === 1 ? 'it' : 'they'} did not match your project.
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={applyEdit}
                disabled={preview.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Apply changes
              </button>
              <button
                onClick={() => setEdit(null)}
                className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 active:scale-[0.98] transition-all border border-border"
              >
                Discard
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">After applying, tap Undo in the workspace to go back.</p>
          </div>
        )}

        {/* Explanation */}
        {mode === 'explain' && explanation && (
          <div className="mt-4 p-3.5 rounded-xl bg-secondary/40 border border-border animate-slide-up">
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
