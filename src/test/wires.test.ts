import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BLOCK_SIZE,
  addConnection,
  computeWires,
  getInPort,
  getOutPort,
  removeConnection,
  wireMidpoint,
  wirePath,
} from '@/lib/wires';

const block = (id: string, x: number, y: number, connections: string[] = [], type = 'button') =>
  ({ id, type, x, y, connections }) as Parameters<typeof computeWires>[0][number];

describe('ports', () => {
  it('sit on the right and left edges at the header height', () => {
    expect(getOutPort({ x: 100, y: 50 }, { w: 200, h: 80, portY: 20 })).toEqual({ x: 300, y: 70 });
    expect(getInPort({ x: 100, y: 50 }, { w: 200, h: 80, portY: 20 })).toEqual({ x: 100, y: 70 });
  });

  it('fall back to a default size before a block is measured', () => {
    expect(getOutPort({ x: 0, y: 0 }).x).toBe(DEFAULT_BLOCK_SIZE.w);
  });
});

describe('wire geometry', () => {
  it('draws a smooth horizontal curve between two points', () => {
    expect(wirePath({ x: 0, y: 0 }, { x: 200, y: 100 })).toBe('M 0 0 C 100 0, 100 100, 200 100');
  });

  it('keeps a minimum curve for blocks that are close or backwards', () => {
    expect(wirePath({ x: 100, y: 0 }, { x: 100, y: 40 })).toBe('M 100 0 C 148 0, 52 40, 100 40');
  });

  it('finds the middle of the curve', () => {
    expect(wireMidpoint({ x: 0, y: 0 }, { x: 200, y: 100 })).toEqual({ x: 100, y: 50 });
  });
});

describe('computeWires', () => {
  it('connects the output edge of one block to the input edge of the next', () => {
    const wires = computeWires(
      [block('a', 0, 0, ['b']), block('b', 400, 100)],
      { a: { w: 180, h: 60, portY: 20 }, b: { w: 180, h: 60, portY: 20 } },
    );
    expect(wires).toHaveLength(1);
    expect(wires[0].from).toEqual({ x: 180, y: 20 });
    expect(wires[0].to).toEqual({ x: 400, y: 120 });
  });

  it('skips empty slots, missing targets and self links', () => {
    const wires = computeWires([block('a', 0, 0, ['', 'ghost', 'a', 'b']), block('b', 300, 0)]);
    expect(wires.map((w) => w.toId)).toEqual(['b']);
  });

  it('labels the two If / Else branches', () => {
    const wires = computeWires([block('i', 0, 0, ['t', 'f'], 'ifElse'), block('t', 300, 0), block('f', 300, 100)]);
    expect(wires.map((w) => w.label)).toEqual(['true', 'false']);
  });

  it('keeps the false label when the true slot is empty', () => {
    const wires = computeWires([block('i', 0, 0, ['', 'f'], 'ifElse'), block('f', 300, 100)]);
    expect(wires).toHaveLength(1);
    expect(wires[0].label).toBe('false');
  });

  it('gives every wire a unique key', () => {
    const wires = computeWires([block('a', 0, 0, ['b', 'b']), block('b', 300, 0)]);
    expect(new Set(wires.map((w) => w.key)).size).toBe(2);
  });
});

describe('addConnection', () => {
  it('appends and ignores duplicates', () => {
    expect(addConnection(['a'], 'button', 'b')).toEqual(['a', 'b']);
    expect(addConnection(['a'], 'button', 'a')).toEqual(['a']);
  });

  it('fills the first empty If / Else slot instead of shifting branches', () => {
    expect(addConnection(['', 'f'], 'ifElse', 't')).toEqual(['t', 'f']);
    expect(addConnection(['t'], 'ifElse', 'f')).toEqual(['t', 'f']);
    expect(addConnection([], 'ifElse', 't')).toEqual(['t']);
  });

  it('does not change the list it was given', () => {
    const list = ['a'];
    addConnection(list, 'button', 'b');
    expect(list).toEqual(['a']);
  });
});

describe('removeConnection', () => {
  it('removes a plain connection', () => {
    expect(removeConnection(['a', 'b', 'c'], 'button', 'b')).toEqual(['a', 'c']);
    expect(removeConnection(['a'], 'button', 'zzz')).toEqual(['a']);
  });

  it('keeps If / Else branch positions', () => {
    expect(removeConnection(['t', 'f'], 'ifElse', 't')).toEqual(['', 'f']);
    expect(removeConnection(['t', 'f'], 'ifElse', 'f')).toEqual(['t']);
    expect(removeConnection(['t'], 'ifElse', 't')).toEqual([]);
  });
});
