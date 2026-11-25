import { Interpreter, type ExecutionState, type VarValue } from '@/lib/interpreter';
import { isBasicBlock } from '@/lib/blockModes';
import type { Block, BlockType } from '@/types/blocks';

// ---------------------------------------------------------------------------
// Headless runner: runs the learner's blocks with the real interpreter.
// ---------------------------------------------------------------------------

export interface ChallengeRun {
  /** Values before anything ran. Lets a check tell "typed in" apart from "worked out". */
  initial: { variables: Record<string, VarValue>; displayValues: Record<string, string> };
  /** Values after the app started and any simulated taps. */
  variables: Record<string, VarValue>;
  displayValues: Record<string, string>;
  alerts: string[];
  /** How many alerts had appeared once the app finished starting (before any taps). */
  alertsAtStart: number;
  /** Highest number each variable reached at any point. */
  peak: Record<string, number>;
  error?: string;
}

export interface RunOptions {
  /** Tap every Button block this many times after the app starts. */
  clicksPerButton?: number;
  /** Replace props on blocks by id before running, to test how the app reacts to other values. */
  overrides?: Record<string, Record<string, unknown>>;
}

const RUN_TIMEOUT_MS = 2000;

const toNumber = (v: VarValue | undefined): number | undefined => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return undefined;
};

const copyVariables = (vars: Record<string, VarValue>): Record<string, VarValue> => {
  const out: Record<string, VarValue> = {};
  for (const [k, v] of Object.entries(vars)) out[k] = Array.isArray(v) ? [...v] : v;
  return out;
};

/**
 * Only Basic blocks run during a check. Network, database, auth and custom code blocks
 * are removed, so checking someone's work can never reach outside the browser.
 */
export function prepareBlocks(blocks: readonly Block[], overrides: RunOptions['overrides'] = {}): Block[] {
  const kept = blocks.filter((b) => isBasicBlock(b.type));
  const ids = new Set(kept.map((b) => b.id));
  return kept.map((b) => ({
    ...b,
    props: { ...b.props, ...(overrides[b.id] ?? {}) },
    connections: b.type === 'ifElse'
      ? b.connections.map((c) => (ids.has(c) ? c : ''))
      : b.connections.filter((c) => ids.has(c)),
  }));
}

export async function runHeadless(blocks: readonly Block[], options: RunOptions = {}): Promise<ChallengeRun> {
  const safe = prepareBlocks(blocks, options.overrides);
  const alerts: string[] = [];
  const peak: Record<string, number> = {};

  const track = (state: ExecutionState) => {
    for (const [name, value] of Object.entries(state.variables)) {
      const n = toNumber(value);
      if (n !== undefined) peak[name] = Math.max(peak[name] ?? -Infinity, n);
    }
  };

  const interpreter = new Interpreter(
    safe,
    { onStateChange: track, onBlockActivate: () => {}, onAlert: (msg) => alerts.push(msg) },
    false,
    { instant: true, isolated: true },
  );

  const before = interpreter.getState();
  const initial = { variables: copyVariables(before.variables), displayValues: { ...before.displayValues } };

  let alertsAtStart = 0;
  let error: string | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const work = (async () => {
    await interpreter.start();
    alertsAtStart = alerts.length;
    const clicks = options.clicksPerButton ?? 0;
    if (clicks > 0) {
      for (const button of safe.filter((b) => b.type === 'button')) {
        for (let i = 0; i < clicks; i++) await interpreter.handleButtonClick(button.id);
      }
    }
  })();
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Your app took too long to finish.')), RUN_TIMEOUT_MS);
  });

  try {
    await Promise.race([work, timeout]);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Your app stopped with an error.';
  } finally {
    if (timer) clearTimeout(timer);
    interpreter.stop();
  }

  const after = interpreter.getState();
  return {
    initial,
    variables: copyVariables(after.variables),
    displayValues: { ...after.displayValues },
    alerts,
    alertsAtStart,
    peak,
    ...(error ? { error } : {}),
  };
}

// ---------------------------------------------------------------------------
// Challenges
// ---------------------------------------------------------------------------

export type CheckResult = { passed: boolean; message: string };

export interface CheckContext {
  blocks: Block[];
  run: ChallengeRun;
  /** Run again with different options, e.g. other values for a variable. */
  runWith: (options: RunOptions) => Promise<ChallengeRun>;
}

export interface Challenge {
  id: string;
  title: string;
  /** What to build, in plain words. */
  goal: string;
  hint: string;
  /** Blocks worth reaching for. */
  uses: BlockType[];
  /** Simulated taps on every Button block before checking. */
  clicksPerButton?: number;
  check: (ctx: CheckContext) => CheckResult | Promise<CheckResult>;
}

const ofType = (blocks: readonly Block[], type: BlockType) => blocks.filter((b) => b.type === type);
const pass = (message: string): CheckResult => ({ passed: true, message });
const fail = (message: string): CheckResult => ({ passed: false, message });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const isScalar = (v: VarValue | undefined): v is string | number | boolean => v !== undefined && !Array.isArray(v);

