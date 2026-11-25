import { BLOCK_DEFINITIONS, type Block, type BlockType, type ProjectData } from '@/types/blocks';

// ---------------------------------------------------------------------------
// Types shared with the ai-block-generator edge function (edit and explain modes)
// ---------------------------------------------------------------------------

export interface AiBlockUpdate {
  id: string;
  label?: string;
  /** Merged into the block's existing props. */
  props?: Record<string, unknown>;
  x?: number;
  y?: number;
  /** Replaces the block's connections. */
  connections?: string[];
}

export interface AiEdit {
  summary: string;
  add: Array<Pick<Block, 'id' | 'type' | 'label' | 'props' | 'x' | 'y' | 'connections'> & { screenId?: string }>;
  update: AiBlockUpdate[];
  remove: string[];
  dropped?: number;
}

/** Custom Code is never changed by the AI, even if a reply asks for it. */
const PROTECTED_TYPES: ReadonlySet<string> = new Set(['customCode']);

export const MAX_AI_CONTEXT_BLOCKS = 150;
export const MAX_PROJECT_BLOCKS = 200;

type ContextSource = Pick<ProjectData, 'name' | 'blocks' | 'screens' | 'activeScreen'>;

/** The compact project the AI reads. */
export function buildAiContext(project: ContextSource) {
  return {
    name: project.name,
    ...(project.screens ? { screens: project.screens } : {}),
    ...(project.activeScreen ? { activeScreen: project.activeScreen } : {}),
    blocks: project.blocks.map((b) => ({
      id: b.id,
      type: b.type,
      label: b.label,
      props: b.props,
      x: b.x,
      y: b.y,
      connections: b.connections,
      ...(b.screenId ? { screenId: b.screenId } : {}),
    })),
  };
}

// ---------------------------------------------------------------------------
// Applying an edit
// ---------------------------------------------------------------------------

/** Keeps links to blocks that exist. If/Else keeps its two branch slots. */
function cleanLinks(connections: readonly string[], type: string, selfId: string, valid: ReadonlySet<string>): string[] {
  const ok = (c: string) => !!c && valid.has(c) && c !== selfId;
  if (type === 'ifElse') {
    const slots = connections.slice(0, 2).map((c) => (ok(c) ? c : ''));
    while (slots.length > 0 && slots[slots.length - 1] === '') slots.pop();
    return slots;
  }
  const seen = new Set<string>();
  return connections.filter((c) => ok(c) && !seen.has(c) && !!seen.add(c));
}

/** Moves a new block down until it no longer sits on top of another one. */
function findFreeSpot(taken: ReadonlyArray<Pick<Block, 'x' | 'y'>>, x: number, y: number): { x: number; y: number } {
  let nextY = y;
  for (let tries = 0; tries < 50; tries++) {
    const blocked = taken.some((b) => Math.abs(b.x - x) < 190 && Math.abs(b.y - nextY) < 72);
    if (!blocked) break;
    nextY += 80;
  }
  return { x, y: nextY };
}

