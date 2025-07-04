import React, { useEffect, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  NodeChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GraphObject, GraphRelation, RelationType } from '../types/graph';

interface GraphCanvasProps {
  nodes: GraphObject[];
  edges: GraphRelation[];
  relationTypes: RelationType[];
  onSelectNode: (node: GraphObject) => void;
  onSelectEdge: (edge: GraphRelation) => void;
  onNodeAction?: (action: string, node: GraphObject) => void;
  onAlign?: () => void;
  onMove?: () => void;
  selectedNodes?: number[];
}

const GraphCanvas: React.FC<GraphCanvasProps> = ({ nodes, edges, relationTypes, onSelectNode, onSelectEdge, onNodeAction, selectedNodes: propsSelectedNodes }) => {
  // Синхронизируем состояние с props.nodes
  const initialRfNodes = nodes.map(node => ({
    id: node.id.toString(),
    data: { label: node.icon ? `${node.icon} ${node.name}` : node.name, orig: node },
    position: {
      x: node.PositionX ?? 400,
      y: node.PositionY ?? 300
    },
    style: {
      border: (propsSelectedNodes && propsSelectedNodes.includes(node.id)) ? '2px solid #f00' : `2px solid ${node.color || '#2196f3'}`,
      borderRadius: 8,
      padding: 8,
      background: '#fff',
      color: node.color || undefined
    },
  }));
  const [rfNodes, setRfNodes, onNodesChange] = require('reactflow').useNodesState(initialRfNodes);

  useEffect(() => {
    setRfNodes(initialRfNodes);
  }, [nodes.length]);

  const rfEdges = edges.map(edge => ({
    id: edge.id.toString(),
    source: edge.source.toString(),
    target: edge.target.toString(),
    label: relationTypes.find(rt => rt.id === edge.relationTypeId)?.name || '',
    style: { stroke: edge.color || '#2196f3', strokeWidth: 2 },
    animated: true,
  }));

  // Контекстное меню
  const [menu, setMenu] = useState<{ x: number; y: number; node: GraphObject } | null>(null);

  // Обработка drag&drop (можно добавить сохранение в БД)
  const handleNodesChange = (changes: NodeChange[]) => {
    onNodesChange(changes);
    // TODO: можно отправить новые координаты на сервер
  };

  // Контекстное меню по правому клику
  const onNodeContextMenu = (event: React.MouseEvent, node: any) => {
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY, node: node.data.orig });
  };

  // Действия из меню
  const handleMenuAction = (action: string) => {
    if (menu && onNodeAction) {
      onNodeAction(action, menu.node);
    }
    setMenu(null);
  };

  // Закрыть меню при клике вне
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menu]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={handleNodesChange}
        onNodeClick={(_, node) => onSelectNode(node.data.orig)}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeClick={(_, edge) => onSelectEdge(edges.find(e => e.id.toString() === edge.id)!)}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
      {menu && (
        <div style={{
          position: 'fixed',
          top: menu.y,
          left: menu.x,
          background: '#fff',
          border: '1px solid #ddd',
          borderRadius: 8,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          zIndex: 1001,
          minWidth: 160
        }}>
          <button style={menuBtn} onClick={() => handleMenuAction('create-relation')}>Создать связь</button>
          <button style={menuBtn} onClick={() => handleMenuAction('edit')}>Редактировать</button>
          <button style={menuBtn} onClick={() => handleMenuAction('delete')}>Удалить</button>
        </div>
      )}
    </div>
  );
};

const menuBtn: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '10px 18px',
  background: 'none',
  border: 'none',
  textAlign: 'left',
  fontSize: 16,
  cursor: 'pointer',
  color: '#23272f',
  borderBottom: '1px solid #eee',
};

export default GraphCanvas;