function stuckMessage(run: ChallengeRun): string | undefined {
  return run.error ? `${run.error} Check for blocks that loop back on each other.` : undefined;
}

export const CHALLENGES: Challenge[] = [
  {
    id: 'hello',
    title: 'Say hello',
    goal: 'Make your app show a message by itself as soon as it starts.',
    hint: 'Add an On Start block and an Alert block. Link On Start to the Alert: tap the link icon on On Start, then tap the Alert. You can also drag from the dot on its right edge.',
    uses: ['onStart', 'alert'],
    check: ({ blocks, run }) => {
      if (ofType(blocks, 'onStart').length === 0) return fail('Add an On Start block to begin.');
      if (ofType(blocks, 'alert').length === 0) return fail('Add an Alert block and type your message in it.');
      if (run.alertsAtStart === 0) return fail(stuckMessage(run) ?? 'Link On Start to your Alert so the message appears on its own.');
      return pass('Your app says hello all by itself.');
    },
  },
  {
    id: 'button',
    title: 'Tap to greet',
    goal: 'Show a message when someone taps a button.',
    hint: 'Link your Button to an Alert block. Nothing should happen until the button is tapped.',
    uses: ['button', 'alert'],
    clicksPerButton: 1,
    check: ({ blocks, run }) => {
      if (ofType(blocks, 'button').length === 0) return fail('Add a Button block.');
      if (ofType(blocks, 'alert').length === 0) return fail('Add an Alert block with a message.');
      if (run.alerts.length - run.alertsAtStart < 1) return fail(stuckMessage(run) ?? 'Link your Button to the Alert. Tapping the button should show the message.');
      return pass('Tapping your button shows the message.');
    },
  },
  {
    id: 'variable',
    title: 'Remember a number',
    goal: 'Store the number 7 in a variable.',
    hint: 'Add a Variable block, give it a name like score, set its type to number and its value to 7.',
    uses: ['variable'],
    check: ({ blocks, run }) => {
      const variables = ofType(blocks, 'variable');
      if (variables.length === 0) return fail('Add a Variable block.');
      const holds7 = variables.some((b) => {
        const v = run.variables[b.props.name];
        return isScalar(v) && toNumber(v) === 7;
      });
      if (holds7) return pass('Your variable holds 7.');
      const first = run.variables[variables[0].props.name];
      return fail(`Your variable holds ${isScalar(first) && String(first) !== '' ? `“${String(first)}”` : 'nothing yet'}. Set its value to 7.`);
    },
  },
  {
    id: 'math',
    title: 'Do the math',
    goal: 'Work out 12 + 8 and show the answer, 20, on a Display.',
    hint: 'Link On Start (or a Button) to a Math block set to 12 + 8, then link the Math block to a Display. Typing 20 straight into the Display does not count.',
    uses: ['onStart', 'math', 'display'],
    clicksPerButton: 1,
    check: ({ blocks, run }) => {
      if (ofType(blocks, 'math').length === 0) return fail('Add a Math block and set it to 12 + 8.');
      if (ofType(blocks, 'display').length === 0) return fail('Add a Display block to show the answer.');
      const worked = Object.entries(run.displayValues).some(
        ([id, value]) => value === '20' && run.initial.displayValues[id] !== '20',
      );
      if (worked) return pass('Your app calculated 20 and showed it.');
      return fail(stuckMessage(run) ?? 'No Display shows 20 yet. Link On Start to the Math block, and the Math block to the Display.');
    },
  },
  {
    id: 'repeat',
    title: 'Say it three times',
    goal: 'Show a message exactly 3 times using a Repeat block.',
    hint: 'Link On Start to a Repeat block, set it to 3 times, then link the Repeat block to an Alert.',
    uses: ['onStart', 'repeat', 'alert'],
    clicksPerButton: 1,
    check: ({ blocks, run }) => {
      if (ofType(blocks, 'repeat').length === 0) return fail('Add a Repeat block.');
      if (ofType(blocks, 'alert').length === 0) return fail('Add an Alert block to repeat.');
      if (run.alerts.length === 0) return fail(stuckMessage(run) ?? 'Nothing was shown. Link On Start to Repeat, then Repeat to the Alert.');
      if (run.alerts.length !== 3) return fail(`Your app showed ${plural(run.alerts.length, 'message')}. It should be exactly 3. Check the number on the Repeat block.`);
      return pass('Three messages, just right.');
    },
  },
  {
    id: 'decision',
    title: 'Make a decision',
    goal: 'Use an If / Else block so your app shows different messages depending on a number.',
    hint: 'Add a Variable (a number) and an If / Else block that compares it. Link the true branch first and the false branch second, each to its own Alert with a different message.',
    uses: ['variable', 'ifElse', 'alert'],
    clicksPerButton: 1,
    check: async ({ blocks, run, runWith }) => {
      const decisions = ofType(blocks, 'ifElse');
      if (decisions.length === 0) return fail('Add an If / Else block.');
      const variables = ofType(blocks, 'variable');
      if (variables.length === 0) return fail('Add a Variable block with a number for the If / Else to check.');
      const decision = decisions.find((d) => d.connections[0] && d.connections[1]);
      if (!decision) return fail('Link both outcomes of your If / Else: the true branch first, then the false branch.');

      // Try other values for the variable being compared and see whether the messages change.
      const { left, right } = decision.props as { left?: string; right?: string };
      const compared = variables.find((v) => v.props.name === left || v.props.name === right) ?? variables[0];
      const literal = Number(compared.props.name === left ? right : left);
      const candidates = new Set<number>([0, 100]);
      if (Number.isFinite(literal)) [literal - 1, literal, literal + 1].forEach((n) => candidates.add(n));
      const original = Number(compared.props.value);
      if (Number.isFinite(original)) candidates.add(original);

      const outcomes = new Set<string>();
      let silent = false;
      for (const value of candidates) {
        const result = await runWith({
          clicksPerButton: 1,
          overrides: { [compared.id]: { value: String(value), varType: 'number' } },
        });
        if (result.alerts.length === 0) silent = true;
        else outcomes.add(JSON.stringify(result.alerts));
      }
      if (outcomes.size >= 2) return pass('Your app reacts differently to different numbers.');
      if (outcomes.size === 0 || silent) return fail(stuckMessage(run) ?? 'Some numbers show no message. Link On Start (or a Button) to the If / Else, and an Alert to each outcome.');
      return fail('Every number shows the same message. Give each outcome its own Alert with a different message.');
    },
  },
  {
    id: 'list',
    title: 'Shopping list',
    goal: 'Build a list that ends up with 3 items in it.',
    hint: 'Add a List block, then three Add to List blocks. Link On Start to the first one and chain them: each Add to List links to the next. Set each one to the list name.',
    uses: ['onStart', 'listCreate', 'listAdd'],
    clicksPerButton: 1,
    check: ({ blocks, run }) => {
      const lists = ofType(blocks, 'listCreate');
      if (lists.length === 0) return fail('Add a List block to hold your items.');
      if (ofType(blocks, 'listAdd').length === 0) return fail('Add an Add to List block for each item.');
      const sizes = lists.map((l) => {
        const v = run.variables[l.props.name];
        return Array.isArray(v) ? v.length : 0;
      });
      const best = Math.max(...sizes);
      if (best >= 3) return pass(`Your list holds ${plural(best, 'item')}.`);
      return fail(stuckMessage(run) ?? `Your list has ${plural(best, 'item')}. Add ${3 - best} more, and make sure each Add to List uses your list’s name.`);
    },
  },
  {
    id: 'counter',
    title: 'Count to 10',
    goal: 'Make a counter that goes up by 1 and stops at 10. Tapping more should not push it past 10.',
    hint: 'Link a Button to an If block that checks count < 10. Link the If to a Math block that adds 1 to count, and link the Math block back to your count Variable. We tap every button 15 times to test it.',
    uses: ['variable', 'button', 'condition', 'math', 'display'],
    clicksPerButton: 15,
    check: ({ blocks, run }) => {
      if (ofType(blocks, 'variable').length === 0) return fail('Add a Variable for your counter and start it at 0.');
      if (ofType(blocks, 'math').length === 0) return fail('Add a Math block that adds 1 to your counter.');

      const counters = Object.entries(run.variables)
        .filter(([name, v]) => toNumber(v) !== undefined && !name.startsWith('_') && JSON.stringify(v) !== JSON.stringify(run.initial.variables[name]))
        .map(([name, v]) => ({ name, final: toNumber(v) as number, top: run.peak[name] ?? (toNumber(v) as number) }));
      if (counters.length === 0) {
        return fail(stuckMessage(run) ?? 'Your counter never changes. Link a Button (or On Start) to a Math block that adds 1, then link the Math block to your Variable.');
      }
      if (counters.some((c) => c.final === 10 && c.top <= 10)) return pass('It counts up and stops at 10.');
      const over = counters.find((c) => c.top > 10);
      if (over) return fail(`Your counter went up to ${over.top}. Add an If block so it only adds 1 while the count is below 10.`);
      const best = counters.reduce((a, b) => (b.final > a.final ? b : a));
      return fail(`Your counter ended at ${best.final} after 15 taps. It should stop at exactly 10.`);
    },
  },
];

export async function checkChallenge(challenge: Challenge, blocks: Block[]): Promise<CheckResult> {
  try {
    const runWith = (options: RunOptions) => runHeadless(blocks, options);
    const run = await runWith({ clicksPerButton: challenge.clicksPerButton });
    return await challenge.check({ blocks: prepareBlocks(blocks), run, runWith });
  } catch {
    return fail('Something went wrong while checking. Try running your app with Run to see what happens.');
  }
}
