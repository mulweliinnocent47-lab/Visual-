import { useState, useCallback, useRef } from 'react';
import { Block } from '@/types/blocks';

interface HistoryEntry {
  blocks: Block[];
  timestamp: number;
}

const MAX_HISTORY = 50;

export function useHistory(initialBlocks: Block[]) {
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);
  const lastPushRef = useRef(0);

  const pushState = useCallback((blocks: Block[]) => {
    const now = Date.now();
    // Debounce: don't push if last push was < 300ms ago
    if (now - lastPushRef.current < 300) return;
    lastPushRef.current = now;

    setUndoStack(prev => {
      const next = [...prev, { blocks: JSON.parse(JSON.stringify(blocks)), timestamp: now }];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setRedoStack([]);
  }, []);

  const undo = useCallback((currentBlocks: Block[]): Block[] | null => {
    if (undoStack.length === 0) return null;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    setRedoStack(s => [...s, { blocks: JSON.parse(JSON.stringify(currentBlocks)), timestamp: Date.now() }]);
    return prev.blocks;
  }, [undoStack]);

  const redo = useCallback((currentBlocks: Block[]): Block[] | null => {
    if (redoStack.length === 0) return null;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(s => s.slice(0, -1));
    setUndoStack(s => [...s, { blocks: JSON.parse(JSON.stringify(currentBlocks)), timestamp: Date.now() }]);
    return next.blocks;
  }, [redoStack]);

  return {
    pushState,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}
