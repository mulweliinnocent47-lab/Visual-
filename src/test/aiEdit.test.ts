import { describe, it, expect } from 'vitest';
import { applyAiEdit, buildAiContext, describeAiEdit, type AiEdit } from '@/lib/aiEdit';
import type { Block } from '@/types/blocks';

const mk = (id: string, type: string, over: Partial<Block> = {}): Block =>
  ({ id, type, label: id, props: {}, x: 0, y: 0, connections: [], ...over }) as Block;

const base = (): Block[] => [
  mk('b1', 'button', { label: 'Add', props: { text: 'Add' }, connections: ['b2'] }),
  mk('b2', 'display', { label: 'Count', props: { value: '0' }, x: 300 }),
  mk('b3', 'customCode', { label: 'Code', props: { code: 'old()' }, x: 600 }),
  mk('b4', 'ifElse', { label: 'Check', connections: ['b2', 'b1'], x: 900 }),
];

const edit = (over: Partial<AiEdit> = {}): AiEdit => ({ summary: 'test', add: [], update: [], remove: [], ...over });
const newBlock = (id: string, type = 'alert', over: Record<string, unknown> = {}) =>
  ({ id, type, label: 'New', props: { message: 'Hi' }, x: 1200, y: 0, connections: [], ...over }) as AiEdit['add'][number];

describe('buildAiContext', () => {
  it('sends only what the AI needs', () => {
    const ctx = buildAiContext({ name: 'Demo', blocks: [mk('b1', 'button', { style: { color: 'red' } } as Partial<Block>)] });
    expect(Object.keys(ctx.blocks[0]).sort()).toEqual(['connections', 'id', 'label', 'props', 'type', 'x', 'y']);
  });
});

describe('applyAiEdit', () => {
  it('merges props and keeps the rest of the block', () => {
    const out = applyAiEdit(base(), edit({ update: [{ id: 'b1', label: 'Add one', props: { text: 'Add one' } }] }));
    expect(out[0].label).toBe('Add one');
    expect(out[0].props).toEqual({ text: 'Add one' });
    expect(out[0].connections).toEqual(['b2']);
  });

  it('adds new blocks with links, and updates can link to them', () => {
    const out = applyAiEdit(base(), edit({
      add: [newBlock('ai_1', 'alert')],
      update: [{ id: 'b1', connections: ['b2', 'ai_1'] }],
    }));
    expect(out.map((b) => b.id)).toContain('ai_1');
    expect(out[0].connections).toEqual(['b2', 'ai_1']);
  });

  it('removes blocks and the links that pointed at them', () => {
    const out = applyAiEdit(base(), edit({ remove: ['b2'] }));
    expect(out.find((b) => b.id === 'b2')).toBeUndefined();
    expect(out.find((b) => b.id === 'b1')?.connections).toEqual([]);
  });

  it('keeps If / Else branch positions when a branch target is removed', () => {
    const out = applyAiEdit(base(), edit({ remove: ['b2'] }));
    expect(out.find((b) => b.id === 'b4')?.connections).toEqual(['', 'b1']);
  });

  it('never changes or removes Custom Code', () => {
    const out = applyAiEdit(base(), edit({ update: [{ id: 'b3', props: { code: 'evil()' } }], remove: ['b3'] }));
    expect(out.find((b) => b.id === 'b3')?.props).toEqual({ code: 'old()' });
  });

  it('ignores adds that reuse an id, use an unknown type or add Custom Code', () => {
    const out = applyAiEdit(base(), edit({ add: [newBlock('b1'), newBlock('x1', 'nope'), newBlock('x2', 'customCode'), newBlock('ok')] }));
    expect(out.map((b) => b.id)).toEqual(['b1', 'b2', 'b3', 'b4', 'ok']);
  });

  it('moves a new block off one that is already there', () => {
    const out = applyAiEdit(base(), edit({ add: [newBlock('ai_1', 'alert', { x: 0, y: 0 })] }));
    const added = out.find((b) => b.id === 'ai_1')!;
    expect(added.y).toBeGreaterThanOrEqual(72);
  });

  it('does not change the blocks it was given', () => {
    const blocks = base();
    const snapshot = JSON.stringify(blocks);
    applyAiEdit(blocks, edit({ update: [{ id: 'b1', props: { text: 'x' } }], remove: ['b2'], add: [newBlock('n')] }));
    expect(JSON.stringify(blocks)).toBe(snapshot);
  });
});

describe('describeAiEdit', () => {
  it('shows what a property changes from and to', () => {
    const items = describeAiEdit(base(), edit({ update: [{ id: 'b1', props: { text: 'Add one' } }] }));
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('change');
    expect(items[0].lines).toEqual(['text: “Add” → “Add one”']);
  });

  it('skips updates that change nothing', () => {
    expect(describeAiEdit(base(), edit({ update: [{ id: 'b1', props: { text: 'Add' } }] }))).toEqual([]);
  });

  it('lists additions with their links', () => {
    const items = describeAiEdit(base(), edit({ add: [newBlock('ai_1', 'alert', { connections: ['b2'] })] }));
    expect(items[0].kind).toBe('add');
    expect(items[0].lines.join(' ')).toContain('Links to Count');
  });

  it('warns when removing a block that others link to', () => {
    const items = describeAiEdit(base(), edit({ remove: ['b2'] }));
    expect(items[0].kind).toBe('remove');
    expect(items[0].lines[0]).toMatch(/blocks? links? here|blocks? link here/);
  });

  it('describes link changes in words', () => {
    const items = describeAiEdit(base(), edit({ add: [newBlock('ai_1')], update: [{ id: 'b1', connections: ['ai_1'] }] }));
    const change = items.find((i) => i.kind === 'change')!;
    expect(change.lines).toEqual(['Now links to New', 'No longer links to Count']);
  });
});
