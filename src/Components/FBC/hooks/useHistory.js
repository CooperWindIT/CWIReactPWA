import { useState, useCallback } from 'react';
import { snapshot } from '../../../../utils/geometry';

const MAX_HISTORY = 50;

export function useHistory(nodes, connections, restore) {
  const [history, setHistory] = useState([snapshot(nodes, connections)]);
  const [idx, setIdx] = useState(0);

  const push = useCallback((newNodes, newConns) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, idx + 1);
      const next = [...trimmed, snapshot(newNodes, newConns)];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setIdx(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [idx]);

  const undo = useCallback(() => {
    if (idx <= 0) return;
    const newIdx = idx - 1;
    setIdx(newIdx);
    restore(history[newIdx]);
  }, [idx, history, restore]);

  const redo = useCallback(() => {
    if (idx >= history.length - 1) return;
    const newIdx = idx + 1;
    setIdx(newIdx);
    restore(history[newIdx]);
  }, [idx, history, restore]);

  return { push, undo, redo, canUndo: idx > 0, canRedo: idx < history.length - 1 };
}
