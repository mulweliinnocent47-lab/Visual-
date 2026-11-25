import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Lightbulb, GraduationCap, ListChecks, Check, Loader2, RotateCcw } from 'lucide-react';
import { CHALLENGES } from '@/lib/challenges';
import { BLOCK_DEFINITIONS, type Block } from '@/types/blocks';
import { useChallengeCheck, useChallengeProgress } from '@/hooks/useChallenges';

interface LearningModeProps {
  isEnabled: boolean;
  onToggle: () => void;
  /** The blocks in the workspace. Challenges are checked against these. */
  blocks: Block[];
}

const BLOCK_TOOLTIPS: Record<string, string> = {
  button: 'Triggers actions when clicked. Connect it to other blocks to build interactions.',
  text: 'Displays static text in your app. Great for labels and titles.',
  input: 'Lets users type text. The value can be used by other blocks.',
  display: 'Shows a dynamic value that updates as your app runs.',
  math: 'Performs math operations (+, -, ×, ÷) on numbers or variables.',
  variable: 'Stores a value (number, text, or boolean) that persists across actions.',
  condition: 'Checks if a condition is true, then runs connected blocks.',
  ifElse: 'Like If, but also runs different blocks when the condition is false.',
  alert: 'Shows a popup message to the user.',
  timer: 'Waits for a set time before running connected blocks.',
  repeat: 'Runs connected blocks multiple times in a loop.',
  forLoop: 'Loops from a start number to an end number with a step.',
  whileLoop: 'Keeps looping while a condition is true.',
  functionDef: 'Creates a reusable group of logic you can call anywhere.',
  functionCall: 'Runs a function you defined with Function block.',
  listCreate: 'Creates an empty list/array to store multiple items.',
  listAdd: 'Adds a new item to an existing list.',
  onStart: 'Runs connected blocks automatically when the app starts.',
  wait: 'Pauses execution for a number of seconds.',
  breakLoop: 'Stops and exits the current loop immediately.',
  continueLoop: 'Skips to the next iteration of the current loop.',
  stopExec: 'Completely stops all running logic.',
  listRemove: 'Removes an item from a list by index.',
  listGet: 'Gets an item from a list by index.',
};

export function useBlockTooltip(blockType: string): string | undefined {
  return BLOCK_TOOLTIPS[blockType];
}

const CARD = 'fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-slide-up';

