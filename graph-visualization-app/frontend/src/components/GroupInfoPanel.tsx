import React, { useMemo, useState } from 'react';
import { GraphObject, ObjectType } from '../types/graph';
import { NodeGroup, GroupStats } from '../hooks/useNodeGrouping';

interface GroupInfoPanelProps {
  groupNode: GraphObject;
  nodesInGroup: GraphObject[];
  objectTypes: ObjectType[];
  group: NodeGroup;
  stats: GroupStats;
  onNodeClick: (node: GraphObject) => void;
  onExpandGroup: () => void;
  onClose: () => void;
}

type Tab = 'nodes' | 'properties';

export default function GroupInfoPanel({
  groupNode,
  nodesInGroup,
  objectTypes,
  group,
  stats,
  onNodeClick,
  onExpandGroup,
  onClose,
}: GroupInfoPanelProps) {
  const [tab, setTab] = useState<Tab>('properties');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const getTypeName = (typeId: number) =>
    objectTypes.find(t => t.id === typeId)?.name ?? `Тип ${typeId}`;

  const typeStats = useMemo(
    () =>
      nodesInGroup.reduce<Record<string, number>>((acc, n) => {
        const name = getTypeName(n.objectTypeId);
        acc[name] = (acc[name] ?? 0) + 1;
        return acc;
      }, {}),
    [nodesInGroup, objectTypes]
  );

  const isManual = group.mode === 'manual';

  const fmt = (n: number) =>
    Number.isInteger(n)
      ? n.toLocaleString('ru-RU')
      : n.toLocaleString('ru-RU', { maximumFractionDigits: 3 });

  return (
    <div style={panelStyle}>
      {/* ── Заголовок ─────────────────────────────────────────── */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: isManual ? (groupNode.color ?? '#607d8b') : 'rgba(255,255,255,0.25)',
              border: '2px dashed rgba(255,255,255,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            {groupNode.icon ?? '📦'}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>
              {group.mode === 'manual' ? group.propertyValue : `"${group.propertyValue}"`}
            </div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
              {isManual ? 'Произвольная группа' : 'Группа по свойству'} · {nodesInGroup.length}{' '}
              узлов
            </div>
          </div>
        </div>
        <button onClick={onClose} style={closeBtnStyle} title="Закрыть">
          ✕
        </button>
      </div>

      {/* ── Тип-статистика ────────────────────────────────────── */}
      <div style={typeRowStyle}>
        {Object.entries(typeStats).map(([name, count]) => (
          <div key={name} style={typeBadgeStyle}>
            <span style={{ fontWeight: 600 }}>{name}</span>
            <span style={typeBadgeCountStyle}>×{count}</span>
          </div>
        ))}
      </div>

      {/* ── Кнопка развернуть ────────────────────────────────── */}
      <button onClick={onExpandGroup} style={expandBtnStyle}>
        🔓 Развернуть группу
      </button>

      {/* ── Вкладки ──────────────────────────────────────────── */}
      <div style={tabRowStyle}>
        <button
          style={{ ...tabBtnStyle, ...(tab === 'properties' ? tabActiveSt : {}) }}
          onClick={() => setTab('properties')}
        >
          Свойства
        </button>
        <button
          style={{ ...tabBtnStyle, ...(tab === 'nodes' ? tabActiveSt : {}) }}
          onClick={() => setTab('nodes')}
        >
          Узлы ({nodesInGroup.length})
        </button>
      </div>

      {/* ── Содержимое ───────────────────────────────────────── */}
      <div style={bodyStyle}>
        {/* ВКЛАДКА СВОЙСТВА */}
        {tab === 'properties' && (
          <>
            {stats.numericStats.length === 0 &&
              stats.dateStats.length === 0 &&
              stats.stringDists.length === 0 && (
                <div style={emptyStyle}>
                  Нет общих свойств для агрегации.
                  <br />
                  Перейдите на вкладку «Узлы» для просмотра отдельных объектов.
                </div>
              )}

            {/* ── Числовые свойства ─────────────────────────── */}
            {stats.numericStats.length > 0 && (
              <SectionBlock title="🔢 Числовые свойства">
                {stats.numericStats.map(s => (
                  <div key={s.key} style={propBlockStyle}>
                    <div
                      style={propKeyRowStyle}
                      onClick={() => setExpandedKey(expandedKey === s.key ? null : s.key)}
                    >
                      <span style={propKeyStyle}>{s.key}</span>
                      <span style={propCountBadge}>{s.count} знач.</span>
                      <span style={chevronStyle}>{expandedKey === s.key ? '▲' : '▼'}</span>
                    </div>

                    {/* Краткая строка: Sum */}
                    <div style={summaryRowStyle}>
                      <StatChip label="Сумма" value={fmt(s.sum)} color="#1976d2" />
                      <StatChip label="Среднее" value={fmt(s.avg)} color="#388e3c" />
                    </div>

                    {expandedKey === s.key && (
                      <div style={expandedGridStyle}>
                        <StatCell label="Минимум" value={fmt(s.min)} />
                        <StatCell label="Максимум" value={fmt(s.max)} />
                        <StatCell label="Кол-во" value={String(s.count)} />
                      </div>
                    )}

                    {/* Мини-бар: доля от суммы */}
                    <div style={miniBarBgStyle}>
                      <div
                        style={{
                          ...miniBarFillStyle,
                          width: `${Math.min(100, (s.avg / s.max) * 100)}%`,
                          background: '#1976d2',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </SectionBlock>
            )}

            {/* ── Даты ──────────────────────────────────────── */}
            {stats.dateStats.length > 0 && (
              <SectionBlock title="📅 Даты">
                {stats.dateStats.map(s => (
                  <div key={s.key} style={propBlockStyle}>
                    <div style={propKeyRowStyle}>
                      <span style={propKeyStyle}>{s.key}</span>
                      <span style={propCountBadge}>{s.count} знач.</span>
                    </div>
                    <div style={summaryRowStyle}>
                      <StatChip label="Первая" value={s.first} color="#0288d1" />
                      <StatChip label="Последняя" value={s.last} color="#7b1fa2" />
                    </div>
                  </div>
                ))}
              </SectionBlock>
            )}

            {/* ── Строки / Перечисления ─────────────────────── */}
            {stats.stringDists.length > 0 && (
              <SectionBlock title="🔠 Строковые свойства">
                {stats.stringDists.map(s => {
                  const sorted = Object.entries(s.distribution).sort((a, b) => b[1] - a[1]);
                  const top = sorted.slice(0, 5);
                  const rest = sorted.length - top.length;
                  const total = s.totalCount;

                  return (
                    <div key={s.key} style={propBlockStyle}>
                      <div
                        style={propKeyRowStyle}
                        onClick={() => setExpandedKey(expandedKey === s.key ? null : s.key)}
                      >
                        <span style={propKeyStyle}>{s.key}</span>
                        <span style={propCountBadge}>{sorted.length} уник.</span>
                        <span style={chevronStyle}>{expandedKey === s.key ? '▲' : '▼'}</span>
                      </div>

                      <div style={{ marginTop: 6 }}>
                        {(expandedKey === s.key ? sorted : top).map(([val, cnt]) => (
                          <div key={val} style={distRowStyle}>
                            <div style={distBarBgStyle}>
                              <div
                                style={{
                                  ...distBarFillStyle,
                                  width: `${(cnt / total) * 100}%`,
                                }}
                              />
                            </div>
                            <span style={distLabelStyle} title={val}>
                              {val.length > 22 ? val.slice(0, 22) + '…' : val}
                            </span>
                            <span style={distCountStyle}>
                              {cnt}
                              <span style={{ color: '#aaa', fontSize: 10, marginLeft: 2 }}>
                                ({Math.round((cnt / total) * 100)}%)
                              </span>
                            </span>
                          </div>
                        ))}
                        {expandedKey !== s.key && rest > 0 && (
                          <div
                            style={{ fontSize: 11, color: '#999', paddingLeft: 4, marginTop: 2 }}
                          >
                            ещё {rest} значений…
                          </div>
                        )}
                        {s.missingCount > 0 && (
                          <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
                            Нет значения: {s.missingCount} узл.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </SectionBlock>
            )}
          </>
        )}

        {/* ВКЛАДКА УЗЛЫ */}
        {tab === 'nodes' && (
          <div>
            {nodesInGroup.map(node => (
              <div
                key={node.id}
                onClick={() => onNodeClick(node)}
                style={nodeItemStyle}
                onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: node.color ?? '#9e9e9e',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 500,
                      fontSize: 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {node.icon ? `${node.icon} ` : ''}
                    {node.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                    {getTypeName(node.objectTypeId)}
                  </div>
                </div>
                <span style={{ color: '#bbb', fontSize: 16 }}>›</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Вспомогательные компоненты ───────────────────────────────────────────────

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={sectionTitleStyle}>{title}</div>
      {children}
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ ...chipStyle, borderColor: color + '44', background: color + '11' }}>
      <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={statCellStyle}>
      <div style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{value}</div>
    </div>
  );
}

// ─── Стили ────────────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 70,
  right: 16,
  width: 320,
  maxHeight: 'calc(100vh - 100px)',
  background: '#fff',
  borderRadius: 14,
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  overflow: 'hidden',
  zIndex: 100,
  display: 'flex',
  flexDirection: 'column',
  fontFamily: 'Segoe UI, system-ui, sans-serif',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '14px 16px',
  background: 'linear-gradient(135deg, #37474f 0%, #263238 100%)',
  color: '#fff',
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

const typeRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  padding: '10px 14px',
  background: '#f8f9fa',
  borderBottom: '1px solid #eee',
  flexShrink: 0,
};

const typeBadgeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 20,
  padding: '3px 10px',
  fontSize: 12,
};

const typeBadgeCountStyle: React.CSSProperties = {
  background: '#e3f2fd',
  color: '#1565c0',
  borderRadius: 10,
  padding: '1px 6px',
  fontWeight: 700,
  fontSize: 11,
};

const expandBtnStyle: React.CSSProperties = {
  margin: '10px 14px',
  padding: '9px 0',
  background: 'linear-gradient(90deg, #43a047, #66bb6a)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  width: 'calc(100% - 28px)',
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
  fontSize: 13,
  cursor: 'pointer',
  color: '#777',
  fontWeight: 500,
  transition: 'all 0.15s',
};

const tabActiveSt: React.CSSProperties = {
  color: '#1976d2',
  borderBottom: '2px solid #1976d2',
  fontWeight: 700,
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '10px 0',
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

const propKeyStyle: React.CSSProperties = {
  flex: 1,
  fontWeight: 600,
  fontSize: 13,
  color: '#333',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const propCountBadge: React.CSSProperties = {
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

const summaryRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 6,
};

const chipStyle: React.CSSProperties = {
  flex: 1,
  border: '1px solid',
  borderRadius: 8,
  padding: '5px 8px',
  minWidth: 0,
};

const expandedGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 6,
  marginBottom: 6,
};

const statCellStyle: React.CSSProperties = {
  background: '#f8f9fa',
  borderRadius: 6,
  padding: '5px 8px',
  textAlign: 'center',
};

const miniBarBgStyle: React.CSSProperties = {
  height: 3,
  background: '#eee',
  borderRadius: 4,
  overflow: 'hidden',
};

const miniBarFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: 4,
  transition: 'width 0.3s ease',
};

const distRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto auto',
  alignItems: 'center',
  gap: 6,
  marginBottom: 5,
};

const distBarBgStyle: React.CSSProperties = {
  height: 6,
  background: '#eee',
  borderRadius: 3,
  overflow: 'hidden',
};

const distBarFillStyle: React.CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg, #42a5f5, #1976d2)',
  borderRadius: 3,
};

const distLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#333',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
};

const distCountStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#555',
  whiteSpace: 'nowrap',
};

const nodeItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  padding: '9px 14px',
  cursor: 'pointer',
  transition: 'background 0.15s',
  borderBottom: '1px solid #f8f8f8',
};
