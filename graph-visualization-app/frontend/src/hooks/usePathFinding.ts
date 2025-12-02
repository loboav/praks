import { useState, useCallback } from 'react';
import { PathAlgorithm } from '../types/graph';
import { toast } from 'react-toastify';

interface PathResult {
  nodeIds: number[];
  edgeIds: number[];
  totalWeight?: number;
  names?: string[];
  nodesVisited?: number;
  algorithm?: string;
  paths?: Array<{
    nodeIds: number[];
    edgeIds: number[];
    totalWeight: number;
  }>;
  foundK?: number;
}

export const usePathFinding = () => {
  const [path, setPath] = useState<number[]>([]);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [loading, setLoading] = useState(false);

  const findPath = useCallback(async (
    from: number,
    to: number,
    algorithm: PathAlgorithm = 'dijkstra',
    config?: { k?: number; heuristic?: string }
  ) => {
    setLoading(true);
    try {
      let endpoint = '';
      let response;

      switch (algorithm) {
        case 'dijkstra':
          endpoint = `/api/dijkstra-path?fromId=${from}&toId=${to}`;
          response = await fetch(endpoint);
          break;

        case 'astar':
          const heuristic = config?.heuristic || 'euclidean';
          endpoint = `/api/astar-path?fromId=${from}&toId=${to}&heuristic=${heuristic}`;
          response = await fetch(endpoint);
          break;

        case 'bfs':
          endpoint = `/api/find-path?startId=${from}&endId=${to}`;
          response = await fetch(endpoint);
          break;

        case 'k-shortest':
          const k = config?.k || 3;
          endpoint = `/api/k-shortest-paths?fromId=${from}&toId=${to}&k=${k}`;
          response = await fetch(endpoint);
          break;

        case 'all-paths':
          endpoint = `/api/paths?fromId=${from}&toId=${to}`;
          response = await fetch(endpoint);
          break;

        default:
          endpoint = `/api/dijkstra-path?fromId=${from}&toId=${to}`;
          response = await fetch(endpoint);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.reason || 'Path not found');
      }

      const result = await response.json();

      // Обработка результата в зависимости от алгоритма
      if (algorithm === 'all-paths' && Array.isArray(result) && result.length > 0) {
        // Для "Все пути" - показываем все найденные пути
        // result это массив массивов: [[1,2,3], [1,4,3], ...]
        console.log('All paths found:', result);

        // Преобразуем в формат с путями
        const allPaths = result.map((pathIds: number[]) => ({
          nodeIds: pathIds,
          edgeIds: [], // Рёбра можно вычислить позже
          totalWeight: pathIds.length - 1
        }));

        // Показываем первый путь в основной визуализации
        setPath(result[0] || []);
        setPathResult({
          nodeIds: result[0] || [],
          edgeIds: [],
          paths: allPaths,
          foundK: result.length
        });

        toast.success(`Найдено ${result.length} путей! Показан первый.`, {
          autoClose: 3000
        });
      } else if (algorithm === 'k-shortest' && result.paths) {
        // Для K-Shortest Paths показываем первый путь
        setPath(result.paths[0]?.nodeIds || []);
        setPathResult(result);
        toast.success(`Найдено ${result.foundK} путей (${algorithm})`, { autoClose: 2000 });
      } else if (result.nodeIds) {
        setPath(result.nodeIds);
        setPathResult(result);
        const weight = result.totalWeight !== undefined ? ` (вес: ${result.totalWeight})` : '';
        toast.success(`Путь найден${weight} (${algorithm})`, { autoClose: 2000 });
      } else if (Array.isArray(result)) {
        // Legacy BFS формат (массив объектов)
        setPath(result.map((obj: any) => obj.id));
        setPathResult({ nodeIds: result.map((obj: any) => obj.id), edgeIds: [] });
        toast.success(`Путь найден (${algorithm})`, { autoClose: 2000 });
      }

      return result;
    } catch (error: any) {
      console.error('Error finding path:', error);
      setPath([]);
      setPathResult(null);
      toast.error(`Ошибка поиска пути: ${error.message}`, { autoClose: 3000 });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearPath = useCallback(() => {
    setPath([]);
    setPathResult(null);
  }, []);

  return {
    path,
    pathResult,
    loading,
    findPath,
    clearPath,
  };
};
