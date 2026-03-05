import React, { useMemo, useState, useEffect } from 'react';
import { RelationType, GraphRelation } from '../types/graph';

interface EdgeGroupingPanelProps {
  relationTypes: RelationType[];
  edges: GraphRelation[];
  enabledTypeIds: Set<number>;
  groupCount: number;
  onToggleType: (typeId: number) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
}

export default function EdgeGroupingPanel({
  relationTypes,
  edges,
  enabledTypeIds,
  groupCount,
  onToggleType,
  onEnableAll,
  onDisableAll,
}: EdgeGroupingPanelProps) {
  // ── Expand/collapse panel ──────────────────────────────────────────────
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebar_edge_grouping_expanded');
    return saved !== null ? saved === 'true' : false;
  });
  useEffect(() => {
    localStorage.setItem('sidebar_edge_grouping_expanded', String(isExpanded));
  }, [isExpanded]);

  // For each relation type, count how many parallel edge groups exist
  const typeStats = useMemo(() => {
    const stats: Record<number, { total: number; parallelGroups: number; parallelEdges: number }> =
      {};

    relationTypes.forEach(rt => {
      // Count total edges of this type
      const typeEdges = edges.filter(e => e.relationTypeId === rt.id);
      const total = typeEdges.length;

      // Group by source::target to find parallel edges
      const buckets = new Map<string, number>();
      typeEdges.forEach(e => {
        const key = `${e.source}::${e.target}`;
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      });

      let parallelGroups = 0;
      let parallelEdges = 0;
      buckets.forEach(count => {
        if (count > 1) {
          parallelGroups++;
          parallelEdges += count;
        }
      });

      stats[rt.id] = { total, parallelGroups, parallelEdges };
    });

    return stats;
  }, [relationTypes, edges]);

  const anyEnabled = enabledTypeIds.size > 0;
  const allEnabled =
    relationTypes.length > 0 && relationTypes.every(rt => enabledTypeIds.has(rt.id));

  return (
    <div>
      {/* ── Section header ──────────────────────────────────────── */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          background: isExpanded ? '#2196f3' : '#fff',
          color: isExpanded ? '#fff' : '#333',
          borderRadius: 6,
          cursor: 'pointer',
          marginBottom: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease',
          userSelect: 'none',
        }}
        onMouseEnter={e => {
          if (!isExpanded) e.currentTarget.style.background = '#f0f0f0';
        }}
        onMouseLeave={e => {
          if (!isExpanded) e.currentTarget.style.background = '#fff';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.2s ease',
              display: 'inline-block',
            }}
          >
            ▼
          </span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Группировка связей</span>
        </div>
        <span
          style={{
            fontSize: 13,
            background: isExpanded ? 'rgba(255,255,255,0.2)' : '#e0e0e0',
            padding: '2px 8px',
            borderRadius: 12,
            fontWeight: 500,
          }}
        >
          {groupCount} / {relationTypes.length}
        </span>
      </div>

      {/* ── Collapsible body ────────────────────────────────────── */}
      <div
        style={{
          maxHeight: isExpanded ? '800px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <div style={containerStyle}>
          {/* ── Description ────────────────────────────────────── */}
          <div style={descStyle}>
            Схлопывает параллельные рёбра одного типа между одной парой узлов в одно
            агрегированное ребро.
          </div>

          {/* ── Bulk actions ───────────────────────────────────── */}
          <div style={bulkRowStyle}>
            <button
              style={{ ...bulkBtnStyle, opacity: allEnabled ? 0.45 : 1 }}
              onClick={onEnableAll}
              disabled={allEnabled}
              title="Включить группировку для всех типов"
            >
              Включить все
            </button>
            <button
              style={{ ...bulkBtnStyle, opacity: anyEnabled ? 1 : 0.45 }}
              onClick={onDisableAll}
              disabled={!anyEnabled}
              title="Отключить группировку для всех типов"
            >
              Выключить все
            </button>
          </div>

          {/* ── List of relation types ─────────────────────────── */}
          <div style={listStyle}>
            {relationTypes.length === 0 && (
              <div style={emptyStyle}>Нет типов связей на графе</div>
            )}

            {relationTypes.map(rt => {
              const st = typeStats[rt.id] ?? { total: 0, parallelGroups: 0, parallelEdges: 0 };
              const enabled = enabledTypeIds.has(rt.id);
              const hasParallel = st.parallelGroups > 0;

              return (
                <div
                  key={rt.id}
                  style={{
                    ...rowStyle,
                    background: enabled ? '#e3f2fd' : '#fff',
                    borderColor: enabled ? '#2196f3' : '#f5f5f5',
                  }}
                >
                  {/* Left: name + stats */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: enabled ? '#1565c0' : '#222',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {rt.name}
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                      {/* Total count */}
                      <span style={statBadgeStyle}>
                        {st.total} рёбер
                      </span>

                      {/* Parallel groups info */}
                      {hasParallel ? (
                        <span
                          style={{
                            ...statBadgeStyle,
                            background: enabled ? '#bbdefb' : '#fff3e0',
                            color: enabled ? '#1565c0' : '#e65100',
                            border: `1px solid ${enabled ? '#90caf9' : '#ffcc80'}`,
                          }}
                        >
                          {st.parallelGroups} параллельных групп
                        </span>
                      ) : (
                        <span style={{ ...statBadgeStyle, color: '#bbb' }}>
                          нет параллельных
                        </span>
                      )}
                    </div>

                    {/* When enabled: show compression info */}
                    {enabled && hasParallel && (
                      <div style={{ fontSize: 11, color: '#2196f3', marginTop: 3 }}>
                        {st.parallelEdges} рёбер → {st.parallelGroups} групп
                      </div>
                    )}
                  </div>

                  {/* Right: toggle */}
                  <button
                    style={{
                      ...toggleBtnStyle,
                      background: enabled ? '#4caf50' : '#e0e0e0',
                      color: enabled ? '#fff' : '#666',
                    }}
                    onClick={() => onToggleType(rt.id)}
                    title={enabled ? 'Отключить группировку' : 'Включить группировку'}
                  >
                    {enabled ? 'ВКЛ' : 'ВЫКЛ'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* ── Footer hint ────────────────────────────────────── */}
          {anyEnabled && (
            <div style={footerHintStyle}>
              💡 Кликните на агрегированное ребро, чтобы увидеть статистику
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  overflow: 'hidden',
};

const descStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 12,
  color: '#666',
  lineHeight: 1.5,
  background: '#f9f9f9',
  borderBottom: '1px solid #f0f0f0',
  flexShrink: 0,
};

const bulkRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  padding: '10px 14px',
  borderBottom: '1px solid #eee',
  flexShrink: 0,
};

const bulkBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '7px 0',
  border: '1px solid #ddd',
  borderRadius: 6,
  background: '#fafafa',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  color: '#333',
  transition: 'background 0.15s',
};

const listStyle: React.CSSProperties = {
  maxHeight: 250,
  overflowY: 'auto',
};

const emptyStyle: React.CSSProperties = {
  padding: '24px 16px',
  textAlign: 'center',
  color: '#aaa',
  fontSize: 13,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 14px',
  borderBottom: '1px solid',
  transition: 'background 0.15s',
};

const statBadgeStyle: React.CSSProperties = {
  fontSize: 10,
  padding: '2px 7px',
  borderRadius: 10,
  background: '#f5f5f5',
  color: '#666',
  border: '1px solid #eee',
  whiteSpace: 'nowrap',
};

const toggleBtnStyle: React.CSSProperties = {
  padding: '3px 8px',
  border: 'none',
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 700,
  cursor: 'pointer',
  flexShrink: 0,
  transition: 'background 0.15s',
  minWidth: 46,
};

const footerHintStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 11,
  color: '#555',
  background: '#f0f8ff',
  borderTop: '1px solid #e3f2fd',
  flexShrink: 0,
};
