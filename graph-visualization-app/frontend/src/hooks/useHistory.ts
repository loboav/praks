import { useState, useCallback, useRef } from 'react';

export interface HistoryAction {
  id: string;
  type: 'create' | 'update' | 'delete' | 'bulk_delete' | 'bulk_update' | 'layout';
  description: string;
  timestamp: number;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

interface UseHistoryOptions {
  maxSize?: number;
}

export function useHistory(options: UseHistoryOptions = {}) {
  const { maxSize = 20 } = options;
  
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const isUndoingRef = useRef(false);
  const isProcessingRef = useRef(false);

  const addAction = useCallback((action: Omit<HistoryAction, 'id' | 'timestamp'>) => {
    if (isUndoingRef.current) return;

    const newAction: HistoryAction = {
      ...action,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };

    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(newAction);
      
      if (newHistory.length > maxSize) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });

    setCurrentIndex(prev => {
      const newIndex = prev + 1;
      return newIndex >= maxSize ? maxSize - 1 : newIndex;
    });
  }, [currentIndex, maxSize]);

  const undo = useCallback(async () => {
    if (currentIndex < 0 || isProcessingRef.current) return false;

    isProcessingRef.current = true;
    isUndoingRef.current = true;
    const action = history[currentIndex];
    
    try {
      await action.undo();
      setCurrentIndex(prev => prev - 1);
      return true;
    } catch (error) {
      console.error('Undo failed:', error);
      return false;
    } finally {
      isUndoingRef.current = false;
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 300);
    }
  }, [currentIndex, history]);

  const redo = useCallback(async () => {
    if (currentIndex >= history.length - 1 || isProcessingRef.current) return false;

    isProcessingRef.current = true;
    isUndoingRef.current = true;
    const action = history[currentIndex + 1];
    
    try {
      await action.redo();
      setCurrentIndex(prev => prev + 1);
      return true;
    } catch (error) {
      console.error('Redo failed:', error);
      return false;
    } finally {
      isUndoingRef.current = false;
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 300);
    }
  }, [currentIndex, history]);

  const clear = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  const canUndo = currentIndex >= 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    history,
    currentIndex,
    addAction,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
  };
}
