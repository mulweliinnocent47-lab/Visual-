import { describe, it, expect } from 'vitest';
import {
  ALLOWED_BLOCK_TYPES,
  DEFAULT_EXPLAIN_PROMPT,
  LIMITS,
  extractJson,
  parsePrompt,
  parseRequest,
  pickAllowedOrigin,
  sanitizeContext,
  sanitizeEdit,
  sanitizeExplanation,
  sanitizeProject,
} from '../../supabase/functions/ai-block-generator/validate';

const block = (over: Record<string, unknown> = {}) => ({
  id: 'blk_1', type: 'button', label: 'Go', props: { text: 'Go' }, x: 10, y: 20, connections: [], ...over,
});

describe('parsePrompt', () => {
  it('trims and accepts a normal prompt', () => {
    expect(parsePrompt({ prompt: '  a todo list  ' })).toEqual({ ok: true, value: 'a todo list' });
  });
  it('rejects missing, short and oversized prompts', () => {
    expect(parsePrompt({}).ok).toBe(false);
    expect(parsePrompt({ prompt: 'a' }).ok).toBe(false);
    expect(parsePrompt({ prompt: 'x'.repeat(LIMITS.maxPromptChars + 1) }).ok).toBe(false);
    expect(parsePrompt(null).ok).toBe(false);
  });
  it('strips control characters', () => {
    const r = parsePrompt({ prompt: 'a todo\u0000 app' });
    expect(r).toEqual({ ok: true, value: 'a todo app' });
  });
});

describe('extractJson', () => {
  it('parses plain and fenced JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it('throws on invalid JSON', () => {
    expect(() => extractJson('not json')).toThrow();
  });
});

