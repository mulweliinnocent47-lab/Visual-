import { describe, it, expect, vi } from 'vitest';
import { CHALLENGES, checkChallenge, prepareBlocks, runHeadless } from '@/lib/challenges';
import { isBasicBlock } from '@/lib/blockModes';
import { appEventBus, EVENTS } from '@/lib/eventBus';
import type { Block } from '@/types/blocks';

// The interpreter imports the Supabase client; checks never use it, so a stub keeps tests offline.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { channel: () => { throw new Error('no network in tests'); }, removeChannel: () => {}, auth: {} },
}));

const B = (id: string, type: string, props: Record<string, unknown> = {}, connections: string[] = []): Block =>
  ({ id, type, label: type, props, x: 0, y: 0, connections }) as Block;
const run = (id: string, blocks: Block[]) => checkChallenge(CHALLENGES.find((c) => c.id === id)!, blocks);

describe('challenge list', () => {
  it('has unique ids and only suggests Basic blocks', () => {
    expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(CHALLENGES.length);
    for (const c of CHALLENGES) for (const t of c.uses) expect(isBasicBlock(t), `${c.id} uses ${t}`).toBe(true);
  });
});

describe('hello', () => {
  it('passes when On Start shows an alert', async () => {
    expect((await run('hello', [B('o', 'onStart', {}, ['a']), B('a', 'alert', { message: 'Hi' })])).passed).toBe(true);
  });
  it('explains what is missing', async () => {
    expect((await run('hello', [])).message).toMatch(/On Start/);
    expect((await run('hello', [B('o', 'onStart'), B('a', 'alert')])).message).toMatch(/Link On Start/);
  });
});

describe('button', () => {
  it('needs the message to come from the tap', async () => {
    expect((await run('button', [B('b', 'button', {}, ['a']), B('a', 'alert')])).passed).toBe(true);
    expect((await run('button', [B('b', 'button'), B('o', 'onStart', {}, ['a']), B('a', 'alert')])).passed).toBe(false);
  });
});

describe('variable', () => {
  it('passes with 7 and explains other values', async () => {
    expect((await run('variable', [B('v', 'variable', { name: 's', value: '7', varType: 'number' })])).passed).toBe(true);
    expect((await run('variable', [B('v', 'variable', { name: 's', value: '3', varType: 'number' })])).message).toMatch(/holds “3”/);
  });
});

describe('math', () => {
  it('only counts an answer the app worked out', async () => {
    const solved = [B('o', 'onStart', {}, ['m']), B('m', 'math', { op: '+', a: '12', b: '8' }, ['d']), B('d', 'display', { value: '0' })];
    expect((await run('math', solved)).passed).toBe(true);
    expect((await run('math', [B('m', 'math', { op: '+', a: '12', b: '8' }), B('d', 'display', { value: '20' })])).passed).toBe(false);
    solved[1].props.b = '9';
    expect((await run('math', solved)).passed).toBe(false);
  });
});

describe('repeat', () => {
  const build = (times: string) => [B('o', 'onStart', {}, ['r']), B('r', 'repeat', { times }, ['a']), B('a', 'alert')];
  it('needs exactly three messages', async () => {
    expect((await run('repeat', build('3'))).passed).toBe(true);
    expect((await run('repeat', build('5'))).message).toMatch(/5 messages/);
  });
});

describe('decision', () => {
  const build = (m1: string, m2: string, op = '>') => [
    B('v', 'variable', { name: 'score', value: '60', varType: 'number' }),
    B('o', 'onStart', {}, ['i']),
    B('i', 'ifElse', { left: 'score', op, right: '50' }, ['a1', 'a2']),
    B('a1', 'alert', { message: m1 }),
    B('a2', 'alert', { message: m2 }),
  ];
  it('passes when different numbers give different messages', async () => {
    expect((await run('decision', build('Big', 'Small'))).passed).toBe(true);
    expect((await run('decision', build('Match', 'Nope', '=='))).passed).toBe(true);
  });
  it('fails when both outcomes say the same thing or one is unlinked', async () => {
    expect((await run('decision', build('Hi', 'Hi'))).message).toMatch(/same message/);
    const half = build('Big', 'Small');
    half[2].connections = ['a1'];
    expect((await run('decision', half)).message).toMatch(/both outcomes/);
  });
});

describe('list', () => {
  const build = (n: number) => [
    B('l', 'listCreate', { name: 'items' }),
    B('o', 'onStart', {}, ['a1']),
    ...Array.from({ length: n }, (_, i) => B(`a${i + 1}`, 'listAdd', { listName: 'items', item: `x${i}` }, i < n - 1 ? [`a${i + 2}`] : [])),
  ];
  it('needs three items', async () => {
    expect((await run('list', build(3))).passed).toBe(true);
    expect((await run('list', build(2))).message).toMatch(/2 items\. Add 1 more/);
  });
});

describe('counter', () => {
  const build = (guard: boolean) => [
    B('v', 'variable', { name: 'count', value: '0', varType: 'number' }),
    B('b', 'button', {}, [guard ? 'c' : 'm']),
    B('c', 'condition', { left: 'count', op: '<', right: '10' }, ['m']),
    B('m', 'math', { op: '+', a: 'count', b: '1' }, ['v']),
  ];
  it('passes only when the counter stops at 10', async () => {
    expect((await run('counter', build(true))).passed).toBe(true);
    expect((await run('counter', build(false))).message).toMatch(/went up to 15/);
  });
  it('explains a counter that never changes', async () => {
    const r = await run('counter', [B('v', 'variable', { name: 'count', value: '0', varType: 'number' }), B('m', 'math', { op: '+', a: 'count', b: '1' })]);
    expect(r.message).toMatch(/never changes/);
  });
});

describe('runner safety', () => {
  it('removes network, database, auth and code blocks before running', () => {
    const prepared = prepareBlocks([B('o', 'onStart', {}, ['api', 'a']), B('api', 'apiRequest'), B('a', 'alert'), B('c', 'customCode')]);
    expect(prepared.map((b) => b.id)).toEqual(['o', 'a']);
    expect(prepared[0].connections).toEqual(['a']);
  });

  it('stops loops that never end and explains it', async () => {
    const loop = [B('o', 'onStart', {}, ['a']), B('a', 'wait', { seconds: 1 }, ['b']), B('b', 'wait', { seconds: 1 }, ['a'])];
    expect((await runHeadless(loop)).error).toMatch(/limit/i);
    expect((await run('hello', [...loop, B('m', 'alert')])).message).toMatch(/loop back/);
  });

  it('does not wait for real time', async () => {
    const start = Date.now();
    const r = await run('hello', [B('o', 'onStart', {}, ['w']), B('w', 'wait', { seconds: 30 }, ['a']), B('a', 'alert')]);
    expect(r.passed).toBe(true);
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it('leaves the shared event bus alone, so it can run beside a live preview', async () => {
    let fired = 0;
    const off = appEventBus.on(EVENTS.APP_START, () => { fired++; });
    await runHeadless([B('o', 'onStart', {}, ['a']), B('a', 'alert')]);
    expect(fired).toBe(0);
    appEventBus.emit(EVENTS.APP_START); // the listener must still be registered
    expect(fired).toBe(1);
    off();
  });

  it('does not change the blocks it was given', async () => {
    const blocks = [B('v', 'variable', { name: 'x', value: '1', varType: 'number' })];
    await runHeadless(blocks, { overrides: { v: { value: '99' } } });
    expect(blocks[0].props.value).toBe('1');
  });
});
