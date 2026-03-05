import React, { useState } from 'react';
import { RelationType } from '../types/graph';
import { AggregatedEdge, EdgeNumericStat, EdgeDateStat } from '../hooks/useEdgeGrouping';

interface AggregatedEdgeCardProps {
  edge: AggregatedEdge;
  relationTypes: RelationType[];
  onClose: () => void;
}

type Tab = 'stats' | 'edges';

export default function AggregatedEdgeCard({
  edge,
  relationTypes,
  onClose,
}: AggregatedEdgeCardProps) {
  const [tab, setTab] = useState<Tab>('stats');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const typeName =
    relationTypes.find(rt => rt.id === edge.relationTypeId)?.name ?? `Тип ${edge.relationTypeId}`;

  const fmt = (n: number) =>
    Number.isInteger(n)
      ? n.toLocaleString('ru-RU')
      : n.toLocaleString('ru-RU', { maximumFractionDigits: 3 });

  const hasStats = edge._numericStats.length > 0 || edge._dateStats.length > 0;

  return (
    <div style={cardStyle}>
      {/* ── Header ─────────────────────────────────────── */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Edge icon */}
          <div style={edgeIconStyle}>
            <span style={{ fontSize: 16 }}>⛓</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{typeName}</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
              Агрегировано: {edge._aggregatedEdgeCount} рёбер
            </div>
          </div>
        </div>
        <button onClick={onClose} style={closeBtnStyle} title="Закрыть">
          ✕
        </button>
      </div>

      {/* ── Route info ─────────────────────────────────── */}
      <div style={routeRowStyle}>
        <span style={routeNodeStyle}>{edge.source}</span>
        <span style={arrowStyle}>→</span>
        <span style={routeNodeStyle}>{edge.target}</span>
        <span style={countBadgeStyle}>×{edge._aggregatedEdgeCount}</span>
      </div>

      {/* Invalid props warning */}
      {edge._hasInvalidProps && (
        <div style={warnStyle}>
          ⚠ Часть значений не подходит для агрегации (неверный тип данных)
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────── */}
      <div style={tabRowStyle}>
        <button
          style={{ ...tabBtnStyle, ...(tab === 'stats' ? tabActiveStyle : {}) }}
          onClick={() => setTab('stats')}
        >
          Статистика
        </button>
        <button
          style={{ ...tabBtnStyle, ...(tab === 'edges' ? tabActiveStyle : {}) }}
          onClick={() => setTab('edges')}
        >
          ID рёбер ({edge._originalEdgeIds.length})
        </button>
      </div>

      {/* ── Body ───────────────────────────────────────── */}
      <div style={bodyStyle}>
        {/* STATS TAB */}
        {tab === 'stats' && (
          <>
            {!hasStats && (
              <div style={emptyStyle}>
                {edge._aggregatedEdgeCount > 1
                  ? 'Нет числовых или датовых свойств для агрегации'
                  : 'Нет данных'}
              </div>
            )}

            {/* ── Числовые свойства ─────────────────── */}
            {edge._numericStats.length > 0 && (
              <>
                <div style={sectionTitleStyle}>🔢 Числовые свойства</div>
                {edge._numericStats.map(s => (
                  <NumericBlock
                    key={s.key}
                    stat={s}
                    expanded={expandedKey === s.key}
                    onToggle={() => setExpandedKey(expandedKey === s.key ? null : s.key)}
                    fmt={fmt}
                  />
                ))}
              </>
            )}

            {/* ── Датовые свойства ─────────────────── */}
            {edge._dateStats.length > 0 && (
              <>
                <div style={sectionTitleStyle}>📅 Даты</div>
                {edge._dateStats.map(s => (
                  <DateBlock key={s.key} stat={s} />
                ))}
              </>
            )}
          </>
        )}

        {/* EDGES TAB */}
        {tab === 'edges' && (
          <div style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
              Исходные рёбра, схлопнутые в эту группу:
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
              {edge._originalEdgeIds.map(id => (
                <span key={id} style={edgeIdBadgeStyle}>
                  #{id}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Вспомогательные компоненты ──────────────────────────────────────────────

function NumericBlock({
  stat,
  expanded,
  onToggle,
  fmt,
}: {
  stat: EdgeNumericStat;
  expanded: boolean;
  onToggle: () => void;
  fmt: (n: number) => string;
}) {
  const barWidth = stat.max !== 0 ? Math.min(100, (stat.avg / stat.max) * 100) : 0;

  return (
    <div style={propBlockStyle}>
      {/* Key row */}
      <div style={propKeyRowStyle} onClick={onToggle}>
        <span style={propKeyLabelStyle}>{stat.key}</span>
        <span style={validCountStyle}>{stat.count} знач.</span>
        <span style={chevronStyle}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Top chips: Sum + Avg */}
      <div style={chipsRowStyle}>
        <Chip label="СУММА" value={fmt(stat.sum)} color="#1565c0" />
        <Chip label="СРЕДНЕЕ" value={fmt(stat.avg)} color="#2e7d32" />
      </div>

      {/* Expanded: Min + Max + Count */}
      {expanded && (
        <div style={expandedGridStyle}>
          <StatCell label="Минимум" value={fmt(stat.min)} />
          <StatCell label="Максимум" value={fmt(stat.max)} />
          <StatCell label="Кол-во" value={String(stat.count)} />
        </div>
      )}

      {/* Mini bar: avg vs max */}
      <div style={miniBarBgStyle}>
        <div
          style={{
            height: '100%',
            width: `${barWidth}%`,
            background: 'linear-gradient(90deg, #1976d2, #42a5f5)',
            borderRadius: 3,
            transition: 'width 0.3s',
          }}
        />
      </div>
    </div>
  );
}

function DateBlock({ stat }: { stat: EdgeDateStat }) {
  return (
    <div style={propBlockStyle}>
      <div style={{ ...propKeyRowStyle, cursor: 'default', marginBottom: 8 }}>
        <span style={propKeyLabelStyle}>{stat.key}</span>
        <span style={validCountStyle}>{stat.count} знач.</span>
      </div>
      <div style={chipsRowStyle}>
        <Chip label="ПЕРВАЯ" value={stat.first} color="#0277bd" />
        <Chip label="ПОСЛЕДНЯЯ" value={stat.last} color="#6a1b9a" />
      </div>
    </div>
  );
}

function Chip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        border: `1px solid ${color}33`,
        background: `${color}0d`,
        borderRadius: 8,
        padding: '5px 8px',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: '#888',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: '#f8f9fa',
        borderRadius: 6,
        padding: '5px 8px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{value}</div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  position: 'absolute',
  top: 70,
  left: 16,
  width: 300,
  maxHeight: 'calc(100vh - 100px)',
  background: '#fff',
  borderRadius: 14,
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  overflow: 'hidden',
  zIndex: 101,
  display: 'flex',
  flexDirection: 'column',
  fontFamily: 'Segoe UI, system-ui, sans-serif',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '14px 16px',
  background: 'linear-gradient(135deg, #004d40 0%, #00695c 100%)',
  color: '#fff',
  flexShrink: 0,
};

const edgeIconStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.15)',
  border: '2px dashed rgba(255,255,255,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const closeBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)',
  border: 'none',
  color: '#fff',
  width: 28,
  height: 28,
  borderRadius: '50%',
  cursor: 'pointer',
  fontSize: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const routeRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  background: '#f9f9f9',
  borderBottom: '1px solid #eee',
  flexShrink: 0,
};

const routeNodeStyle: React.CSSProperties = {
  background: '#e3f2fd',
  color: '#1565c0',
  borderRadius: 6,
  padding: '3px 8px',
  fontSize: 12,
  fontWeight: 600,
  maxWidth: 80,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const arrowStyle: React.CSSProperties = {
  color: '#888',
  fontSize: 16,
  flexShrink: 0,
};

const countBadgeStyle: React.CSSProperties = {
  marginLeft: 'auto',
  background: '#ff8f00',
  color: '#fff',
  borderRadius: 12,
  padding: '3px 10px',
  fontSize: 12,
  fontWeight: 700,
  flexShrink: 0,
};

const warnStyle: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: 11,
  color: '#e65100',
  background: '#fff8e1',
  borderBottom: '1px solid #ffe0b2',
  flexShrink: 0,
};

const tabRowStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #eee',
  flexShrink: 0,
};

const tabBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '9px 0',
  border: 'none',
  background: 'transparent',
  fontSize: 12,
  cursor: 'pointer',
  color: '#777',
  fontWeight: 500,
  transition: 'all 0.15s',
};

const tabActiveStyle: React.CSSProperties = {
  color: '#00695c',
  borderBottom: '2px solid #00695c',
  fontWeight: 700,
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  paddingBottom: 8,
};

const emptyStyle: React.CSSProperties = {
  padding: '24px 20px',
  textAlign: 'center',
  color: '#aaa',
  fontSize: 13,
  lineHeight: 1.6,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  padding: '10px 14px 4px',
};

const propBlockStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderBottom: '1px solid #f5f5f5',
};

const propKeyRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  cursor: 'pointer',
  marginBottom: 6,
};

const propKeyLabelStyle: React.CSSProperties = {
  flex: 1,
  fontWeight: 600,
  fontSize: 13,
  color: '#333',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const validCountStyle: React.CSSProperties = {
  fontSize: 10,
  background: '#f0f0f0',
  color: '#666',
  borderRadius: 10,
  padding: '2px 7px',
  whiteSpace: 'nowrap',
};

const chevronStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#aaa',
  flexShrink: 0,
};

const chipsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 6,
};

const expandedGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 6,
  marginBottom: 6,
};

const miniBarBgStyle: React.CSSProperties = {
  height: 3,
  background: '#eee',
  borderRadius: 4,
  overflow: 'hidden',
};

const edgeIdBadgeStyle: React.CSSProperties = {
  background: '#e8eaf6',
  color: '#3949ab',
  borderRadius: 6,
  padding: '3px 8px',
  fontSize: 11,
  fontWeight: 600,
  border: '1px solid #c5cae9',
};
