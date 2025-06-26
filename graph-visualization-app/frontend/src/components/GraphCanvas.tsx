import React, { useEffect, useRef, useState } from 'react';
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
}

const NODE_COLORS: Record<number, string> = {
  1: '#4caf50', // пример: здание
  2: '#2196f3', // пример: человек
  3: '#ff9800', // пример: документ
  // ...добавьте свои типы
};
const NODE_ICONS: Record<number, string> = {
  1: '🏢', // здание
  2: '👤', // человек
  3: '📄', // документ
};
const EDGE_COLORS: string[] = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336'];

const GraphCanvas: React.FC<GraphCanvasProps> = ({ nodes, edges, relationTypes, onSelectNode, onSelectEdge, onNodeAction, onAlign, onMove }) => {
  const container = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; node: GraphObject } | null>(null);

  // Для отладки: выводим nodes в консоль
  React.useEffect(() => {
    console.log('nodes for visualization:', nodes);
  }, [nodes]);

  // Функция кругового выравнивания (демо)
  const alignCircle = () => {
    if (!container.current) return;
    const n = nodes.length;
    const r = 200;
    const cx = container.current.offsetWidth / 2;
    const cy = container.current.offsetHeight / 2;
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / n;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      // vis-network поддерживает moveNode
      if (window.visNetwork) {
        window.visNetwork.moveNode(node.id, x, y);
      }
    });
  };

  useEffect(() => {
    if (!container.current) return;
    let network: any;
    import('vis-network/standalone').then(({ DataSet, Network }) => {
      const visNodes = new DataSet(nodes.map(n => ({
        id: n.id,
        label: `${NODE_ICONS[n.objectTypeId] || ''} ${n.name}`,
        group: String(n.objectTypeId),
        color: {
          background: NODE_COLORS[n.objectTypeId] || '#eee',
          border: '#888',
          highlight: { background: '#fff176', border: '#fbc02d' }
        },
        font: { color: '#222', size: 18, face: 'Segoe UI' },
        shape: 'circle',
        borderWidth: 2
      })));
      const visEdges = new DataSet(edges.map((e, i) => ({
        id: e.id,
        from: e.source,
        to: e.target,
        label: relationTypes.find(rt => rt.id === e.relationTypeId)?.name || '',
        color: {
          color: EDGE_COLORS[e.relationTypeId % EDGE_COLORS.length],
          highlight: '#fbc02d',
          inherit: false
        },
        font: { align: 'top', color: '#666', size: 14 },
        arrows: { to: { enabled: true, scaleFactor: 1.1 } },
        width: 2
      })));
      network = new Network(container.current as HTMLElement, { nodes: visNodes, edges: visEdges }, {
        nodes: { shape: 'circle', size: 32 },
        edges: { arrows: 'to', smooth: true },
        physics: { stabilization: true },
        interaction: { dragNodes: true, dragView: true, multiselect: true },
      });
      window.visNetwork = network;
      network.on('selectNode', (params: { nodes: number[] }) => {
        const node = nodes.find(n => n.id === params.nodes[0]);
        if (node) onSelectNode(node);
      });
      network.on('selectEdge', (params: { edges: number[] }) => {
        const edge = edges.find(e => e.id === params.edges[0]);
        if (edge) onSelectEdge(edge);
      });
      network.on('oncontext', (params: { nodes: number[]; pointer: { DOM: { x: number; y: number } }; event: PointerEvent }) => {
        params.event.preventDefault();
        if (params.nodes.length > 0) {
          const node = nodes.find(n => n.id === params.nodes[0]);
          if (node) {
            setMenu({
              x: params.pointer.DOM.x,
              y: params.pointer.DOM.y,
              node
            });
          }
        } else {
          setMenu(null);
        }
      });
      return () => network && network.destroy();
    });
    return () => { window.visNetwork = undefined; };
  }, [nodes, edges, relationTypes, onSelectNode, onSelectEdge]);

  // Закрытие меню при клике вне
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menu]);

  // Кнопки для выравнивания и перемещения (демо)
  return (
    <div style={{ position: 'relative', flex: 1, width: '100%', height: '100%', background: '#fff' }}>
      <div ref={container} style={{ width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 20, display: 'flex', gap: 8 }}>
        {onAlign && <button onClick={alignCircle} style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>Круг</button>}
        {onMove && <button onClick={() => alert('Выделите и перетащите объекты мышкой (drag-n-drop поддерживается)')} style={{ background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>Переместить</button>}
      </div>
      {menu && (
        <div style={{
          position: 'absolute',
          top: menu.y,
          left: menu.x,
          background: '#fff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          borderRadius: 8,
          zIndex: 10,
          minWidth: 160,
          padding: 4,
          fontFamily: 'Segoe UI',
          animation: 'fadeIn .15s',
        }}>
          <button style={{ display: 'flex', alignItems: 'center', width: '100%', padding: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }} onClick={() => { onNodeAction && onNodeAction('create-relation', menu.node); setMenu(null); }}>
            <span style={{ marginRight: 8 }}>🔗</span>Создать связь
          </button>
          <button style={{ display: 'flex', alignItems: 'center', width: '100%', padding: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }} onClick={() => { onNodeAction && onNodeAction('edit', menu.node); setMenu(null); }}>
            <span style={{ marginRight: 8 }}>✏️</span>Редактировать
          </button>
          <button style={{ display: 'flex', alignItems: 'center', width: '100%', padding: 8, border: 'none', background: 'none', cursor: 'pointer', color: '#f44336', fontSize: 16 }} onClick={() => { onNodeAction && onNodeAction('delete', menu.node); setMenu(null); }}>
            <span style={{ marginRight: 8 }}>🗑️</span>Удалить
          </button>
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .vis-network .vis-selected { box-shadow: 0 0 0 3px #fbc02d !important; }
      `}</style>
    </div>
  );
};

export default GraphCanvas;

// Добавить глобальное объявление для visNetwork
declare global {
  interface Window {
    visNetwork?: any;
  }
}
