import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CHALLENGES, checkChallenge, type Challenge, type CheckResult } from '@/lib/challenges';
import type { Block } from '@/types/blocks';

const PROGRESS_KEY = 'tydarsu_challenges';
const CHECK_DELAY_MS = 600;

interface Progress {
  completed: string[];
  current: string;
}

function readProgress(): Progress {
  const fresh: Progress = { completed: [], current: CHALLENGES[0].id };
  try {
    const raw = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return fresh;
    const known = new Set(CHALLENGES.map((c) => c.id));
    const completed = Array.isArray(raw.completed) ? raw.completed.filter((id: unknown) => typeof id === 'string' && known.has(id)) : [];
    const current = typeof raw.current === 'string' && known.has(raw.current) ? raw.current : fresh.current;
    return { completed, current };
  } catch {
    return fresh;
  }
}

/** Which challenges are done and which one is open. Remembered on the device. */
export function useChallengeProgress() {
  const [progress, setProgress] = useState<Progress>(readProgress);

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // Storage can be unavailable; progress still works for this session.
    }
  }, [progress]);

  const select = useCallback((id: string) => setProgress((p) => (p.current === id ? p : { ...p, current: id })), []);
  const markComplete = useCallback(
    (id: string) => setProgress((p) => (p.completed.includes(id) ? p : { ...p, completed: [...p.completed, id] })),
    [],
  );
  const reset = useCallback(() => setProgress({ completed: [], current: CHALLENGES[0].id }), []);

  return { completed: progress.completed, currentId: progress.current, select, markComplete, reset };
}

export interface CheckState {
  status: 'checking' | 'done';
  result?: CheckResult;
  /** Which challenge the result belongs to, so a result is never shown against another challenge. */
  forId?: string;
}

/**
 * Checks the learner's blocks against a challenge by running them with the real interpreter.
 * Runs on its own shortly after the blocks change, and on demand with checkNow.
 * Moving a block does not trigger a check.
 */
export function useChallengeCheck(challenge: Challenge | undefined, blocks: Block[], enabled: boolean) {
  const [raw, setState] = useState<CheckState>({ status: 'checking' });
  const latest = useRef({ challenge, blocks });
  latest.current = { challenge, blocks };
  const ticket = useRef(0);

  // Only what affects behaviour: positions are left out so dragging doesn't re-run the check.
  const signature = useMemo(
    () => JSON.stringify(blocks.map((b) => [b.id, b.type, b.props, b.connections])),
    [blocks],
  );

  const run = useCallback(async () => {
    const { challenge: c, blocks: b } = latest.current;
    if (!c) return;
    const mine = ++ticket.current;
    setState((s) => ({ ...s, status: 'checking' }));
    const result = await checkChallenge(c, b);
    if (mine === ticket.current) setState({ status: 'done', result, forId: c.id });
  }, []);

  useEffect(() => {
    if (!enabled || !challenge) return;
    setState((s) => ({ ...s, status: 'checking' }));
    const timer = setTimeout(run, CHECK_DELAY_MS);
    return () => {
      clearTimeout(timer);
      ticket.current++; // drop any check still running for older blocks
    };
  }, [enabled, challenge?.id, signature, run]); // eslint-disable-line react-hooks/exhaustive-deps

  // A result from the previous challenge counts as "still checking" for this one.
  const state: CheckState = raw.forId === challenge?.id ? raw : { status: 'checking' };
  return { ...state, checkNow: run };
}
