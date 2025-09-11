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
  onNodesPositionChange?: (positions: { id: number, x: number, y: number }[]) => void;
}

interface HighlightProps {
  selectedNodes?: number[];
  selectedEdges?: number[];
}

const GraphCanvas: React.FC<GraphCanvasProps & HighlightProps> = ({ nodes, edges, relationTypes, onSelectNode, onSelectEdge, onNodeAction, selectedNodes: propsSelectedNodes, selectedEdges, onNodesPositionChange }) => {
  // Local highlighting for found path
  const [selectedNodesLocal, setSelectedNodesLocal] = useState<number[]>([]);
  const [selectedEdgesLocal, setSelectedEdgesLocal] = useState<number[]>([]);
  const [pathModalOpen, setPathModalOpen] = useState(false);
  const [pathResult, setPathResult] = useState<{ nodeIds: number[]; edgeIds: number[]; totalWeight?: number; names?: string[] } | null>(null);
  const [findMessage, setFindMessage] = useState<string | null>(null);
  const [pathModalPos, setPathModalPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = React.useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Синхронизируем состояние с props.nodes
  const combinedSelectedNodes = (propsSelectedNodes && propsSelectedNodes.length > 0) ? propsSelectedNodes : selectedNodesLocal;

  const initialRfNodes = nodes.map(node => ({
    id: node.id.toString(),
    data: { label: node.icon ? `${node.icon} ${node.name}` : node.name, orig: node },
    position: {
      x: node.PositionX ?? 400,
      y: node.PositionY ?? 300
    },
    style: {
      border: (combinedSelectedNodes && combinedSelectedNodes.includes(node.id)) ? '4px solid #1976d2' : `2px solid ${node.color || '#2196f3'}`,
      borderRadius: 8,
      padding: 8,
      background: '#fff',
      color: node.color || undefined,
      boxShadow: (combinedSelectedNodes && combinedSelectedNodes.includes(node.id)) ? '0 0 0 6px rgba(25,118,210,0.12)' : undefined
    },
  }));
  const [rfNodes, setRfNodes, onNodesChange] = require('reactflow').useNodesState(initialRfNodes);

  useEffect(() => {
    setRfNodes(initialRfNodes);
  }, [nodes, propsSelectedNodes]);
  const combinedSelectedEdges = (selectedEdges && selectedEdges.length > 0) ? selectedEdges : selectedEdgesLocal;

  const rfEdges = edges.map(edge => {
    const isHighlighted = combinedSelectedEdges && combinedSelectedEdges.includes(edge.id);
    return {
      id: edge.id.toString(),
      source: edge.source.toString(),
      target: edge.target.toString(),
      label: relationTypes.find(rt => rt.id === edge.relationTypeId)?.name || '',
      style: {
        // highlighted path -> red and thick, non-animated
        stroke: isHighlighted ? '#d32f2f' : (edge.color || '#2196f3'),
        strokeWidth: isHighlighted ? 8 : 2,
        // when path highlighted, dim other edges to reduce visual noise
        opacity: isHighlighted ? 1 : (combinedSelectedEdges && combinedSelectedEdges.length > 0 ? 0.18 : 1),
        // reduce dash / animation on highlighted path
        strokeDasharray: isHighlighted ? undefined : '6 6'
      },
      // animate only non-highlighted (subtle moving) edges; highlighted path static
      animated: !isHighlighted,
    };
  });


  // Контекстное меню
  const [menu, setMenu] = useState<{ x: number; y: number; node: GraphObject } | null>(null);
  // Fallback state for find-path flow when parent handler doesn't implement it
  const [fallbackFindFirst, setFallbackFindFirst] = useState<number | null>(null);

  // Обработка drag&drop (можно добавить сохранение в БД)
  const handleNodesChange = (changes: NodeChange[]) => {
    onNodesChange(changes);
    // После любого перемещения сообщаем наверх актуальные позиции
    if (typeof onNodesPositionChange === 'function') {
      // rfNodes уже обновлены после onNodesChange
      setTimeout(() => {
        const positions = rfNodes.map((n: any) => ({ id: Number(n.id), x: n.position.x, y: n.position.y }));
        onNodesPositionChange!(positions);
      }, 0);
    }
  };

  // Контекстное меню по правому клику
  const onNodeContextMenu = (event: React.MouseEvent, node: any) => {
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY, node: node.data.orig });
  };

  // Действия из меню
  const handleMenuAction = (action: string) => {
    if (!menu) { setMenu(null); return; }
    // Additional debug: print any global markers and exported handler so we can compare at runtime
    try {
      console.log('GRAPHCANVAS_DBG_LOG_PRESENT_20250905');
      console.log('GraphCanvas: window.__debug_handleNodeAction =', (window as any).__debug_handleNodeAction);
      console.log('GraphCanvas: window.__DBG_MARKER_TOP_GRAPHVIEW =', (window as any).__DBG_MARKER_TOP_GRAPHVIEW);
      if ((window as any).__debug_handleNodeAction && (window as any).__debug_handleNodeAction.toString) {
        console.log('GraphCanvas: window.__debug_handleNodeAction.toString() (head)=', (window as any).__debug_handleNodeAction.toString().slice(0,200));
      }
    } catch (err) { console.warn('GraphCanvas debug read window failed', err); }

    console.log('GraphCanvas: handleMenuAction', action, menu.node);
    console.log('GraphCanvas: typeof onNodeAction =', typeof onNodeAction);

    // Fallback: if action is 'find-path' and parent handler doesn't support it, handle here
    try {
      if (action === 'find-path') {
        const parentStr = onNodeAction && (onNodeAction as any).toString ? (onNodeAction as any).toString() : '';
        const parentHasFind = parentStr.includes('find-path');
        const exportedPresent = !!(window as any).__debug_handleNodeAction;
        if (!parentHasFind && !exportedPresent) {
          // First click: store origin; second click: call backend
          if (!fallbackFindFirst) {
            setFallbackFindFirst(menu.node.id);
            // show compact on-screen message instead of alert
            setFindMessage('Первый узел для поиска пути выбран: ' + (menu.node.name || menu.node.id));
            setTimeout(() => setFindMessage(null), 2200);
            setMenu(null);
            return;
          } else if (fallbackFindFirst && fallbackFindFirst !== menu.node.id) {
            const from = fallbackFindFirst;
            const to = menu.node.id;
            const base = (window as any).__API_BASE || '';
            const url = `${base}/api/dijkstra-path?fromId=${from}&toId=${to}`.replace(/([^:]?)\/\//g, '$1//');
            const tryPrimary = async () => {
              try {
                const r = await fetch(url);
                if (r.status === 404 && !base) {
                  // likely frontend served on :3000 and backend on :5000 — try fallback
                  return null;
                }
                if (!r.ok) { throw new Error('server error ' + r.status); }
                return await r.json();
              } catch (e) {
                return null;
              }
            };
            (async () => {
              let data = await tryPrimary();
              if (!data) {
                // retry against localhost:5000 as fallback
                try {
                  const r2 = await fetch(`http://localhost:5000/api/dijkstra-path?fromId=${from}&toId=${to}`);
                  if (r2.ok) data = await r2.json();
                } catch (e) {}
              }
              if (!data) { setFindMessage('Ошибка при поиске пути на сервере'); setTimeout(() => setFindMessage(null), 2500); setFallbackFindFirst(null); return; }
              if (data && data.nodeIds && data.nodeIds.length) {
                // compute names for nodes
                const names = (data.nodeIds as number[]).map((id: number) => nodes.find(n => n.id === id)?.name || String(id));
                setPathResult({ nodeIds: data.nodeIds, edgeIds: data.edgeIds || [], totalWeight: data.totalWeight, names });
                setSelectedNodesLocal(data.nodeIds);
                setSelectedEdgesLocal(data.edgeIds || []);
                setPathModalOpen(true);
              } else {
                setFindMessage('Путь не найден');
                setTimeout(() => setFindMessage(null), 2200);
              }
              setFallbackFindFirst(null);
            })();
            setMenu(null);
            return;
          }
        }
      }
    } catch (err) { console.warn('GraphCanvas fallback find-path check failed', err); }

    if (onNodeAction && typeof onNodeAction === 'function') {
      try {
        try { console.log('GraphCanvas: onNodeAction.name =', (onNodeAction as any).name); } catch {};
        try { console.log('GraphCanvas: onNodeAction.toString() (truncated) =', onNodeAction.toString ? onNodeAction.toString().slice(0,300) : '[no toString]'); } catch (e) { console.warn('GraphCanvas: could not toString onNodeAction', e); }
        console.log('GraphCanvas: call stack before invoking onNodeAction', new Error().stack);
        const res = onNodeAction(action, menu.node);
        console.log('GraphCanvas: onNodeAction вызван, возвращено:', res);
        console.log('GraphCanvas: call stack after invoking onNodeAction', new Error().stack);
      } catch (err) {
        console.error('GraphCanvas: ошибка при вызове onNodeAction', err);
      }
    } else {
      console.warn('GraphCanvas: onNodeAction не передан');
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
      {/* transient on-screen message */}
      {findMessage && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#323232', color: '#fff', padding: '10px 16px', borderRadius: 8, zIndex: 1200 }}>{findMessage}</div>
      )}

      {/* path details modal */}
      {pathModalOpen && pathResult && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.12)', zIndex: 2000 }}>
          <div
            onMouseDown={(e) => {
              dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pathModalPos?.x ?? window.innerWidth / 2 - 180, origY: pathModalPos?.y ?? window.innerHeight / 2 - 120 };
              e.stopPropagation();
            }}
            onMouseMove={(e) => {
              if (dragRef.current) {
                const dx = e.clientX - dragRef.current.startX;
                const dy = e.clientY - dragRef.current.startY;
                setPathModalPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
                e.stopPropagation();
              }
            }}
            onMouseUp={() => { dragRef.current = null; }}
            style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
          >
            <div style={{ position: 'absolute', left: pathModalPos?.x ?? (window.innerWidth / 2 - 180), top: pathModalPos?.y ?? (window.innerHeight / 2 - 120), background: '#fff', padding: 20, borderRadius: 10, minWidth: 360, maxWidth: '90%', boxShadow: '0 12px 40px rgba(0,0,0,0.28)', cursor: 'move' }}>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>Найденный путь</h3>
              <p style={{ margin: '6px 0 12px 0', color: '#666' }}>Вес: {pathResult.totalWeight ?? 'N/A'}</p>
              <ol style={{ paddingLeft: 18 }}>
                {pathResult.names && pathResult.names.map((n, idx) => <li key={idx} style={{ marginBottom: 6 }}>{n} <small style={{ color: '#999' }}>#{pathResult.nodeIds[idx]}</small></li>)}
              </ol>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button onClick={() => { setPathModalOpen(false); setSelectedNodesLocal([]); setSelectedEdgesLocal([]); setPathResult(null); setPathModalPos(null); }} style={{ background: '#e0e0e0', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' }}>Закрыть</button>
                <button onClick={() => { setPathModalOpen(false); setSelectedNodesLocal([]); setSelectedEdgesLocal([]); setPathResult(null); setPathModalPos(null); }} style={{ background: '#1976d2', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' }}>ОК</button>
              </div>
            </div>
          </div>
        </div>
      )}
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
          <button style={menuBtn} onClick={() => { console.log('GraphCanvas: Нажатие Поиск пути', menu?.node); handleMenuAction('find-path'); }}>Поиск пути</button>
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
