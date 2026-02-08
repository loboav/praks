import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMultiSelection } from '../hooks/useMultiSelection';

describe('useMultiSelection', () => {
  it('should initialize with empty selection', () => {
    const { result } = renderHook(() => useMultiSelection());
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.isSelecting).toBe(false);
    expect(result.current.selectionBox).toBeNull();
  });

  describe('toggleSelection', () => {
    it('should select a single node when not in multi mode', () => {
      const { result } = renderHook(() => useMultiSelection());
      act(() => {
        result.current.toggleSelection(1, false);
      });
      expect(result.current.selectedIds).toEqual([1]);
    });

    it('should deselect a node when clicking it again (single mode)', () => {
      const { result } = renderHook(() => useMultiSelection());
      act(() => {
        result.current.toggleSelection(1, false);
      });
      expect(result.current.selectedIds).toEqual([1]);
      act(() => {
        result.current.toggleSelection(1, false);
      });
      expect(result.current.selectedIds).toEqual([]);
    });

    it('should replace selection with new node in single mode', () => {
      const { result } = renderHook(() => useMultiSelection());
      act(() => {
        result.current.toggleSelection(1, false);
      });
      act(() => {
        result.current.toggleSelection(2, false);
      });
      expect(result.current.selectedIds).toEqual([2]);
    });

    it('should add to selection in multi mode', () => {
      const { result } = renderHook(() => useMultiSelection());
      act(() => {
        result.current.toggleSelection(1, true);
      });
      act(() => {
        result.current.toggleSelection(2, true);
      });
      expect(result.current.selectedIds).toEqual([1, 2]);
    });

    it('should remove from selection in multi mode when already selected', () => {
      const { result } = renderHook(() => useMultiSelection());
      act(() => {
        result.current.toggleSelection(1, true);
      });
      act(() => {
        result.current.toggleSelection(2, true);
      });
      act(() => {
        result.current.toggleSelection(1, true);
      });
      expect(result.current.selectedIds).toEqual([2]);
    });
  });

  describe('addToSelection', () => {
    it('should add a node to selection', () => {
      const { result } = renderHook(() => useMultiSelection());
      act(() => {
        result.current.addToSelection(5);
      });
      expect(result.current.selectedIds).toEqual([5]);
    });

    it('should not duplicate if already selected', () => {
      const { result } = renderHook(() => useMultiSelection());
      act(() => {
        result.current.addToSelection(5);
      });
      act(() => {
        result.current.addToSelection(5);
      });
      expect(result.current.selectedIds).toEqual([5]);
    });
  });

  describe('removeFromSelection', () => {
    it('should remove a node from selection', () => {
      const { result } = renderHook(() => useMultiSelection());
      act(() => {
        result.current.selectAll([1, 2, 3]);
      });
      act(() => {
        result.current.removeFromSelection(2);
      });
      expect(result.current.selectedIds).toEqual([1, 3]);
    });

    it('should do nothing if node not in selection', () => {
      const { result } = renderHook(() => useMultiSelection());
      act(() => {
        result.current.selectAll([1, 2]);
      });
      act(() => {
        result.current.removeFromSelection(99);
      });
      expect(result.current.selectedIds).toEqual([1, 2]);
    });
  });

  describe('selectAll', () => {
    it('should select all provided IDs', () => {
      const { result } = renderHook(() => useMultiSelection());
      act(() => {
        result.current.selectAll([10, 20, 30]);
      });
      expect(result.current.selectedIds).toEqual([10, 20, 30]);
    });

    it('should replace previous selection', () => {
      const { result } = renderHook(() => useMultiSelection());
      act(() => {
        result.current.selectAll([1, 2]);
      });
      act(() => {
        result.current.selectAll([5, 6, 7]);
      });
      expect(result.current.selectedIds).toEqual([5, 6, 7]);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selected nodes', () => {
      const { result } = renderHook(() => useMultiSelection());
      act(() => {
        result.current.selectAll([1, 2, 3]);
      });
      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.selectedIds).toEqual([]);
    });
  });

  describe('selectMultiple', () => {
    it('should set exact list of selected IDs', () => {
      const { result } = renderHook(() => useMultiSelection());
      act(() => {
        result.current.selectMultiple([100, 200]);
      });
      expect(result.current.selectedIds).toEqual([100, 200]);
    });
  });

  describe('box selection', () => {
    it('should start box selection', () => {
      const { result } = renderHook(() => useMultiSelection());
      act(() => {
        result.current.startBoxSelection(10, 20);
      });
      expect(result.current.isSelecting).toBe(true);
      expect(result.current.selectionBox).toEqual({
        startX: 10,
        startY: 20,
        endX: 10,
        endY: 20,
      });
    });

    it('should update box selection', () => {
      const { result } = renderHook(() => useMultiSelection());
      act(() => {
        result.current.startBoxSelection(10, 20);
      });
      act(() => {
        result.current.updateBoxSelection(100, 200);
      });
      expect(result.current.selectionBox).toEqual({
        startX: 10,
        startY: 20,
        endX: 100,
        endY: 200,
      });
    });

    it('should end box selection', () => {
      const { result } = renderHook(() => useMultiSelection());
      act(() => {
        result.current.startBoxSelection(10, 20);
      });
      act(() => {
        result.current.endBoxSelection();
      });
      expect(result.current.isSelecting).toBe(false);
      expect(result.current.selectionBox).toBeNull();
    });
  });

  describe('isInSelectionBox', () => {
    it('should return true if node is inside selection box', () => {
      const { result } = renderHook(() => useMultiSelection());
      act(() => {
        result.current.startBoxSelection(0, 0);
      });
      act(() => {
        result.current.updateBoxSelection(300, 300);
      });
      expect(result.current.isInSelectionBox(50, 50, 150, 60)).toBe(true);
    });

    it('should return false if node is outside selection box', () => {
      const { result } = renderHook(() => useMultiSelection());
      act(() => {
        result.current.startBoxSelection(0, 0);
      });
      act(() => {
        result.current.updateBoxSelection(100, 100);
      });
      expect(result.current.isInSelectionBox(500, 500, 150, 60)).toBe(false);
    });

    it('should return false if no selection box exists', () => {
      const { result } = renderHook(() => useMultiSelection());
      expect(result.current.isInSelectionBox(50, 50)).toBe(false);
    });

    it('should handle reversed box (drag right-to-left)', () => {
      const { result } = renderHook(() => useMultiSelection());
      act(() => {
        result.current.startBoxSelection(300, 300);
      });
      act(() => {
        result.current.updateBoxSelection(0, 0);
      });
      expect(result.current.isInSelectionBox(50, 50, 150, 60)).toBe(true);
    });
  });
});
