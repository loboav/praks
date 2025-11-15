import React, { useEffect, useMemo, useState } from 'react';
import { useAnalytics, AnalyticsSummary, NodeMetrics, PageRankEntry, Communities } from '../hooks/useAnalytics';
import { GraphObject } from '../types/graph';

interface AnalyticsDashboardProps {
  nodes?: GraphObject[];
}

export default function AnalyticsDashboard({ nodes = [] }: AnalyticsDashboardProps) {
  const { loading, error, getSummary, getNodeMetrics, getPageRank, getCommunities } = useAnalytics();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [metrics, setMetrics] = useState<NodeMetrics[]>([]);
  const [pr, setPr] = useState<PageRankEntry[]>([]);
  const [comms, setComms] = useState<Communities | null>(null);

  const getNodeName = (nodeId: number) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? node.name : `#${nodeId}`;
  };

  useEffect(() => {
    (async () => {
      const [s, m, p, c] = await Promise.all([
        getSummary(),
        getNodeMetrics(true),
        getPageRank(40, 0.85),
        getCommunities(6)
      ]);
      setSummary(s);
      setMetrics(m);
      setPr(p);
      setComms(c);
    })();
  }, [getSummary, getNodeMetrics, getPageRank, getCommunities]);

  const topDegree = useMemo(() => metrics.slice(0, 10), [metrics]);
  const topPr = useMemo(() => pr.slice(0, 10), [pr]);

  return (
    <div style={{ width: 400, height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', borderLeft: '1px solid #ddd' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #eee', background: '#f9f9f9' }}>
        <h3 style={{ margin: 0 }}>📊 Аналитика графа</h3>
        {loading && <div style={{ fontSize: 12, color: '#888' }}>Загрузка…</div>}
        {error && <div style={{ color: '#c00' }}>Ошибка: {error}</div>}
      </div>

      <div style={{ padding: 16, overflow: 'auto' }}>
        {summary && (
          <>
            <Section title="Общая статистика">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <Tile label="Узлы" value={summary.nodeCount} />
                <Tile label="Связи" value={summary.edgeCount} />
                <Tile label="Плотность" value={(summary.density * 100).toFixed(2) + '%'} />
                <Tile label="Средняя степень" value={(summary.edgeCount * 2 / summary.nodeCount).toFixed(1)} />
              </div>
            </Section>
            
            <Section title="Структура графа">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <Tile label="Диаметр" value={summary.diameter} />
                <Tile label="Компоненты связности" value={summary.components} />
                <Tile label="Наибольшая компонента" value={summary.componentSizes[0] || 0} />
                <Tile label="% в крупн. компоненте" value={((summary.componentSizes[0] || 0) / summary.nodeCount * 100).toFixed(0) + '%'} />
              </div>
            </Section>
          </>
        )}

        <Section title="Наиболее связанные узлы (по степени)">
          {topDegree.map((m) => (
            <BarRow key={m.nodeId} label={getNodeName(m.nodeId)} value={m.degree} max={topDegree[0]?.degree || 1} right={`${m.degree} связей`} />
          ))}
        </Section>

        <Section title="Наиболее важные узлы (PageRank)">
          {topPr.map((e) => (
            <BarRow key={e.nodeId} label={getNodeName(e.nodeId)} value={e.score} max={topPr[0]?.score || 1} right={(e.score * 100).toFixed(2) + '%'} />
          ))}
        </Section>

        {comms && (
          <Section title="Сообщества (кластеры)">
            <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
              Модулярность: <b>{comms.modularity.toFixed(3)}</b> {comms.modularity > 0.3 ? '(хорошая структура)' : '(слабая структура)'}
            </div>
            {comms.communities.slice(0, 6).map((c, i) => (
              <div key={i} style={{ fontSize: 13, color: '#333', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span><b>Кластер {i+1}</b></span>
                <span style={{ color: '#666' }}>{c.length} узлов ({(c.length / (summary?.nodeCount || 1) * 100).toFixed(0)}%)</span>
              </div>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div>{children}</div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 10, textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function BarRow({ label, value, max, right }: { label: string; value: number; max: number; right?: string }) {
  const width = Math.max(2, Math.round((value / (max || 1)) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <div style={{ minWidth: 100, fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</div>
      <div style={{ flex: 1, height: 10, background: '#eee', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: `${width}%`, height: '100%', background: '#2196f3' }} />
      </div>
      <div style={{ width: 80, textAlign: 'right', fontSize: 12, color: '#333', fontWeight: 500 }}>{right ?? value}</div>
    </div>
  );
}
