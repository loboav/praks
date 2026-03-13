import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

// Компонент для отображения сгруппированного узла (мета-узла)
// Стиль Linkurious: серый пунктирный круг + бейдж с количеством + иконка категории
const GroupNode = memo(({ data, selected }: NodeProps) => {
  // data: { label, count, color, icon, orig, nodeNames, edgeCount, isMixed }
  const count = data.count || 1;
  const color = data.color || '#9e9e9e';
  const icon = data.icon || '📦';
  const label = data.label || 'Group';
  const nodeNames = data.nodeNames || [];
  const edgeCount = data.edgeCount || 0;
  const isMixed = data.isMixed || false;

  // Генерируем tooltip с именами узлов (первые 5)
  const tooltipContent =
    nodeNames.length > 0
      ? `${nodeNames.slice(0, 5).join('\n')}${nodeNames.length > 5 ? `\n... и ещё ${nodeNames.length - 5}` : ''}`
      : label;

  // Смешанный градиент для разных категорий
  const backgroundStyle = isMixed
    ? 'linear-gradient(135deg, #9e9e9e 0%, #757575 25%, #616161 50%, #424242 75%, #212121 100%)'
    : color;

  // Иконка для смешанных групп
  const displayIcon = isMixed ? '📦' : icon;

  // Динамический размер: растёт с количеством узлов
  const size = Math.min(140, Math.max(70, 50 + count * 4));
  const innerSize = Math.round(size * 0.65);
  const iconSize = Math.round(size * 0.3);

  return (
    <div style={{ position: 'relative' }} title={tooltipContent}>
      {/* Handles для соединений (невидимые, но нужны для ReactFlow) */}
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />

      {/* Основной контейнер группы */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          // Внешняя граница: сплошная серая (как в Linkurious)
          border: '3px solid #e0e0e0',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        {/* Внутренний круг с цветом категории (или градиентом для смешанных) */}
        <div
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: '50%',
            background: isMixed ? backgroundStyle : color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: iconSize,
            color: '#fff',
            border: isMixed ? '2px solid #fff' : 'none',
          }}
        >
          {displayIcon}
        </div>

        {/* Бейдж с количеством узлов (правый верхний угол) */}
        {count > 1 && (
          <div
            style={{
              position: 'absolute',
              top: -5,
              right: -5,
              background: '#ff5722',
              color: 'white',
              borderRadius: 14,
              padding: '3px 9px',
              fontSize: 13,
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              border: '2px solid white',
              zIndex: 10,
              minWidth: 28,
              textAlign: 'center',
            }}
          >
            ×{count}
          </div>
        )}

        {/* Бейдж с количеством связей (левый верхний угол) */}
        {edgeCount > 0 && (
          <div
            style={{
              position: 'absolute',
              top: -5,
              left: -5,
              background: '#2196f3',
              color: 'white',
              borderRadius: 14,
              padding: '3px 9px',
              fontSize: 11,
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              border: '2px solid white',
              zIndex: 10,
              minWidth: 28,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            🔗{edgeCount}
          </div>
        )}

        {/* Индикатор смешанных категорий (нижний правый угол) */}
        {isMixed && (
          <div
            style={{
              position: 'absolute',
              bottom: -5,
              right: -5,
              background: '#ffc107',
              color: '#333',
              borderRadius: '50%',
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              border: '2px solid white',
              zIndex: 10,
            }}
            title="Смешанные категории"
          >
            ⚡
          </div>
        )}
      </div>

      {/* Подпись снизу */}
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: 8,
          fontSize: 13,
          fontWeight: 600,
          color: '#333',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          background: 'rgba(255,255,255,0.95)',
          padding: '4px 10px',
          borderRadius: 6,
          pointerEvents: 'none',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          maxWidth: 200,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </div>

      {/* Tooltip при наведении (показывает имена узлов) */}
      {nodeNames.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '110%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: 35,
            background: 'rgba(0,0,0,0.85)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 12,
            whiteSpace: 'pre-line',
            zIndex: 1000,
            minWidth: 180,
            maxWidth: 280,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            opacity: 0,
            transition: 'opacity 0.2s ease',
            lineHeight: 1.4,
          }}
          className="group-node-tooltip"
        >
          <div
            style={{
              fontWeight: 600,
              marginBottom: 6,
              borderBottom: '1px solid rgba(255,255,255,0.3)',
              paddingBottom: 4,
            }}
          >
            Узлы в группе ({count}):
          </div>
          {tooltipContent}
        </div>
      )}

      <style>{`
                .group-node-tooltip {
                    opacity: 0;
                }
                div:hover > .group-node-tooltip {
                    opacity: 1;
                }
                /* Скрыть стандартную рамку выделения ReactFlow */
                .react-flow__node-group.selected {
                    box-shadow: none !important;
                }
                .react-flow__node-group {
                  border: none !important;
                  background: transparent !important;
                }
            `}</style>
    </div>
  );
});

GroupNode.displayName = 'GroupNode';

export default GroupNode;
