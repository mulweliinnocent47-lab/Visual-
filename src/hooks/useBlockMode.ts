import { useCallback, useState } from 'react';
import type { BlockMode } from '@/lib/blockModes';

const MODE_KEY = 'tydarsu_block_mode';

function readStoredMode(): BlockMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'all' ? 'all' : 'basic';
  } catch {
    return 'basic';
  }
}

/** Remembers whether the block palette shows Basic blocks or All blocks. New users start in Basic. */
export function useBlockMode() {
  const [mode, setModeState] = useState<BlockMode>(readStoredMode);

  const setMode = useCallback((next: BlockMode) => {
    setModeState(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the choice still applies for this session.
    }
  }, []);

  return { mode, setMode };
}
