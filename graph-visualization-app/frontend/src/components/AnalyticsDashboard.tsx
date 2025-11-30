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

  // Состояния для раскрытия секций
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['summary', 'structure']) // По умолчанию открыты основные секции
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getNodeName = (nodeId: number) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? node.name : `#${nodeId}`;
  };

  useEffect(() => {
    (async () => {
      const [s, m, p, c] = await Promise.all([
        getSummary(),
        getNodeMetrics(true, true),
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
  const topBetweenness = useMemo(() =>
    [...metrics].sort((a, b) => (b.betweennessCentrality || 0) - (a.betweennessCentrality || 0)).slice(0, 10),
    [metrics]);

  // Вычисляем дополнительные метрики
  const avgDegree = summary ? (summary.edgeCount * 2 / Math.max(1, summary.nodeCount)) : 0;
  const avgClustering = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + (m.degreeCentrality || 0), 0) / metrics.length
    : 0;

  return (
    <div style={{ width: 400, height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', borderLeft: '1px solid #ddd' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #eee', background: '#f9f9f9' }}>
        <h3 style={{ margin: 0 }}>📊 Аналитика графа</h3>
        {loading && <div style={{ fontSize: 12, color: '#888' }}>Загрузка…</div>}
        {error && <div style={{ color: '#c00' }}>Ошибка: {error}</div>}
      </div>

      <div style={{ padding: 16, overflow: 'auto', flex: 1 }}>
        {summary && (
          <>
            {/* Общая статистика */}
            <CollapsibleSection
              title="Общая статистика"
              icon="📈"
              isExpanded={expandedSections.has('summary')}
              onToggle={() => toggleSection('summary')}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <TileWithTooltip
                  label="Узлы"
                  value={summary.nodeCount}
                  tooltip="Общее количество узлов (объектов) в графе"
                />
                <TileWithTooltip
                  label="Связи"
                  value={summary.edgeCount}
                  tooltip="Общее количество связей (рёбер) между узлами"
                />
                <TileWithTooltip
                  label="Плотность"
                  value={(summary.density * 100).toFixed(2) + '%'}
                  tooltip="Отношение существующих связей к максимально возможным. Высокая плотность = сильно связанный граф"
                />
                <TileWithTooltip
                  label="Средняя степень"
                  value={avgDegree.toFixed(1)}
                  tooltip="Среднее количество связей на один узел. Показывает общую связность графа"
                />
              </div>
            </CollapsibleSection>

            {/* Структура графа */}
            <CollapsibleSection
              title="Структура графа"
              icon="🔗"
              isExpanded={expandedSections.has('structure')}
              onToggle={() => toggleSection('structure')}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <TileWithTooltip
                  label="Диаметр"
                  value={summary.diameter}
                  tooltip="Максимальное расстояние между любыми двумя узлами. Показывает 'ширину' графа"
                />
                <TileWithTooltip
                  label="Компоненты связности"
                  value={summary.components}
                  tooltip="Количество изолированных подграфов. 1 = весь граф связан, >1 = есть изолированные группы"
                />
                <TileWithTooltip
                  label="Наибольшая компонента"
                  value={summary.componentSizes[0] || 0}
                  tooltip="Размер самой большой связной компоненты (количество узлов)"
                />
                <TileWithTooltip
                  label="% в крупн. компоненте"
                  value={((summary.componentSizes[0] || 0) / summary.nodeCount * 100).toFixed(0) + '%'}
                  tooltip="Процент узлов, находящихся в самой большой связной компоненте"
                />
              </div>
            </CollapsibleSection>

            {/* Топ узлов по связям */}
            <CollapsibleSection
              title="Наиболее связанные узлы"
              icon="⭐"
              count={topDegree.length}
              isExpanded={expandedSections.has('degree')}
              onToggle={() => toggleSection('degree')}
              tooltip="Узлы с наибольшим количеством связей (входящих + исходящих)"
            >
              {topDegree.map((m) => (
                <BarRow
                  key={m.nodeId}
                  label={getNodeName(m.nodeId)}
                  value={m.degree}
                  max={topDegree[0]?.degree || 1}
                  right={`${m.degree} связей`}
                  tooltip={`Входящих: ${m.inDegree}, Исходящих: ${m.outDegree}`}
                />
              ))}
            </CollapsibleSection>

            {/* PageRank */}
            <CollapsibleSection
              title="Наиболее важные узлы (PageRank)"
              icon="🏆"
              count={topPr.length}
              isExpanded={expandedSections.has('pagerank')}
              onToggle={() => toggleSection('pagerank')}
              tooltip="Узлы с наивысшим рейтингом важности по алгоритму PageRank. Учитывает не только количество связей, но и их качество"
            >
              {topPr.map((e) => (
                <BarRow
                  key={e.nodeId}
                  label={getNodeName(e.nodeId)}
                  value={e.score}
                  max={topPr[0]?.score || 1}
                  right={(e.score * 100).toFixed(2) + '%'}
                  tooltip="PageRank показывает относительную важность узла в сети"
                />
              ))}
            </CollapsibleSection>

            {/* Betweenness Centrality */}
            <CollapsibleSection
              title="Центральность по посредничеству"
              icon="🌉"
              count={topBetweenness.length}
              isExpanded={expandedSections.has('betweenness')}
              onToggle={() => toggleSection('betweenness')}
              tooltip="Показывает узлы-мосты, соединяющие разные части графа. Важны для потока информации."
            >
              {topBetweenness.map((m) => (
                <BarRow
                  key={m.nodeId}
                  label={getNodeName(m.nodeId)}
                  value={m.betweennessCentrality || 0}
                  max={topBetweenness[0]?.betweennessCentrality || 1}
                  right={(m.betweennessCentrality || 0).toFixed(4)}
                  tooltip="Высокое значение = узел контролирует потоки между группами"
                />
              ))}
            </CollapsibleSection>

            {/* Сообщества */}
            {comms && (
              <CollapsibleSection
                title="Сообщества (кластеры)"
                icon="👥"
                count={comms.communities.length}
                isExpanded={expandedSections.has('communities')}
                onToggle={() => toggleSection('communities')}
                tooltip="Группы узлов, которые сильно связаны между собой и слабо связаны с другими группами"
              >
                <div style={{ fontSize: 12, color: '#666', marginBottom: 12, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Модулярность:</span>
                    <Tooltip text="Мера качества разбиения на сообщества. >0.3 = хорошая структура, >0.7 = отличная">
                      <b>{comms.modularity.toFixed(3)}</b>
                    </Tooltip>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11, color: '#888' }}>
                    {comms.modularity > 0.7 ? '✅ Отличная структура' :
                      comms.modularity > 0.3 ? '✓ Хорошая структура' :
                        '⚠️ Слабая структура'}
                  </div>
                </div>
                {comms.communities.slice(0, 8).map((c, i) => (
                  <ClusterItem
                    key={i}
                    cluster={c}
                    index={i}
                    totalNodes={summary?.nodeCount || 1}
                    getNodeName={getNodeName}
                  />
                ))}
              </CollapsibleSection>
            )}

            {/* Дополнительные метрики */}
            <CollapsibleSection
              title="Дополнительные метрики"
              icon="📊"
              isExpanded={expandedSections.has('additional')}
              onToggle={() => toggleSection('additional')}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <TileWithTooltip
                  label="Макс. степень"
                  value={metrics[0]?.degree || 0}
                  tooltip="Максимальное количество связей у одного узла"
                />
                <TileWithTooltip
                  label="Мин. степень"
                  value={metrics[metrics.length - 1]?.degree || 0}
                  tooltip="Минимальное количество связей у одного узла"
                />
                <TileWithTooltip
                  label="Изолированных узлов"
                  value={metrics.filter(m => m.degree === 0).length}
                  tooltip="Количество узлов без связей"
                />
                <TileWithTooltip
                  label="Средняя централь."
                  value={avgClustering.toFixed(3)}
                  tooltip="Средняя центральность по степени. Показывает среднюю важность узлов"
                />
              </div>
            </CollapsibleSection>
          </>
        )}
      </div>
    </div>
  );
}

// Компонент раскрывающейся секции
interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  count?: number;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  tooltip?: string;
}

function CollapsibleSection({ title, icon, count, children, isExpanded, onToggle, tooltip }: CollapsibleSectionProps) {
  return (
    <div style={{ marginBottom: 12, border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
      <div
        onClick={onToggle}
        style={{
          padding: '10px 12px',
          background: isExpanded ? '#f5f5f5' : '#fafafa',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          borderBottom: isExpanded ? '1px solid #e0e0e0' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
          <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
          {count !== undefined && (
            <span style={{
              fontSize: 11,
              color: '#666',
              background: '#e8e8e8',
              padding: '2px 6px',
              borderRadius: 10
            }}>
              {count}
            </span>
          )}
          {tooltip && (
            <Tooltip text={tooltip}>
              <span style={{ fontSize: 12, color: '#999', cursor: 'help' }}>ℹ️</span>
            </Tooltip>
          )}
        </div>
        <span style={{ fontSize: 12, color: '#666', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </div>
      {isExpanded && (
        <div style={{ padding: 12 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// Компонент плитки с tooltip
interface TileWithTooltipProps {
  label: string;
  value: React.ReactNode;
  tooltip: string;
}

function TileWithTooltip({ label, value, tooltip }: TileWithTooltipProps) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 10, textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        {label}
        <Tooltip text={tooltip}>
          <span style={{ fontSize: 10, color: '#999', cursor: 'help' }}>ℹ️</span>
        </Tooltip>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}

// Компонент строки с баром и tooltip
interface BarRowProps {
  label: string;
  value: number;
  max: number;
  right?: string;
  tooltip?: string;
}

function BarRow({ label, value, max, right, tooltip }: BarRowProps) {
  const width = Math.max(2, Math.round((value / (max || 1)) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <div
        style={{
          minWidth: 100,
          fontSize: 12,
          color: '#666',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
        title={tooltip || label}
      >
        {label}
      </div>
      <div style={{ flex: 1, height: 10, background: '#eee', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: `${width}%`, height: '100%', background: '#2196f3' }} />
      </div>
      <div style={{ width: 80, textAlign: 'right', fontSize: 12, color: '#333', fontWeight: 500 }}>
        {right ?? value}
      </div>
    </div>
  );
}

// Компонент Tooltip
interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

function Tooltip({ text, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const ref = React.useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    setShow(true);
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPosition({ x: rect.left, y: rect.bottom + 5 });
    }
  };

  return (
    <div
      ref={ref}
      style={{ display: 'inline-block', position: 'relative' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          background: '#333',
          color: '#fff',
          padding: '6px 10px',
          borderRadius: 6,
          fontSize: 12,
          maxWidth: 250,
          zIndex: 10000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          pointerEvents: 'none'
        }}>
          {text}
        </div>
      )}
    </div>
  );
}

interface ClusterItemProps {
  cluster: number[];
  index: number;
  totalNodes: number;
  getNodeName: (id: number) => string;
}

function ClusterItem({ cluster, index, totalNodes, getNodeName }: ClusterItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ marginBottom: 4 }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          fontSize: 13,
          color: '#333',
          display: 'flex',
          justifyContent: 'space-between',
          padding: '6px 8px',
          background: index % 2 === 0 ? '#fafafa' : 'transparent',
          borderRadius: 4,
          cursor: 'pointer',
          userSelect: 'none',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#999', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
          <span><b>Кластер {index + 1}</b></span>
        </div>
        <span style={{ color: '#666', fontSize: 12 }}>
          {cluster.length} узлов ({(cluster.length / totalNodes * 100).toFixed(0)}%)
        </span>
      </div>
      {expanded && (
        <div style={{ paddingLeft: 24, paddingRight: 8, paddingBottom: 8, paddingTop: 4 }}>
          {cluster.map(nodeId => (
            <div key={nodeId} style={{ fontSize: 12, color: '#555', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#ccc', fontSize: 8 }}>●</span>
              {getNodeName(nodeId)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
