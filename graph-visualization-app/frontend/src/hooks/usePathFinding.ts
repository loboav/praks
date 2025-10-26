import { useState, useCallback } from 'react';

interface PathResult {
  nodeIds: number[];
  edgeIds: number[];
  totalWeight?: number;
  names?: string[];
}

export const usePathFinding = () => {
  const [path, setPath] = useState<number[]>([]);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);

  const findPath = useCallback(async (from: number, to: number) => {
    try {
      const response = await fetch(`/api/find-path?sourceId=${from}&targetId=${to}`);
      
      if (!response.ok) {
        throw new Error('Path not found');
      }
      
      const result = await response.json();
      setPath(result);
      
      // Если есть более детальная информация о пути
      if (result.nodeIds && result.edgeIds) {
        setPathResult({
          nodeIds: result.nodeIds,
          edgeIds: result.edgeIds,
          totalWeight: result.totalWeight,
          names: result.names,
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error finding path:', error);
      setPath([]);
      setPathResult(null);
      throw error;
    }
  }, []);

  const clearPath = useCallback(() => {
    setPath([]);
    setPathResult(null);
  }, []);

  return {
    path,
    pathResult,
    findPath,
    clearPath,
  };
};
