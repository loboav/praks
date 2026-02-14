import React from 'react';
import { GraphObject } from '../types/graph';

interface CommonNeighborResult {
  nodeId: number;
  node: GraphObject;
  totalConnections: number;
  connections: Record<number, number>;
  strength: number;
}

interface CommonNeighborsPanelProps {
  requestedNodes: number[];
  commonNeighbors: CommonNeighborResult[];
  allNodes: GraphObject[];
  onClose: () => void;
  onHighlight: (nodeIds: number[]) => void;
  onNodeClick: (nodeId: number) => void;
}

export default function CommonNeighborsPanel({
  requestedNodes,
  commonNeighbors,
  allNodes,
  onClose,
  onHighlight,
  onNodeClick,
}: CommonNeighborsPanelProps) {
  // Находим имена запрошенных узлов
  const getNodeName = (id: number) => {
    const node = allNodes.find(n => n.id === id);
    return node?.name || `Узел ${id}`;
  };

  const getNodeIcon = (id: number) => {
    const node = allNodes.find(n => n.id === id);
    return node?.icon || '🔵';
  };

  const handleHighlightAll = () => {
    const allIds = [...requestedNodes, ...commonNeighbors.map(cn => cn.nodeId)];
    onHighlight(allIds);
  };

  const handleHighlightNeighbor = (neighborId: number) => {
    onHighlight([...requestedNodes, neighborId]);
  };

  return (
    <div style={panelStyle}>
      {/* Заголовок */}
      <div style={headerStyle}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            🔗 Общие знакомые
          </div>
          <div style={{ fontSize: 13, color: '#fff', opacity: 0.9 }}>
            Кто связывает выбранные узлы
          </div>
        </div>
        <button onClick={onClose} style={closeBtnStyle}>
          ✕
        </button>
      </div>

      {/* Запрошенные узлы */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>Выбранные узлы ({requestedNodes.length})</div>
        <div style={nodeListStyle}>
          {requestedNodes.map(nodeId => (
            <div
              key={nodeId}
              style={nodeChipStyle}
              onClick={() => onNodeClick(nodeId)}
              title={`Кликнуть чтобы показать на графе`}
            >
              <span style={{ fontSize: 16 }}>{getNodeIcon(nodeId)}</span>
              <span style={{ fontWeight: 500 }}>{getNodeName(nodeId)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Статистика */}
      {commonNeighbors.length > 0 && (
        <div style={statsStyle}>
          <div style={statItemStyle}>
            <span style={{ fontSize: 20 }}>👥</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 18 }}>
                {commonNeighbors.length}
              </div>
              <div style={{ fontSize: 11, color: '#666' }}>Общих знакомых</div>
            </div>
          </div>
          <button onClick={handleHighlightAll} style={highlightAllBtnStyle}>
            💡 Показать всех на графе
          </button>
        </div>
      )}

      {/* Результаты */}
      <div style={resultsContainerStyle}>
        {commonNeighbors.length === 0 ? (
          <div style={emptyStateStyle}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              Нет общих соседей
            </div>
            <div style={{ fontSize: 13, color: '#666' }}>
              Выбранные узлы не имеют общих связей
            </div>
          </div>
        ) : (
          <>
            <div style={sectionHeaderStyle}>
              Посредники (сортировка по важности)
            </div>
            <div style={listStyle}>
              {commonNeighbors.map((result, index) => {
                const strengthPercent = Math.round(result.strength * 100);
                const barColor =
                  strengthPercent >= 80
                    ? '#4caf50'
                    : strengthPercent >= 50
                      ? '#ff9800'
                      : '#2196f3';

                return (
                  <div
                    key={result.nodeId}
                    style={resultItemStyle}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#f5f5f5';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    {/* Номер и иконка */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                      <div style={rankBadgeStyle}>{index + 1}</div>
                      <div
                        style={{ fontSize: 24, cursor: 'pointer' }}
                        onClick={() => onNodeClick(result.nodeId)}
                      >
                        {result.node.icon || '👤'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            marginBottom: 4,
                            cursor: 'pointer',
                          }}
                          onClick={() => onNodeClick(result.nodeId)}
                        >
                          {result.node.name}
                        </div>

                        {/* Прогресс бар силы связи */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={progressBarBgStyle}>
                            <div
                              style={{
                                ...progressBarFillStyle,
                                width: `${strengthPercent}%`,
                                background: barColor,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 11, color: '#666', minWidth: 35 }}>
                            {strengthPercent}%
                          </span>
                        </div>

                        {/* Детали связей */}
                        <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                          {result.totalConnections} связ{result.totalConnections === 1 ? 'ь' : result.totalConnections < 5 ? 'и' : 'ей'} с выбранными узлами
                        </div>
                      </div>
                    </div>

                    {/* Кнопка подсветки */}
                    <button
                      onClick={() => handleHighlightNeighbor(result.nodeId)}
                      style={highlightBtnStyle}
                      title="Показать на графе"
                    >
                      🎯
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Подсказка */}
      {commonNeighbors.length > 0 && (
        <div style={hintStyle}>
          💡 <strong>Подсказка:</strong> Чем выше процент, тем сильнее узел связывает
          выбранные объекты
        </div>
      )}
    </div>
  );
}

// Стили
const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: 80,
  right: 16,
  width: 420,
  maxHeight: 'calc(100vh - 160px)',
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  overflow: 'hidden',
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: 20,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#fff',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.2)',
  border: 'none',
  color: '#fff',
  width: 32,
  height: 32,
  borderRadius: '50%',
  cursor: 'pointer',
  fontSize: 16,
  fontWeight: 700,
  transition: 'all 0.2s',
};

const sectionStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid #f0f0f0',
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#666',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 12,
};

const nodeListStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
};

const nodeChipStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  background: '#e3f2fd',
  borderRadius: 20,
  fontSize: 13,
  cursor: 'pointer',
  transition: 'all 0.2s',
  border: '1px solid #90caf9',
};

const statsStyle: React.CSSProperties = {
  padding: '16px 20px',
  background: '#fafafa',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid #f0f0f0',
};

const statItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const highlightAllBtnStyle: React.CSSProperties = {
  background: '#4caf50',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const resultsContainerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  minHeight: 200,
};

const emptyStateStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '60px 20px',
  textAlign: 'center',
};

const listStyle: React.CSSProperties = {
  padding: '12px 20px',
};

const resultItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '16px 12px',
  marginBottom: 12,
  background: '#fff',
  borderRadius: 12,
  border: '1px solid #e0e0e0',
  transition: 'all 0.2s',
  cursor: 'default',
};

const rankBadgeStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: 14,
  flexShrink: 0,
};

const progressBarBgStyle: React.CSSProperties = {
  flex: 1,
  height: 6,
  background: '#e0e0e0',
  borderRadius: 3,
  overflow: 'hidden',
};

const progressBarFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: 3,
  transition: 'width 0.3s ease',
};

const highlightBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '2px solid #e0e0e0',
  borderRadius: 8,
  width: 40,
  height: 40,
  cursor: 'pointer',
  fontSize: 18,
  transition: 'all 0.2s',
  flexShrink: 0,
};

const hintStyle: React.CSSProperties = {
  padding: '12px 20px',
  background: '#fff3e0',
  borderTop: '1px solid #ffe0b2',
  fontSize: 12,
  color: '#e65100',
  lineHeight: 1.5,
};