/** Returns the project's blocks with the AI's suggested changes applied. Does not change its input. */
export function applyAiEdit(blocks: readonly Block[], edit: AiEdit): Block[] {
  const protectedIds = new Set(blocks.filter((b) => PROTECTED_TYPES.has(b.type)).map((b) => b.id));
  const removed = new Set(edit.remove.filter((id) => !protectedIds.has(id)));
  const updates = new Map(edit.update.filter((u) => !protectedIds.has(u.id) && !removed.has(u.id)).map((u) => [u.id, u]));

  const kept = blocks.filter((b) => !removed.has(b.id)).map<Block>((b) => {
    const u = updates.get(b.id);
    if (!u) return b;
    return {
      ...b,
      ...(u.label ? { label: u.label } : {}),
      ...(u.props ? { props: { ...b.props, ...u.props } } : {}),
      ...(typeof u.x === 'number' ? { x: Math.max(0, u.x) } : {}),
      ...(typeof u.y === 'number' ? { y: Math.max(0, u.y) } : {}),
      ...(u.connections ? { connections: [...u.connections] } : {}),
    };
  });

  const existingIds = new Set(blocks.map((b) => b.id));
  const placed: Block[] = [];
  for (const a of edit.add) {
    if (existingIds.has(a.id) || PROTECTED_TYPES.has(a.type) || !(a.type in BLOCK_DEFINITIONS)) continue;
    if (kept.length + placed.length >= MAX_PROJECT_BLOCKS) break;
    const spot = findFreeSpot([...kept, ...placed], Math.max(0, a.x), Math.max(0, a.y));
    placed.push({
      id: a.id,
      type: a.type as BlockType,
      label: a.label || BLOCK_DEFINITIONS[a.type as BlockType].label,
      props: { ...a.props },
      x: spot.x,
      y: spot.y,
      connections: [...a.connections],
      ...(a.screenId ? { screenId: a.screenId } : {}),
    });
  }

  const all = [...kept, ...placed];
  const valid = new Set(all.map((b) => b.id));
  return all.map((b) => {
    const links = cleanLinks(b.connections, b.type, b.id, valid);
    const same = links.length === b.connections.length && links.every((c, i) => c === b.connections[i]);
    return same ? b : { ...b, connections: links };
  });
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

export type PreviewItem =
  | { kind: 'add'; id: string; title: string; lines: string[] }
  | { kind: 'change'; id: string; title: string; lines: string[] }
  | { kind: 'remove'; id: string; title: string; lines: string[] };

const quote = (s: string, max = 40) => `“${s.length > max ? `${s.slice(0, max - 1)}…` : s}”`;

function show(value: unknown): string {
  if (value === undefined || value === null || value === '') return '(empty)';
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const json = JSON.stringify(value);
  return json.length > 40 ? `${json.slice(0, 39)}…` : json;
}

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const iconOf = (type: string) => BLOCK_DEFINITIONS[type as BlockType]?.icon ?? '🧱';
const nameOf = (b: Pick<Block, 'type' | 'label'>) => `${iconOf(b.type)} ${b.label}`;

/** A plain-language list of what applying the edit would do, so the person can check it first. */
export function describeAiEdit(blocks: readonly Block[], edit: AiEdit): PreviewItem[] {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const labelFor = (id: string) => {
    const existing = byId.get(id);
    if (existing) return existing.label;
    return edit.add.find((a) => a.id === id)?.label ?? id;
  };
  const items: PreviewItem[] = [];

  for (const a of edit.add) {
    if (byId.has(a.id) || PROTECTED_TYPES.has(a.type) || !(a.type in BLOCK_DEFINITIONS)) continue;
    const lines = [BLOCK_DEFINITIONS[a.type as BlockType].label];
    Object.entries(a.props ?? {}).slice(0, 3).forEach(([k, v]) => lines.push(`${k}: ${show(v)}`));
    const links = a.connections.filter(Boolean).map(labelFor);
    if (links.length > 0) lines.push(`Links to ${links.join(', ')}`);
    items.push({ kind: 'add', id: a.id, title: nameOf({ type: a.type, label: a.label || BLOCK_DEFINITIONS[a.type as BlockType].label }), lines });
  }

  for (const u of edit.update) {
    const block = byId.get(u.id);
    if (!block || PROTECTED_TYPES.has(block.type) || edit.remove.includes(u.id)) continue;
    const lines: string[] = [];
    if (u.label && u.label !== block.label) lines.push(`Name: ${quote(block.label)} → ${quote(u.label)}`);
    for (const [key, value] of Object.entries(u.props ?? {})) {
      if (!sameValue(block.props[key], value)) lines.push(`${key}: ${show(block.props[key])} → ${show(value)}`);
    }
    if (u.connections) {
      const before = new Set(block.connections.filter(Boolean));
      const after = new Set(u.connections.filter(Boolean));
      const gained = [...after].filter((id) => !before.has(id)).map(labelFor);
      const lost = [...before].filter((id) => !after.has(id)).map(labelFor);
      if (gained.length > 0) lines.push(`Now links to ${gained.join(', ')}`);
      if (lost.length > 0) lines.push(`No longer links to ${lost.join(', ')}`);
    }
    if ((typeof u.x === 'number' && u.x !== block.x) || (typeof u.y === 'number' && u.y !== block.y)) lines.push('Moves to a new spot');
    if (lines.length > 0) items.push({ kind: 'change', id: u.id, title: nameOf(block), lines });
  }

  for (const id of edit.remove) {
    const block = byId.get(id);
    if (!block || PROTECTED_TYPES.has(block.type)) continue;
    const linkedFrom = blocks.filter((b) => b.id !== id && b.connections.includes(id) && !edit.remove.includes(b.id)).length;
    items.push({
      kind: 'remove',
      id,
      title: nameOf(block),
      lines: linkedFrom > 0 ? [`${linkedFrom === 1 ? '1 block links' : `${linkedFrom} blocks link`} here. Those links are removed too.`] : [],
    });
  }
  return items;
}
