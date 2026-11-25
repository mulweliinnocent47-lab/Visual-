import type { Block } from '@/types/blocks';

/** Measured size of a block on the canvas, plus the height of its connector ports. */
export interface BlockSize {
  w: number;
  h: number;
  /** Distance from the block's top edge to the centre of its ports. */
  portY: number;
}

export interface Point { x: number; y: number }

export type WireBlock = Pick<Block, 'id' | 'type' | 'x' | 'y' | 'connections'>;

export interface Wire {
  key: string;
  fromId: string;
  toId: string;
  /** Position in the source block's connection list. */
  slot: number;
  from: Point;
  to: Point;
  path: string;
  mid: Point;
  /** If/Else wires are labelled with the branch they run. */
  label?: 'true' | 'false';
}

/** Used before a block has been measured. */
export const DEFAULT_BLOCK_SIZE: BlockSize = { w: 176, h: 64, portY: 22 };

const round = (n: number) => Math.round(n * 10) / 10;

export function getOutPort(block: Pick<Block, 'x' | 'y'>, size: BlockSize = DEFAULT_BLOCK_SIZE): Point {
  return { x: round(block.x + size.w), y: round(block.y + size.portY) };
}

export function getInPort(block: Pick<Block, 'x' | 'y'>, size: BlockSize = DEFAULT_BLOCK_SIZE): Point {
  return { x: round(block.x), y: round(block.y + size.portY) };
}

function controlOffset(from: Point, to: Point): number {
  return Math.max(48, Math.abs(to.x - from.x) / 2);
}

/** A smooth horizontal S-curve from an output port to an input port. */
export function wirePath(from: Point, to: Point): string {
  const dx = controlOffset(from, to);
  return `M ${from.x} ${from.y} C ${round(from.x + dx)} ${from.y}, ${round(to.x - dx)} ${to.y}, ${to.x} ${to.y}`;
}

/** The point halfway along the curve (cubic Bézier at t = 0.5). Used for the remove button. */
export function wireMidpoint(from: Point, to: Point): Point {
  const dx = controlOffset(from, to);
  return {
    x: round((from.x + 3 * (from.x + dx) + 3 * (to.x - dx) + to.x) / 8),
    y: round((from.y + 3 * from.y + 3 * to.y + to.y) / 8),
  };
}

/** Every visible wire for the given blocks. Skips empty slots, missing targets and self-links. */
export function computeWires(blocks: readonly WireBlock[], sizes: Record<string, BlockSize> = {}): Wire[] {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const wires: Wire[] = [];
  for (const block of blocks) {
    block.connections.forEach((toId, slot) => {
      if (!toId || toId === block.id) return;
      const target = byId.get(toId);
      if (!target) return;
      const from = getOutPort(block, sizes[block.id]);
      const to = getInPort(target, sizes[target.id]);
      wires.push({
        key: `${block.id}:${slot}>${toId}`,
        fromId: block.id,
        toId,
        slot,
        from,
        to,
        path: wirePath(from, to),
        mid: wireMidpoint(from, to),
        ...(block.type === 'ifElse' && slot < 2 ? { label: slot === 0 ? ('true' as const) : ('false' as const) } : {}),
      });
    });
  }
  return wires;
}

/**
 * Adds a connection. If/Else keeps two fixed slots (0 = true branch, 1 = false branch),
 * so a new link fills the first empty slot instead of shifting the others.
 */
export function addConnection(connections: readonly string[], blockType: string, toId: string): string[] {
  if (connections.includes(toId)) return [...connections];
  if (blockType === 'ifElse') {
    const empty = connections.findIndex((c, i) => i < 2 && !c);
    if (empty !== -1) {
      const next = [...connections];
      next[empty] = toId;
      return next;
    }
  }
  return [...connections, toId];
}

/** Removes a connection. If/Else leaves an empty slot so the other branch keeps its meaning. */
export function removeConnection(connections: readonly string[], blockType: string, toId: string): string[] {
  const index = connections.indexOf(toId);
  if (index === -1) return [...connections];
  if (blockType === 'ifElse' && index < 2) {
    const next = [...connections];
    next[index] = '';
    while (next.length > 0 && next[next.length - 1] === '') next.pop();
    return next;
  }
  return connections.filter((_, i) => i !== index);
}
