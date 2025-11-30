import { useCallback, useState } from 'react';

export interface AnalyticsSummary {
  nodeCount: number;
  edgeCount: number;
  density: number;
  diameter: number;
  components: number;
  componentSizes: number[];
}

export interface NodeMetrics {
  nodeId: number;
  inDegree: number;
  outDegree: number;
  degree: number;
  degreeCentrality: number;
  closenessCentrality?: number | null;
  betweennessCentrality?: number | null;
}

export interface PageRankEntry { nodeId: number; score: number; }
export interface Communities { modularity: number; communities: number[][]; }

export const useAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJson = useCallback(async <T,>(url: string): Promise<T> => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return await r.json();
    } catch (e: any) {
      setError(e.message || 'Ошибка запроса');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSummary = useCallback(() => fetchJson<AnalyticsSummary>('/api/analytics/summary'), [fetchJson]);
  const getNodeMetrics = useCallback((closeness = false, betweenness = false) => fetchJson<NodeMetrics[]>(`/api/analytics/node-metrics?closeness=${closeness}&betweenness=${betweenness}`), [fetchJson]);
  const getPageRank = useCallback((iterations = 50, damping = 0.85) => fetchJson<PageRankEntry[]>(`/api/analytics/pagerank?iterations=${iterations}&damping=${damping}`), [fetchJson]);
  const getCommunities = useCallback((passes = 10) => fetchJson<Communities>(`/api/analytics/communities?passes=${passes}`), [fetchJson]);

  return { loading, error, getSummary, getNodeMetrics, getPageRank, getCommunities };
};
