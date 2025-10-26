import { useState, useCallback } from 'react';

export interface SelectionState {
  selectedIds: number[];
  isSelecting: boolean;
  selectionBox: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null;
}

export function useMultiSelection() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);

  const toggleSelection = useCallback((id: number, isMulti: boolean) => {
    setSelectedIds(prev => {
      if (isMulti) {
        if (prev.includes(id)) {
          return prev.filter(i => i !== id);
        } else {
          return [...prev, id];
        }
      } else {
        return prev.includes(id) && prev.length === 1 ? [] : [id];
      }
    });
  }, []);

  const addToSelection = useCallback((id: number) => {
    setSelectedIds(prev => {
      if (!prev.includes(id)) {
        return [...prev, id];
      }
      return prev;
    });
  }, []);

  const removeFromSelection = useCallback((id: number) => {
    setSelectedIds(prev => prev.filter(i => i !== id));
  }, []);

  const selectAll = useCallback((ids: number[]) => {
    setSelectedIds(ids);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const selectMultiple = useCallback((ids: number[]) => {
    setSelectedIds(ids);
  }, []);

  const startBoxSelection = useCallback((x: number, y: number) => {
    setIsSelecting(true);
    setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
  }, []);

  const updateBoxSelection = useCallback((x: number, y: number) => {
    if (isSelecting && selectionBox) {
      setSelectionBox(prev => prev ? { ...prev, endX: x, endY: y } : null);
    }
  }, [isSelecting, selectionBox]);

  const endBoxSelection = useCallback(() => {
    setIsSelecting(false);
    setSelectionBox(null);
  }, []);

  const isInSelectionBox = useCallback((
    nodeX: number,
    nodeY: number,
    nodeWidth: number = 150,
    nodeHeight: number = 60
  ): boolean => {
    if (!selectionBox) return false;

    const { startX, startY, endX, endY } = selectionBox;
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);

    const nodeRight = nodeX + nodeWidth;
    const nodeBottom = nodeY + nodeHeight;

    return !(nodeRight < minX || nodeX > maxX || nodeBottom < minY || nodeY > maxY);
  }, [selectionBox]);

  return {
    selectedIds,
    isSelecting,
    selectionBox,
    toggleSelection,
    addToSelection,
    removeFromSelection,
    selectAll,
    clearSelection,
    selectMultiple,
    startBoxSelection,
    updateBoxSelection,
    endBoxSelection,
    isInSelectionBox,
  };
}
