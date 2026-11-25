import type { BlockType } from '@/types/blocks';

export type BlockMode = 'basic' | 'all';

/**
 * Blocks shown in the palette in Basic mode: enough to build a small interactive
 * app (screen elements, events, decisions, variables, lists and a loop).
 * Everything else stays one tap away under "All blocks".
 */
export const BASIC_BLOCKS: readonly BlockType[] = [
  // Screen elements
  'button', 'text', 'input', 'display', 'image',
  // Events and decisions
  'onStart', 'condition', 'ifElse', 'wait',
  // Data
  'math', 'variable', 'listCreate', 'listAdd', 'listRemove', 'listGet',
  // Feedback and repetition
  'alert', 'repeat',
];

const BASIC_SET: ReadonlySet<string> = new Set(BASIC_BLOCKS);

export function isBasicBlock(type: BlockType): boolean {
  return BASIC_SET.has(type);
}