export default function LearningMode({ isEnabled, onToggle, blocks }: LearningModeProps) {
  const { completed, currentId, select, markComplete, reset } = useChallengeProgress();
  const [view, setView] = useState<'challenge' | 'list'>('challenge');
  const [showHint, setShowHint] = useState(false);

  const index = Math.max(0, CHALLENGES.findIndex(c => c.id === currentId));
  const challenge = CHALLENGES[index];
  const isLast = index === CHALLENGES.length - 1;
  const isDone = completed.includes(challenge.id);
  const allDone = completed.length === CHALLENGES.length;

  const { status, result, checkNow } = useChallengeCheck(challenge, blocks, isEnabled && view === 'challenge');
  const passed = status === 'done' && result?.passed === true;

  // Opening Learning Mode picks up at the first challenge that is not done yet.
  useEffect(() => {
    if (!isEnabled) return;
    setView('challenge');
    const firstOpen = CHALLENGES.find(c => !completed.includes(c.id));
    if (firstOpen) select(firstOpen.id);
  }, [isEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setShowHint(false); }, [challenge.id]);

  // The check is automatic: the first time it passes, the challenge is recorded as done.
  useEffect(() => {
    if (passed) markComplete(challenge.id);
  }, [passed, challenge.id, markComplete]);

  if (!isEnabled) return null;

  const go = (i: number) => select(CHALLENGES[Math.min(Math.max(i, 0), CHALLENGES.length - 1)].id);

  // ---- All challenges ----
  if (view === 'list') {
    return (
      <div className={CARD}>
        <div className="bg-card rounded-2xl border border-border block-shadow overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">Challenges</h4>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground mr-1">{completed.length} / {CHALLENGES.length} done</span>
                <button onClick={onToggle} aria-label="Close challenges" className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>
            <ul className="space-y-1 max-h-64 overflow-y-auto">
              {CHALLENGES.map((c, i) => {
                const done = completed.includes(c.id);
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => { select(c.id); setView('challenge'); }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-secondary active:scale-[0.98] transition-all"
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${done ? 'bg-emerald-500 text-white' : 'bg-secondary text-muted-foreground'}`}>
                        {done ? <Check size={11} /> : i + 1}
                      </span>
                      <span className="text-xs font-medium text-foreground">{c.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              onClick={() => { if (window.confirm('Reset your challenge progress?')) reset(); }}
              className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw size={10} /> Reset progress
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- One challenge ----
  return (
    <div className={CARD}>
      <div className="bg-card rounded-2xl border border-border block-shadow overflow-hidden">
        <div className="h-1 bg-secondary" role="progressbar" aria-valuemin={0} aria-valuemax={CHALLENGES.length} aria-valuenow={completed.length} aria-label="Challenges completed">
          <div className="h-full bg-primary transition-all duration-500 ease-out rounded-full" style={{ width: `${(completed.length / CHALLENGES.length) * 100}%` }} />
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Challenge {index + 1} of {CHALLENGES.length}
            </span>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setView('list')} aria-label="All challenges" title="All challenges" className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
                <ListChecks size={14} />
              </button>
              <button onClick={onToggle} aria-label="Close challenges" className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-1">
            <h4 className="text-sm font-semibold text-foreground">{challenge.title}</h4>
            {isDone && <Check size={13} className="text-emerald-500" aria-label="Completed" />}
          </div>
          <p className="text-xs text-muted-foreground mb-2.5">{challenge.goal}</p>

          <div className="flex flex-wrap items-center gap-1 mb-3">
            <span className="text-[10px] text-muted-foreground mr-0.5">Use:</span>
            {challenge.uses.map(type => (
              <span key={type} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-foreground">
                {BLOCK_DEFINITIONS[type].icon} {BLOCK_DEFINITIONS[type].label}
              </span>
            ))}
          </div>

          <div
            aria-live="polite"
            className={`flex items-start gap-2 px-3 py-2.5 rounded-xl mb-2.5 text-[11px] leading-relaxed ${
              passed ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-secondary text-foreground'
            }`}
          >
            {status === 'checking' || !result ? (
              <><Loader2 size={12} className="mt-0.5 flex-shrink-0 animate-spin text-muted-foreground" /><span className="text-muted-foreground">Checking your blocks…</span></>
            ) : passed ? (
              <><Check size={12} className="mt-0.5 flex-shrink-0" /><span className="font-medium">{result.message}</span></>
            ) : (
              <span>{result.message}</span>
            )}
          </div>

          {showHint ? (
            <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-xl bg-primary/5 mb-3">
              <Lightbulb size={12} className="text-primary mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-primary font-medium">{challenge.hint}</p>
            </div>
          ) : (
            !passed && (
              <button onClick={() => setShowHint(true)} className="flex items-center gap-1 text-[10px] font-medium text-primary hover:opacity-80 mb-3 transition-opacity">
                <Lightbulb size={11} /> Show a hint
              </button>
            )
          )}

          {passed && isLast && allDone && (
            <p className="text-[11px] font-semibold text-foreground mb-3">All {CHALLENGES.length} challenges done. Nicely built! 🎉</p>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => go(index - 1)}
              disabled={index === 0}
              className="flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium text-muted-foreground hover:bg-secondary disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={10} /> Back
            </button>
            <div className="flex gap-1.5">
              <button onClick={checkNow} className="px-3 py-1.5 rounded-lg text-[10px] font-medium text-foreground bg-secondary hover:bg-secondary/80 active:scale-95 transition-all">
                Check now
              </button>
              {isLast ? (
                passed && (
                  <button onClick={() => setView('list')} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all">
                    See all
                  </button>
                )
              ) : (
                <button
                  onClick={() => go(index + 1)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold active:scale-95 transition-all ${
                    passed ? 'bg-primary text-primary-foreground hover:opacity-90' : 'text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {passed ? 'Next' : 'Skip'} <ChevronRight size={10} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LearningToggle({ isEnabled, onToggle }: { isEnabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`p-2 rounded-xl active:scale-95 transition-all ${
        isEnabled ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'
      }`}
      title={isEnabled ? 'Learning mode ON' : 'Learning mode'}
      aria-label="Learning mode challenges"
    >
      <GraduationCap size={16} />
    </button>
  );
}
