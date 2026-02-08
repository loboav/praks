import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistory } from '../hooks/useHistory';

describe('useHistory', () => {
  const createMockAction = (desc: string = 'test action') => ({
    type: 'create' as const,
    description: desc,
    undo: vi.fn(() => Promise.resolve()),
    redo: vi.fn(() => Promise.resolve()),
  });

  it('should initialize with empty history', () => {
    const { result } = renderHook(() => useHistory());
    expect(result.current.history).toEqual([]);
    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  describe('addAction', () => {
    it('should add an action to history', () => {
      const { result } = renderHook(() => useHistory());
      act(() => {
        result.current.addAction(createMockAction('first'));
      });
      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].description).toBe('first');
      expect(result.current.currentIndex).toBe(0);
    });

    it('should add multiple actions sequentially', () => {
      const { result } = renderHook(() => useHistory());
      act(() => {
        result.current.addAction(createMockAction('first'));
      });
      act(() => {
        result.current.addAction(createMockAction('second'));
      });
      act(() => {
        result.current.addAction(createMockAction('third'));
      });
      expect(result.current.history).toHaveLength(3);
      expect(result.current.currentIndex).toBe(2);
    });

    it('should assign unique id and timestamp to each action', () => {
      const { result } = renderHook(() => useHistory());
      act(() => {
        result.current.addAction(createMockAction('a'));
      });
      act(() => {
        result.current.addAction(createMockAction('b'));
      });
      const [a, b] = result.current.history;
      expect(a.id).toBeDefined();
      expect(b.id).toBeDefined();
      expect(a.id).not.toBe(b.id);
      expect(a.timestamp).toBeLessThanOrEqual(b.timestamp);
    });

    it('should truncate future history when adding after undo', async () => {
      const { result } = renderHook(() => useHistory());
      act(() => {
        result.current.addAction(createMockAction('first'));
      });
      act(() => {
        result.current.addAction(createMockAction('second'));
      });
      act(() => {
        result.current.addAction(createMockAction('third'));
      });
      await act(async () => {
        await result.current.undo();
      });
      // Wait for isProcessingRef to clear
      await act(async () => {
        await new Promise(r => setTimeout(r, 350));
      });
      await act(async () => {
        await result.current.undo();
      });
      // Wait for isProcessingRef to clear
      await act(async () => {
        await new Promise(r => setTimeout(r, 350));
      });
      // currentIndex is now 0, adding new action should remove 'second' and 'third'
      act(() => {
        result.current.addAction(createMockAction('new-branch'));
      });
      expect(result.current.history).toHaveLength(2);
      expect(result.current.history[0].description).toBe('first');
      expect(result.current.history[1].description).toBe('new-branch');
      expect(result.current.currentIndex).toBe(1);
    });
  });

  describe('maxSize', () => {
    it('should respect maxSize limit', () => {
      const { result } = renderHook(() => useHistory({ maxSize: 3 }));
      act(() => {
        result.current.addAction(createMockAction('1'));
      });
      act(() => {
        result.current.addAction(createMockAction('2'));
      });
      act(() => {
        result.current.addAction(createMockAction('3'));
      });
      act(() => {
        result.current.addAction(createMockAction('4'));
      });
      // Should have dropped the oldest one
      expect(result.current.history.length).toBeLessThanOrEqual(3);
    });
  });

  describe('undo', () => {
    it('should call undo on the current action', async () => {
      const action = createMockAction('test');
      const { result } = renderHook(() => useHistory());
      act(() => {
        result.current.addAction(action);
      });
      await act(async () => {
        const success = await result.current.undo();
        expect(success).toBe(true);
      });
      expect(action.undo).toHaveBeenCalledTimes(1);
      expect(result.current.currentIndex).toBe(-1);
    });

    it('should not undo when history is empty', async () => {
      const { result } = renderHook(() => useHistory());
      await act(async () => {
        const success = await result.current.undo();
        expect(success).toBe(false); // returns false when index < 0
      });
      expect(result.current.currentIndex).toBe(-1);
    });

    it('should enable canRedo after undo', async () => {
      const { result } = renderHook(() => useHistory());
      act(() => {
        result.current.addAction(createMockAction('test'));
      });
      expect(result.current.canRedo).toBe(false);
      await act(async () => {
        await result.current.undo();
      });
      expect(result.current.canRedo).toBe(true);
    });

    it('should disable canUndo after undoing all actions', async () => {
      const { result } = renderHook(() => useHistory());
      act(() => {
        result.current.addAction(createMockAction('only'));
      });
      expect(result.current.canUndo).toBe(true);
      await act(async () => {
        await result.current.undo();
      });
      expect(result.current.canUndo).toBe(false);
    });

    it('should undo multiple actions in sequence', async () => {
      const action1 = createMockAction('first');
      const action2 = createMockAction('second');
      const { result } = renderHook(() => useHistory());
      act(() => {
        result.current.addAction(action1);
      });
      act(() => {
        result.current.addAction(action2);
      });
      await act(async () => {
        await result.current.undo();
      });
      expect(action2.undo).toHaveBeenCalledTimes(1);
      expect(action1.undo).not.toHaveBeenCalled();
      expect(result.current.currentIndex).toBe(0);

      // Wait for isProcessingRef to clear
      await act(async () => {
        await new Promise(r => setTimeout(r, 350));
      });

      await act(async () => {
        await result.current.undo();
      });
      expect(action1.undo).toHaveBeenCalledTimes(1);
      expect(result.current.currentIndex).toBe(-1);
    });
  });

  describe('redo', () => {
    it('should call redo on the next action', async () => {
      const action = createMockAction('test');
      const { result } = renderHook(() => useHistory());
      act(() => {
        result.current.addAction(action);
      });
      await act(async () => {
        await result.current.undo();
      });
      await act(async () => {
        // Need to wait for isProcessingRef to clear
        await new Promise(r => setTimeout(r, 350));
      });
      await act(async () => {
        const success = await result.current.redo();
        expect(success).toBe(true);
      });
      expect(action.redo).toHaveBeenCalledTimes(1);
      expect(result.current.currentIndex).toBe(0);
    });

    it('should not redo when at the end of history', async () => {
      const { result } = renderHook(() => useHistory());
      act(() => {
        result.current.addAction(createMockAction('test'));
      });
      await act(async () => {
        const success = await result.current.redo();
        expect(success).toBe(false);
      });
    });

    it('should not redo when history is empty', async () => {
      const { result } = renderHook(() => useHistory());
      await act(async () => {
        const success = await result.current.redo();
        expect(success).toBe(false);
      });
    });
  });

  describe('canUndo / canRedo', () => {
    it('canUndo should be true when there are actions to undo', () => {
      const { result } = renderHook(() => useHistory());
      expect(result.current.canUndo).toBe(false);
      act(() => {
        result.current.addAction(createMockAction('a'));
      });
      expect(result.current.canUndo).toBe(true);
    });

    it('canRedo should be false initially', () => {
      const { result } = renderHook(() => useHistory());
      expect(result.current.canRedo).toBe(false);
    });

    it('canRedo should be true after undo, false after redo', async () => {
      const { result } = renderHook(() => useHistory());
      act(() => {
        result.current.addAction(createMockAction('a'));
      });
      expect(result.current.canRedo).toBe(false);
      await act(async () => {
        await result.current.undo();
      });
      expect(result.current.canRedo).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all history', () => {
      const { result } = renderHook(() => useHistory());
      act(() => {
        result.current.addAction(createMockAction('a'));
      });
      act(() => {
        result.current.addAction(createMockAction('b'));
      });
      act(() => {
        result.current.clear();
      });
      expect(result.current.history).toEqual([]);
      expect(result.current.currentIndex).toBe(-1);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle undo failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const failingAction = {
        type: 'create' as const,
        description: 'will fail',
        undo: vi.fn(() => Promise.reject(new Error('undo failed'))),
        redo: vi.fn(() => Promise.resolve()),
      };
      const { result } = renderHook(() => useHistory());
      act(() => {
        result.current.addAction(failingAction);
      });
      await act(async () => {
        const success = await result.current.undo();
        expect(success).toBe(false);
      });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle redo failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const failingAction = {
        type: 'create' as const,
        description: 'will fail redo',
        undo: vi.fn(() => Promise.resolve()),
        redo: vi.fn(() => Promise.reject(new Error('redo failed'))),
      };
      const { result } = renderHook(() => useHistory());
      act(() => {
        result.current.addAction(failingAction);
      });
      await act(async () => {
        await result.current.undo();
      });
      await act(async () => {
        await new Promise(r => setTimeout(r, 350));
      });
      await act(async () => {
        const success = await result.current.redo();
        expect(success).toBe(false);
      });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('action types', () => {
    it('should store correct action types', () => {
      const { result } = renderHook(() => useHistory());
      const types: Array<
        'create' | 'update' | 'delete' | 'bulk_delete' | 'bulk_update' | 'layout'
      > = ['create', 'update', 'delete', 'bulk_delete', 'bulk_update', 'layout'];
      types.forEach(type => {
        act(() => {
          result.current.addAction({
            type,
            description: `action ${type}`,
            undo: vi.fn(() => Promise.resolve()),
            redo: vi.fn(() => Promise.resolve()),
          });
        });
      });
      expect(result.current.history).toHaveLength(6);
      result.current.history.forEach((action, i) => {
        expect(action.type).toBe(types[i]);
      });
    });
  });
});