describe('sanitizeProject', () => {
  it('keeps valid blocks and fills defaults', () => {
    const r = sanitizeProject({ blocks: [block({ label: '' , x: 'bad' })] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.name).toBe('AI Generated App');
      expect(r.value.blocks[0].label).toBe('button');
      expect(r.value.blocks[0].x).toBe(20);
      expect(r.value.dropped).toBe(0);
    }
  });

  it('drops unsupported types such as customCode', () => {
    const r = sanitizeProject({ blocks: [block(), block({ id: 'blk_2', type: 'customCode' })] });
    expect(r.ok && r.value.blocks.map(b => b.id)).toEqual(['blk_1']);
    expect(r.ok && r.value.dropped).toBe(1);
    expect(ALLOWED_BLOCK_TYPES).not.toContain('customCode');
  });

  it('drops duplicate and malformed ids', () => {
    const r = sanitizeProject({ blocks: [block(), block(), block({ id: '<script>' }), block({ id: 5 })] });
    expect(r.ok && r.value.blocks).toHaveLength(1);
    expect(r.ok && r.value.dropped).toBe(3);
  });

  it('removes connections to missing blocks and self-links', () => {
    const r = sanitizeProject({
      blocks: [block({ connections: ['blk_1', 'blk_2', 'ghost'] }), block({ id: 'blk_2', type: 'alert' })],
    });
    expect(r.ok && r.value.blocks[0].connections).toEqual(['blk_2']);
  });

  it('keeps If/Else branch positions', () => {
    const r = sanitizeProject({
      blocks: [
        block({ id: 'cond', type: 'ifElse', connections: ['ghost', 'blk_2'] }),
        block({ id: 'blk_2', type: 'alert' }),
      ],
    });
    expect(r.ok && r.value.blocks[0].connections).toEqual(['', 'blk_2']);
  });

  it('removes prototype-pollution keys and clamps coordinates', () => {
    const props = JSON.parse('{"__proto__":{"x":1},"constructor":"y","text":"ok"}');
    const r = sanitizeProject({ blocks: [block({ props, x: 1e9, y: -1e9 })] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const b = r.value.blocks[0];
      expect(Object.keys(b.props)).toEqual(['text']);
      expect(b.x).toBe(LIMITS.maxCoordinate);
      expect(b.y).toBe(-LIMITS.maxCoordinate);
    }
  });

  it('truncates long strings and caps the block count', () => {
    const many = Array.from({ length: LIMITS.maxBlocks + 10 }, (_, i) => block({ id: `b${i}`, props: { text: 'x'.repeat(5000) } }));
    const r = sanitizeProject({ blocks: many });
    expect(r.ok && r.value.blocks).toHaveLength(LIMITS.maxBlocks);
    expect(r.ok && r.value.dropped).toBe(10);
    expect(r.ok && String(r.value.blocks[0].props.text).length).toBe(LIMITS.maxStringChars);
  });

  it('validates screens and the active screen', () => {
    const r = sanitizeProject({
      screens: ['Home', 'Home', 'About'], activeScreen: 'Nope',
      blocks: [block({ screenId: 'Missing' })],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.screens).toEqual(['Home', 'About']);
      expect(r.value.activeScreen).toBe('Home');
      expect(r.value.blocks[0].screenId).toBe('Home');
    }
  });

  it('fails when nothing usable is returned', () => {
    expect(sanitizeProject({ blocks: [] }).ok).toBe(false);
    expect(sanitizeProject({ blocks: [block({ type: 'nope' })] }).ok).toBe(false);
    expect(sanitizeProject('hello').ok).toBe(false);
    expect(sanitizeProject({}).ok).toBe(false);
  });
});

describe('pickAllowedOrigin', () => {
  const allowed = ['https://app.example.com'];
  it('echoes only allowed origins', () => {
    expect(pickAllowedOrigin('https://app.example.com', allowed)).toBe('https://app.example.com');
    expect(pickAllowedOrigin('https://evil.example.com', allowed)).toBeNull();
    expect(pickAllowedOrigin(null, allowed)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Edit and explain modes
// ---------------------------------------------------------------------------

const ctxBlock = (id: string, type: string, over: Record<string, unknown> = {}) => ({
  id, type, label: id, props: {}, x: 0, y: 0, connections: [], ...over,
});

const project = () => ({
  name: 'Demo',
  blocks: [
    ctxBlock('b1', 'button', { props: { text: 'Add' }, connections: ['b2'] }),
    ctxBlock('b2', 'display', { props: { value: '0' } }),
    ctxBlock('b3', 'customCode', { props: { code: 'old()' } }),
    ctxBlock('b4', 'ifElse', { connections: ['b2', 'b1'] }),
  ],
});

const context = () => {
  const r = sanitizeContext(project());
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

describe('parseRequest', () => {
  it('defaults to generate mode', () => {
    expect(parseRequest({ prompt: 'a todo app' })).toEqual({ ok: true, value: { mode: 'generate', prompt: 'a todo app' } });
  });

  it('rejects an unknown mode', () => {
    expect(parseRequest({ mode: 'delete', prompt: 'hello there' }).ok).toBe(false);
  });

  it('edit needs a description and a project', () => {
    expect(parseRequest({ mode: 'edit', prompt: 'make it blue' }).ok).toBe(false);
    expect(parseRequest({ mode: 'edit', prompt: '', project: project() }).ok).toBe(false);
    const ok = parseRequest({ mode: 'edit', prompt: 'make it blue', project: project() });
    expect(ok.ok && ok.value.project?.blocks.length).toBe(4);
  });

  it('explain falls back to a default question', () => {
    const r = parseRequest({ mode: 'explain', project: project() });
    expect(r.ok && r.value.prompt).toBe(DEFAULT_EXPLAIN_PROMPT);
    expect(parseRequest({ mode: 'explain' }).ok).toBe(false);
  });
});

describe('sanitizeContext', () => {
  it('keeps any block type, because the project is only read', () => {
    const r = sanitizeContext(project());
    expect(r.ok && r.value.blocks.map((b) => b.type)).toContain('customCode');
  });

  it('shortens long text and drops malformed blocks', () => {
    const r = sanitizeContext({
      blocks: [ctxBlock('a', 'button', { props: { text: 'x'.repeat(5000) } }), ctxBlock('<b>', 'button'), ctxBlock('c', 'bad type!')],
    });
    expect(r.ok && r.value.blocks).toHaveLength(1);
    expect(r.ok && String(r.value.blocks[0].props.text).length).toBe(LIMITS.maxContextStringChars);
  });

  it('refuses projects that are empty or too large', () => {
    expect(sanitizeContext({ blocks: [] }).ok).toBe(false);
    const many = Array.from({ length: LIMITS.maxContextBlocks + 1 }, (_, i) => ctxBlock(`b${i}`, 'button'));
    expect(sanitizeContext({ blocks: many }).ok).toBe(false);
  });
});

describe('sanitizeEdit', () => {
  it('accepts additions, updates and removals', () => {
    const r = sanitizeEdit({
      summary: 'Show the count',
      changes: {
        add: [{ id: 'ai_1', type: 'alert', label: 'Hi', props: { message: 'Hi' }, x: 300, y: 40, connections: [] }],
        update: [{ id: 'b1', props: { text: 'Add one' }, connections: ['b2', 'ai_1'] }],
        remove: ['b2'],
      },
    }, context());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.add.map((b) => b.id)).toEqual(['ai_1']);
      expect(r.value.update[0].props).toEqual({ text: 'Add one' });
      // b2 is being removed, so the link to it is dropped but the new block stays linked.
      expect(r.value.update[0].connections).toEqual(['ai_1']);
      expect(r.value.remove).toEqual(['b2']);
    }
  });

  it('also accepts changes at the top level', () => {
    const r = sanitizeEdit({ update: [{ id: 'b1', label: 'Go' }] }, context());
    expect(r.ok && r.value.update[0].label).toBe('Go');
  });

  it('never lets the AI touch Custom Code or unknown blocks', () => {
    const r = sanitizeEdit({
      update: [{ id: 'b3', props: { code: 'evil()' } }, { id: 'nope', label: 'x' }, { id: 'b1', label: 'Fine' }],
      remove: ['b3'],
    }, context());
    expect(r.ok && r.value.update.map((u) => u.id)).toEqual(['b1']);
    expect(r.ok && r.value.remove).toEqual([]);
    expect(r.ok && r.value.dropped).toBe(3);
  });

  it('refuses to add a customCode block or reuse an existing id', () => {
    const r = sanitizeEdit({
      add: [
        { id: 'ai_1', type: 'customCode', props: { code: 'x' } },
        { id: 'b1', type: 'alert' },
        { id: 'ai_2', type: 'alert', props: { message: 'ok' } },
      ],
    }, context());
    expect(r.ok && r.value.add.map((b) => b.id)).toEqual(['ai_2']);
  });

  it('cannot change a block type or id through an update', () => {
    const r = sanitizeEdit({ update: [{ id: 'b1', type: 'customCode', newId: 'zzz' }] }, context());
    expect(r.ok).toBe(false);
  });

  it('keeps If/Else branch positions on update', () => {
    const r = sanitizeEdit({ update: [{ id: 'b4', connections: ['ghost', 'b1'] }] }, context());
    expect(r.ok && r.value.update[0].connections).toEqual(['', 'b1']);
  });

  it('ignores updates to a block that is also removed, and duplicate updates', () => {
    const r = sanitizeEdit({
      update: [{ id: 'b1', label: 'One' }, { id: 'b1', label: 'Two' }, { id: 'b2', label: 'Gone' }],
      remove: ['b2'],
    }, context());
    expect(r.ok && r.value.update).toEqual([{ id: 'b1', label: 'One' }]);
  });

  it('strips unsafe keys and caps coordinates', () => {
    const props = JSON.parse('{"__proto__":{"a":1},"text":"ok"}');
    const r = sanitizeEdit({ update: [{ id: 'b1', props, x: 1e9 }] }, context());
    expect(r.ok && Object.keys(r.value.update[0].props ?? {})).toEqual(['text']);
    expect(r.ok && r.value.update[0].x).toBe(LIMITS.maxCoordinate);
  });

  it('fails when there is nothing to do', () => {
    expect(sanitizeEdit({ summary: 'Nothing' }, context()).ok).toBe(false);
    expect(sanitizeEdit('hello', context()).ok).toBe(false);
  });

  it('refuses edits that would make the project too large', () => {
    const blocks = Array.from({ length: LIMITS.maxContextBlocks }, (_, i) => ctxBlock(`b${i}`, 'button'));
    const ctx = sanitizeContext({ blocks });
    if (!ctx.ok) throw new Error(ctx.error);
    const add = Array.from({ length: LIMITS.maxEditAdds }, (_, i) => ({ id: `n${i}`, type: 'alert' }));
    expect(sanitizeEdit({ add }, ctx.value).ok).toBe(false);
  });
});

describe('sanitizeExplanation', () => {
  it('trims and unwraps code fences', () => {
    expect(sanitizeExplanation('  Hello there.  ')).toEqual({ ok: true, value: 'Hello there.' });
    expect(sanitizeExplanation('```\nIt counts.\n```')).toEqual({ ok: true, value: 'It counts.' });
  });

  it('caps the length and rejects empty or non-text replies', () => {
    const long = sanitizeExplanation('a'.repeat(LIMITS.maxExplanationChars + 500));
    expect(long.ok && long.value.length).toBe(LIMITS.maxExplanationChars);
    expect(sanitizeExplanation('   ').ok).toBe(false);
    expect(sanitizeExplanation(42).ok).toBe(false);
  });
});
