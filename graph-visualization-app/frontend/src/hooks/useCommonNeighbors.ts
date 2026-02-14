import { useState, useCallback } from 'react';
import { GraphObject } from '../types/graph';

interface CommonNeighborResult {
  nodeId: number;
  node: GraphObject;
  totalConnections: number;
  connections: Record<number, number>;
  strength: number;
}

interface CommonNeighborsResponse {
  requestedNodes: number[];
  commonNeighbors: CommonNeighborResult[];
  count: number;
}

interface UseCommonNeighborsReturn {
  results: CommonNeighborsResponse | null;
  loading: boolean;
  error: string | null;
  findCommonNeighbors: (nodeIds: number[]) => Promise<void>;
  clearResults: () => void;
}

/**
 * Хук для поиска общих соседей (Common Neighbors) между узлами
 *
 * @example
 * const { results, loading, findCommonNeighbors } = useCommonNeighbors();
 *
 * // Найти общих знакомых между Ивановым и Петровым
 * await findCommonNeighbors([1, 2]);
 *
 * // results.commonNeighbors - список людей, которые связаны с обоими
 */
export function useCommonNeighbors(): UseCommonNeighborsReturn {
  const [results, setResults] = useState<CommonNeighborsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findCommonNeighbors = useCallback(async (nodeIds: number[]) => {
    if (!nodeIds || nodeIds.length < 2) {
      setError('Нужно выбрать минимум 2 узла');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/common-neighbors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nodeIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: CommonNeighborsResponse = await response.json();
      setResults(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось найти общих соседей';
      setError(message);
      console.error('Error finding common neighbors:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    findCommonNeighbors,
    clearResults,
  };
}
