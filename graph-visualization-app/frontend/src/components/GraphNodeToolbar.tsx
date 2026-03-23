import React from 'react';
import { NodeToolbar, Position } from '@xyflow/react';
import { GraphObject } from '../types/graph';

interface GraphNodeToolbarProps {
  nodeId: string;
  node: GraphObject;
  onAction: (action: string, node: GraphObject) => void;
  selectedNodesCount: number;
}

const GraphNodeToolbar: React.FC<GraphNodeToolbarProps> = ({
  nodeId,
  node,
  onAction,
  selectedNodesCount
}) => {
  const menuBtn: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '8px 16px',
    background: 'none',
    border: 'none',
    textAlign: 'left',
    fontSize: 14,
    cursor: 'pointer',
    color: '#23272f',
    borderBottom: '1px solid #eee',
    whiteSpace: 'nowrap',
    transition: 'background 0.2s'
  };

  const isGroup = node.isCollapsedGroup;

  return (
    <NodeToolbar
      nodeId={nodeId}
      isVisible={true}
      position={Position.Top}
      align="center"
      style={{
        background: '#fff',
        border: '1px solid #ddd',
        borderRadius: 8,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 160
      }}
    >
      {isGroup ? (
        <>
          <button
            style={{ ...menuBtn, color: '#4caf50', fontWeight: 600 }}
            onClick={() => onAction('expand-group', node)}
          >
            🔓 Развернуть ({ (node as any)._collapsedCount || 0 } узлов)
          </button>
          <button style={menuBtn} onClick={() => onAction('select-group-nodes', node)}>
            Выбрать узлы группы
          </button>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
            <button style={{...menuBtn, flex: 1, textAlign: 'center', borderBottom: 'none', fontSize: 18}} onClick={() => onAction('create-relation', node)} title="Создать связь">🔗</button>
            <button style={{...menuBtn, flex: 1, textAlign: 'center', borderBottom: 'none', borderLeft: '1px solid #eee', fontSize: 18}} onClick={() => onAction('expand', node)} title="Раскрыть связи">🪄</button>
            <button style={{...menuBtn, flex: 1, textAlign: 'center', borderBottom: 'none', borderLeft: '1px solid #eee', fontSize: 18}} onClick={() => onAction('find-path', node)} title="Поиск пути">🗺️</button>
          </div>
          <button style={menuBtn} onClick={() => onAction('edit', node)}>
            ✏️ Редактировать
          </button>
          <button style={menuBtn} onClick={() => onAction('hide', node)}>
            👁️‍🗨️ Скрыть
          </button>
          <button
            style={{ ...menuBtn, color: '#f44336' }}
            onClick={() => onAction('delete', node)}
          >
            🗑️ Удалить
          </button>
          {selectedNodesCount >= 2 && (
            <button
              style={{ ...menuBtn, color: '#1976d2', fontWeight: 600 }}
              onClick={() => onAction('group-selected', node)}
            >
              🗂 Сгруппировать ({selectedNodesCount})
            </button>
          )}
        </>
      )}
    </NodeToolbar>
  );
};

export default GraphNodeToolbar;
