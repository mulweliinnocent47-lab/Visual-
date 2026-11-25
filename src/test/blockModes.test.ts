import { describe, it, expect } from 'vitest';
import { BASIC_BLOCKS, isBasicBlock } from '@/lib/blockModes';
import { BLOCK_DEFINITIONS } from '@/types/blocks';

describe('basic block set', () => {
  it('only lists blocks that exist', () => {
    for (const type of BASIC_BLOCKS) {
      expect(BLOCK_DEFINITIONS[type], `${type} is not a block`).toBeDefined();
    }
  });

  it('has no duplicates', () => {
    expect(new Set(BASIC_BLOCKS).size).toBe(BASIC_BLOCKS.length);
  });

  it('keeps advanced blocks out of Basic mode', () => {
    expect(isBasicBlock('button')).toBe(true);
    expect(isBasicBlock('customCode')).toBe(false);
    expect(isBasicBlock('dbCreate')).toBe(false);
    expect(isBasicBlock('authLogin')).toBe(false);
  });
});
