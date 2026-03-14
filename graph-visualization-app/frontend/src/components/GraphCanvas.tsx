import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import ReactFlow, { Controls, Background, useNodesState, NodeChange, Node, Edge, MarkerType, ReactFlowInstance } from 'reactflow';
import 'reactflow/dist/style.css';
import { GraphObject, GraphRelation, RelationType, PathAlgorithm } from '../types/graph';
import { AggregatedEdge } from '../hooks/useEdgeGrouping';
import { apiClient } from '../utils/apiClient';
import GroupNode from './GroupNode';
import ExpandedGroupNode from './ExpandedGroupNode';
import ParallelEdge from './ParallelEdge';


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
  panOnDrag?: boolean;
  selectedAlgorithm?: PathAlgorithm;
  onNodesPositionChange?: (positions: { id: number; x: number; y: number }[]) => void;
  onNodeDoubleClick?: (node: GraphObject) => void;
  onPaneClick?: () => void;
  onCollapseAllGroups?: () => void;
  onExpandAllGroups?: () => void;
  onGroupSelected?: (nodeIds: number[]) => void;
}

interface HighlightProps {
  selectedNodes?: number[];
  selectedEdges?: number[];
}

const GraphCanvas: React.FC<GraphCanvasProps & HighlightProps> = ({
  // Note: onGroupSelected is destructured below alongside other props
  nodes,
  edges,
  relationTypes,
  onSelectNode,
  onSelectEdge,
  onNodeAction,
  onPaneClick,
  selectedNodes: propsSelectedNodes,
  selectedEdges,
  panOnDrag = true,
  selectedAlgorithm = 'dijkstra',
  onNodesPositionChange,
  onNodeDoubleClick,
  onCollapseAllGroups,
  onExpandAllGroups,
  onGroupSelected,
}) => {
  // Local highlighting for found path
  const [selectedNodesLocal, setSelectedNodesLocal] = useState<number[]>([]);
  const [selectedEdgesLocal, setSelectedEdgesLocal] = useState<number[]>([]);
  const [pathModalOpen, setPathModalOpen] = useState(false);
  const [pathResult, setPathResult] = useState<{
    nodeIds: number[];
    edgeIds: number[];
    totalWeight?: number;
    names?: string[];
    allPaths?: Array<{ nodeIds: number[]; names: string[]; weight?: number; edgeIds?: number[] }>;
  } | null>(null);
  const [findMessage, setFindMessage] = useState<string | null>(null);
  const [pathModalPos, setPathModalPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // React Flow Instance
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  // Timer ref for fitView deduplication (prevent stacking on multiple rapid applies)
  const fitViewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Флаг для отслеживания программных изменений (align)
  const isProgrammaticChangeRef = useRef(false);

  // Контекстное меню
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    node: GraphObject | null; // null для глобального меню
    type?: 'pane' | 'node'; // Тип меню
  } | null>(null);

  // Fallback state for find-path flow when parent handler doesn't implement it
  const [fallbackFindFirst, setFallbackFindFirst] = useState<number | null>(null);

  // 10 distinct colors for multi-path visualization
  const PATH_COLORS = useMemo(
    () => [
      '#E53935', // Red
      '#1E88E5', // Blue
      '#43A047', // Green
      '#FB8C00', // Orange
      '#8E24AA', // Purple
      '#00ACC1', // Cyan
      '#F4511E', // Deep Orange
      '#3949AB', // Indigo
      '#7CB342', // Light Green
      '#D81B60', // Pink
    ],
    []
  );

  // Map edge ID to path index for coloring
  const edgeToPathIndex = useMemo(() => {
    const map = new Map<number, number>();
    if (pathResult?.allPaths && pathResult.allPaths.length > 1) {
      pathResult.allPaths.forEach((path, pathIdx) => {
        path.edgeIds?.forEach(edgeId => {
          // First path wins for overlapping edges
          if (!map.has(edgeId)) {
            map.set(edgeId, pathIdx);
          }
        });
      });
    }
    return map;
  }, [pathResult]);

  // Мемоизация выбранных узлов
  const combinedSelectedNodes = useMemo(() => {
    return propsSelectedNodes && propsSelectedNodes.length > 0
      ? propsSelectedNodes
      : selectedNodesLocal;
  }, [propsSelectedNodes, selectedNodesLocal]);

  const combinedSelectedEdges = useMemo(() => {
    return selectedEdges && selectedEdges.length > 0 ? selectedEdges : selectedEdgesLocal;
  }, [selectedEdges, selectedEdgesLocal]);

  // Set для быстрого O(1) поиска выбранных узлов вместо O(n) .includes()
  const selectedNodesSet = useMemo(() => new Set(combinedSelectedNodes), [combinedSelectedNodes]);
  const selectedEdgesSet = useMemo(() => new Set(combinedSelectedEdges), [combinedSelectedEdges]);

  // Регистрируем типы узлов (мемоизируем, чтобы не пересоздавать)
  const nodeTypes = useMemo(() => ({
    group: GroupNode,
    expandedGroup: ExpandedGroupNode,
  }), []);

  // Регистрируем типы рёбер
  const edgeTypes = useMemo(() => ({
    parallel: ParallelEdge,
  }), []);

  // Мемоизация преобразования узлов для ReactFlow
  const initialRfNodes = useMemo<Node[]>(() => {
    return nodes.map(node => {
      const isSelected = selectedNodesSet.has(node.id);
      const isCollapsedGroup = node.isCollapsedGroup === true;

      // Если это контейнер раскрытой группы (ReactFlow Sub Flow parent)
      if ((node as any)._isExpandedGroupContainer) {
        return {
          id: node.id.toString(), // БЫЛО: \`expanded-container-\${(node as any)._collapsedGroupId}\` - именно это ломало производительность!
          type: 'expandedGroup',
          data: {
            label: (node as any)._expandedGroupLabel || node.name,
            count: (node as any)._expandedGroupCount || 0,
            orig: node,
          },
          position: {
            x: node.PositionX ?? 0,
            y: node.PositionY ?? 0,
          },
          // Явная передача width и height критически важна для onlyRenderVisibleElements!
          // Иначе движок думает, что размер узла 0x0, и выгружает его, когда мы приближаемся 
          width: (node as any)._expandedGroupWidth || 300,
          height: (node as any)._expandedGroupHeight || 300,
          style: {
            width: (node as any)._expandedGroupWidth || 300,
            height: (node as any)._expandedGroupHeight || 300,
            zIndex: -1, // Контейнер всегда позади элементов
          },
          selectable: false,
          draggable: true,
        };
      }

      // Если это сгруппированный узел (мета-узел)
      if (isCollapsedGroup) {
        return {
          id: node.id.toString(),
          type: 'group', // Используем кастомный компонент
          data: {
            label: node._groupPropertyValue || node.name,
            count: node._collapsedCount || 0,
            color: node.color,
            icon: node.icon,
            orig: node,
            nodeNames: (node as any)._groupNodeNames || [],
            edgeCount: (node as any)._groupEdgeCount || 0,
            isMixed: (node as any)._groupIsMixed || false,
          },
          position: {
            x: node.PositionX ?? 400,
            y: node.PositionY ?? 300,
          },
          selected: isSelected,
        };
      }

      // Обычный узел (может быть дочерним в раскрытой группе)
      const parentId = (node as any)._expandedGroupParentId as string | undefined;
      const rfNode: any = {
        id: node.id.toString(),
        type: 'default',
        data: {
          label: node.icon ? `${node.icon} ${node.name}` : node.name,
          orig: node,
        },
        position: {
          x: node.PositionX ?? 400,
          y: node.PositionY ?? 300,
        },
        style: {
          border: isSelected ? '4px solid #1976d2' : `2px solid ${node.color || '#2196f3'}`,
          borderRadius: 8,
          padding: 8,
          background: '#fff',
          color: node.color || undefined,
          boxShadow: isSelected ? '0 0 0 6px rgba(25,118,210,0.12)' : undefined,
          minWidth: 80,
          minHeight: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: 14,
          opacity: 1,
        },
      };

      // Восстанавливаем встроенную физическую привязку React Flow (Sub Flows) по просьбе пользователя
      if (parentId) {
        rfNode.parentId = parentId;
        rfNode.extent = 'parent';
      }

      return rfNode;
    });
  }, [nodes, combinedSelectedNodes, selectedNodesSet]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(initialRfNodes);

  // Синхронизация узлов только при изменении nodes или selection
  // Но НЕ при перемещении (это важно для устранения мигания)
  useEffect(() => {
    setRfNodes(currentNodes => {
      // O(n) Map lookup вместо O(n²) .find() в цикле
      const currentNodesMap = new Map<string, Node>();
      currentNodes.forEach(n => currentNodesMap.set(n.id, n));

      let positionChangedCount = 0;
      let dataChangedCount = 0;

      // Проверяем, действительно ли изменились данные или позиции из props
      const hasDataChanges =
        nodes.length !== currentNodes.length ||
        nodes.some(node => {
          const currentNode = currentNodesMap.get(node.id.toString());
          if (!currentNode) return true;

          const newLabel = node.icon ? `${node.icon} ${node.name}` : node.name;

          // Проверяем изменение данных
          const dataChanged =
            currentNode.data.label !== newLabel ||
            currentNode.data.orig.objectTypeId !== node.objectTypeId;

          if (dataChanged) dataChangedCount++;

          // Проверяем изменение позиций из props (например, при выравнивании)
          let currentAbsX = currentNode.position.x;
          let currentAbsY = currentNode.position.y;
          if (currentNode.parentId) {
            const parent = currentNodesMap.get(currentNode.parentId);
            if (parent) {
              currentAbsX += parent.position.x;
              currentAbsY += parent.position.y;
            }
          }

          const isVirtual = typeof node.id === 'number' && node.id < 0;

          const positionChanged = !isVirtual && (
            (node.PositionX !== undefined &&
              !isNaN(node.PositionX) &&
              Math.abs(currentAbsX - node.PositionX) > 1) ||
            (node.PositionY !== undefined && 
              !isNaN(node.PositionY) &&
              Math.abs(currentAbsY - node.PositionY) > 1)
          );

          if (positionChanged) positionChangedCount++;

          return dataChanged || positionChanged;
        });

      if (hasDataChanges) {
        // Отменяем debounce при программных изменениях
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        isProgrammaticChangeRef.current = true;
        
        // Safety check for NaNs in output
        const safeNodes = initialRfNodes.map(n => {
           if (isNaN(n.position.x) || isNaN(n.position.y)) {
              console.error("[GraphCanvas] NaN position detected!!!", n);
              return { ...n, position: { x: 400, y: 300 } };
           }
           return n;
        });

        if (positionChangedCount > 0 && rfInstance) {
          // Dedup: cancel any pending fitView before scheduling a new one
          if (fitViewTimerRef.current) clearTimeout(fitViewTimerRef.current);
          fitViewTimerRef.current = setTimeout(() => {
            rfInstance.fitView({ padding: 0.2, duration: 800 });
            fitViewTimerRef.current = null;
          }, 100);
        }
        
        return safeNodes;
      }

      // O(n) Map lookup для nodes вместо O(n²) .find() в цикле
      const nodesMap = new Map<string, (typeof nodes)[0]>();
      nodes.forEach(n => nodesMap.set(n.id.toString(), n));

      // Обновляем только стили (для selection), сохраняя позиции
      return currentNodes.map(currentNode => {
        const node = nodesMap.get(currentNode.id);
        if (!node) return currentNode;

        const isSelected = selectedNodesSet.has(node.id);

        // Для контейнеров раскрытых групп — ничего не обновляем
        if (currentNode.type === 'expandedGroup') {
          return currentNode;
        }

        // Для групповых узлов обновляем selected prop и data (если нужно), но не style
        if (currentNode.type === 'group') {
          // Обновляем данные мета-узла (nodeNames, edgeCount, isMixed могли измениться)
          const updatedData = { ...currentNode.data };
          if (node.isCollapsedGroup) {
            updatedData.nodeNames = (node as any)._groupNodeNames || [];
            updatedData.edgeCount = (node as any)._groupEdgeCount || 0;
            updatedData.isMixed = (node as any)._groupIsMixed || false;
          }
          return {
            ...currentNode,
            selected: isSelected,
            data: updatedData,
          };
        }

        // Для обычных узлов обновляем style
        return {
          ...currentNode,
          style: {
            border: isSelected ? '4px solid #1976d2' : `2px solid ${node.color || '#2196f3'}`,
            borderRadius: 8,
            padding: 8,
            background: '#fff',
            color: node.color || undefined,
            boxShadow: isSelected ? '0 0 0 6px rgba(25,118,210,0.12)' : undefined,
            minWidth: 80,
            minHeight: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: 14,
            opacity: 1, // Всегда яркие узлы при любом зуме
          },
        };
      });
    });
  }, [nodes, combinedSelectedNodes, initialRfNodes, selectedNodesSet]);

  // Мемоизация relationTypesMap для оптимизации (не пересоздаём на каждом рендере)
  const relationTypesMap = useMemo(() => {
    const map = new Map<number, string>();
    relationTypes.forEach(rt => map.set(rt.id, rt.name));
    return map;
  }, [relationTypes]);

  const rfEdges = useMemo<Edge[]>(() => {
    const hasHighlightedEdges = selectedEdgesSet.size > 0;

    const baseFontSize =
      edges.length < 100
        ? 11
        : edges.length < 500
          ? 10
          : edges.length < 1000
            ? 9
            : edges.length < 2000
              ? 8
              : 7;

    const getEdgeColor = (edge: GraphRelation): string => {
      if (edge.color) return edge.color;
      return '#90caf9';
    };

    // Группируем рёбра по парам узлов для выявления параллельных связей
    const groupedEdgesMap = new Map<string, GraphRelation[]>();
    edges.forEach(edge => {
      // Используем отсортированные ID для того, чтобы связи A->B и B->A попали в одну группу
      const id1 = Math.min(edge.source, edge.target);
      const id2 = Math.max(edge.source, edge.target);
      const key = `${id1}-${id2}`;

      if (!groupedEdgesMap.has(key)) {
        groupedEdgesMap.set(key, []);
      }
      groupedEdgesMap.get(key)!.push(edge);
    });

    const rfEdgesResult: Edge[] = [];

    // Итерируемся по группам и создаем рёбра с индексами
    groupedEdgesMap.forEach((group) => {
      group.forEach((edge, index) => {
        const isHighlighted = selectedEdgesSet.has(edge.id);

        let highlightColor = '#d32f2f';
        if (isHighlighted && edgeToPathIndex.size > 0) {
          const pathIdx = edgeToPathIndex.get(edge.id);
          if (pathIdx !== undefined) {
            highlightColor = PATH_COLORS[pathIdx % PATH_COLORS.length];
          }
        }

        const edgeLabel = relationTypesMap.get(edge.relationTypeId) || '';
        const aggCount = (edge as any)._aggregatedEdgeCount || 0;
        const isAgg = (edge as any)._isAggregated || aggCount > 1;
        const aggColor = '#ff8f00';
        const displayLabel = isAgg && aggCount > 1 ? `${edgeLabel} ×${aggCount}` : edgeLabel;

        rfEdgesResult.push({
          id: edge.id.toString(),
          source: edge.source.toString(),
          target: edge.target.toString(),
          label: displayLabel,
          // Если в группе более одного ребра — используем кастомный тип 'parallel'
          type: group.length > 1 ? 'parallel' : 'straight',
          data: { index, total: group.length },
          style: {
            stroke: isHighlighted ? highlightColor : isAgg ? aggColor : getEdgeColor(edge),
            strokeWidth: isHighlighted ? 6 : isAgg ? 4 : 2,
            opacity: isHighlighted ? 1 : hasHighlightedEdges ? 0.18 : 1,
            strokeDasharray: isHighlighted ? '6 6' : isAgg ? '8 3' : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isHighlighted ? highlightColor : isAgg ? aggColor : getEdgeColor(edge),
            width: 20,
            height: 20,
          },
          labelStyle: {
            fontSize: isHighlighted ? baseFontSize + 2 : isAgg ? baseFontSize + 2 : baseFontSize,
            fontWeight: isHighlighted || isAgg ? 700 : 500,
            fill: isHighlighted ? '#000' : isAgg ? '#e65100' : '#424242',
            fontFamily: 'Segoe UI, Tahoma, system-ui, sans-serif',
            letterSpacing: '0.3px',
          },
          labelBgStyle: {
            fill: isHighlighted ? '#fffde7' : isAgg ? '#fff8e1' : '#ffffff',
            fillOpacity: isHighlighted || isAgg ? 1 : 0.85,
            rx: 4,
            ry: 4,
            stroke: isHighlighted ? highlightColor : isAgg ? aggColor : '#e0e0e0',
            strokeWidth: isHighlighted || isAgg ? 1.5 : 0.5,
          } as any,
          labelBgPadding: [5, 8] as [number, number],
          labelBgBorderRadius: 4,
          animated: isHighlighted,
        });
      });
    });

    return rfEdgesResult;
  }, [edges, relationTypesMap, selectedEdgesSet, edgeToPathIndex, PATH_COLORS]);

  // Debounced callback для обновления позиций
  const debouncedPositionUpdate = useCallback(
    (positions: { id: number; x: number; y: number }[]) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        if (onNodesPositionChange) {
          onNodesPositionChange(positions);
        }
      }, 300); // 300ms debounce
    },
    [onNodesPositionChange]
  );

  // Очистка debounce таймера при размонтировании
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Обработка изменений узлов с фильтрацией только position изменений
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Применяем все изменения к ReactFlow
      onNodesChange(changes);

      // Игнорируем изменения позиций если это программное изменение (align)
      if (isProgrammaticChangeRef.current) {
        isProgrammaticChangeRef.current = false;
        return;
      }

      // Фильтруем только изменения позиций от пользователя
      const positionChanges = changes.filter(
        change => change.type === 'position' && change.dragging === false
      );

      if (positionChanges.length > 0 && onNodesPositionChange) {
        // Получаем текущие позиции после изменений
        setRfNodes(currentNodes => {
          const containerMap = new Map<string, { x: number; y: number }>();
          currentNodes.forEach((n: Node) => {
            if (n.type === 'expandedGroup' || n.id.startsWith('-')) {
              containerMap.set(n.id, n.position);
            }
          });

          const positions = currentNodes
            .filter((n: Node) => Number(n.id) > 0)
            .map((n: Node) => {
              let absX = n.position.x;
              let absY = n.position.y;
              if (n.parentId) {
                const parentPos = containerMap.get(n.parentId);
                if (parentPos) {
                  absX += parentPos.x;
                  absY += parentPos.y;
                }
              }
              return {
                id: Number(n.id),
                x: absX,
                y: absY,
              };
            });

          // Вызываем debounced обновление
          debouncedPositionUpdate(positions);

          return currentNodes;
        });
      }
    },
    [onNodesChange, onNodesPositionChange, debouncedPositionUpdate, setRfNodes]
  );

  // Контекстное меню по правому клику на узел
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: any) => {
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY, type: 'node', node: node.data.orig });
  }, []);

  // Контекстное меню по правому клику на фон
  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY, type: 'pane', node: null });
  }, []);

  // Проверяем есть ли активные группы
  const hasActiveGroups = useMemo(() => {
    return nodes.some(n => n.isCollapsedGroup);
  }, [nodes]);

  // Обработка клика по узлу
  const handleNodeClick = useCallback(
    (_: any, node: any) => {
      onSelectNode(node.data.orig);
    },
    [onSelectNode]
  );

  // O(1) Map для поиска рёбер по клику вместо O(n) .find()
  const edgesMap = useMemo(() => {
    const map = new Map<string, GraphRelation>();
    edges.forEach(e => map.set(e.id.toString(), e));
    return map;
  }, [edges]);

  // Обработка клика по рёбру
  const handleEdgeClick = useCallback(
    (_: any, edge: any) => {
      const foundEdge = edgesMap.get(edge.id);
      if (foundEdge) {
        onSelectEdge(foundEdge);
      }
    },
    [edgesMap, onSelectEdge]
  );

  // Обработка двойного клика по узлу
  const handleNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: any) => {
      // Если это сгруппированный узел, разворачиваем его
      if (node.data.orig.isCollapsedGroup) {
        if (onNodeAction) {
          (onNodeAction as any)('expand-group', node.data.orig);
        }
        return;
      }

      if (onNodeDoubleClick) {
        onNodeDoubleClick(node.data.orig);
      }
    },
    [onNodeDoubleClick, onNodeAction]
  );

  // Действия из меню
  const handleMenuAction = useCallback(
    (action: string) => {
      if (!menu) {
        setMenu(null);
        return;
      }

      // Глобальные действия (не требуют node)
      if (action === 'expand-all') {
        if (onExpandAllGroups) {
          onExpandAllGroups();
        }
        setMenu(null);
        return;
      }
      if (action === 'collapse-all') {
        if (onCollapseAllGroups) {
          onCollapseAllGroups();
        }
        setMenu(null);
        return;
      }
      if (action === 'fit-view') {
        if (rfInstance) {
          rfInstance.fitView({ padding: 0.2, duration: 800 });
        }
        setMenu(null);
        return;
      }

      // Действия с узлом (требуют node)
      if (!menu.node) {
        setMenu(null);
        return;
      }

      // Fallback: if action is 'find-path' and parent handler doesn't support it, handle here
      if (action === 'find-path') {
        const parentStr =
          onNodeAction && (onNodeAction as any).toString ? (onNodeAction as any).toString() : '';
        const parentHasFind = parentStr.includes('find-path');

        if (!parentHasFind) {
          // First click: store origin; second click: call backend
          if (!fallbackFindFirst) {
            setFallbackFindFirst(menu.node.id);
            setFindMessage(
              'Первый узел для поиска пути выбран: ' + (menu.node.name || menu.node.id)
            );
            setTimeout(() => setFindMessage(null), 2200);
            setMenu(null);
            return;
          } else if (fallbackFindFirst && fallbackFindFirst !== menu.node.id) {
            const from = fallbackFindFirst;
            const to = menu.node.id;
            const base = (window as any).__API_BASE || '';

            // Выбираем endpoint в зависимости от алгоритма
            let endpoint = '';
            switch (selectedAlgorithm) {
              case 'astar':
                endpoint = `${base}/api/astar-path?fromId=${from}&toId=${to}&heuristic=euclidean`;
                break;
              case 'bfs':
                endpoint = `${base}/api/find-path?startId=${from}&endId=${to}`;
                break;
              case 'k-shortest':
                endpoint = `${base}/api/k-shortest-paths?fromId=${from}&toId=${to}&k=3`;
                break;
              case 'all-paths':
                endpoint = `${base}/api/paths?fromId=${from}&toId=${to}`;
                break;
              default:
                endpoint = `${base}/api/dijkstra-path?fromId=${from}&toId=${to}`;
            }

            const url = endpoint.replace(/([^:]?)\/\//g, '$1//');

            const tryPrimary = async () => {
              try {
                const r = await apiClient.get(url);
                if (r.status === 404 && !base) {
                  return null;
                }
                if (!r.ok) {
                  throw new Error('server error ' + r.status);
                }
                return await r.json();
              } catch (e) {
                return null;
              }
            };

            (async () => {
              let data = await tryPrimary();
              if (!data) {
                try {
                  const fallbackUrl = `${base}/api/dijkstra-path?fromId=${from}&toId=${to}`.replace(/([^:]?)\/\//g, '$1//');
                  const r2 = await apiClient.get(fallbackUrl);
                  if (r2.ok) data = await r2.json();
                } catch (e) { }
              }

              if (!data) {
                setFindMessage('Ошибка при поиске пути на сервере');
                setTimeout(() => setFindMessage(null), 2500);
                setFallbackFindFirst(null);
                return;
              }

              let pathNodeIds: number[] = [];
              let pathEdgeIds: number[] = [];
              let totalWeight: number | undefined = undefined;
              let pathsCount = 0;
              let allPathsData: Array<{ nodeIds: number[]; names: string[]; weight?: number }> = [];

              // O(1) Map для поиска ребра между двумя узлами вместо O(n) .find() в цикле
              const edgeLookup = new Map<string, number>();
              edges.forEach(e => {
                edgeLookup.set(`${e.source}-${e.target}`, e.id);
                edgeLookup.set(`${e.target}-${e.source}`, e.id); // undirected
              });
              const findEdgeId = (source: number, target: number) => {
                return edgeLookup.get(`${source}-${target}`) ?? null;
              };

              // O(1) Map для имён узлов вместо O(n) .find() в цикле
              const nodeNameMap = new Map<number, string>();
              nodes.forEach(n => nodeNameMap.set(n.id, n.name));

              // Handle different response formats
              if (Array.isArray(data)) {
                if (data.length > 0) {
                  if (Array.isArray(data[0])) {
                    // All Paths: [[1,2,3], [1,4,5]]
                    const allNodes = new Set<number>();
                    const allEdges = new Set<number>();

                    // Store each path separately with its edgeIds
                    allPathsData = data.map((path: number[]) => {
                      const pathEdges: number[] = [];
                      for (let i = 0; i < path.length - 1; i++) {
                        const edgeId = findEdgeId(path[i], path[i + 1]);
                        if (edgeId) pathEdges.push(edgeId);
                      }
                      return {
                        nodeIds: path,
                        names: path.map(id => nodeNameMap.get(id) || String(id)),
                        weight: path.length - 1,
                        edgeIds: pathEdges,
                      };
                    });

                    // Merge all paths for visualization
                    data.forEach((path: number[]) => {
                      path.forEach((nodeId, index) => {
                        allNodes.add(nodeId);
                        if (index < path.length - 1) {
                          const nextNodeId = path[index + 1];
                          const edgeId = findEdgeId(nodeId, nextNodeId);
                          if (edgeId) allEdges.add(edgeId);
                        }
                      });
                    });

                    pathNodeIds = Array.from(allNodes);
                    pathEdgeIds = Array.from(allEdges);
                    pathsCount = data.length;
                    console.log(`Visualizing ${pathsCount} paths (merged)`);
                  } else if (typeof data[0] === 'object' && 'id' in data[0]) {
                    // Legacy BFS: [{id:1}, {id:2}]
                    pathNodeIds = data.map((n: any) => n.id);
                    // Calculate edges for BFS
                    for (let i = 0; i < pathNodeIds.length - 1; i++) {
                      const edgeId = findEdgeId(pathNodeIds[i], pathNodeIds[i + 1]);
                      if (edgeId) pathEdgeIds.push(edgeId);
                    }
                  }
                }
              } else if (data.paths && Array.isArray(data.paths)) {
                // K-Shortest Paths
                if (data.paths.length > 0) {
                  const allNodes = new Set<number>();
                  const allEdges = new Set<number>();

                  // Store each path separately with edgeIds for coloring
                  allPathsData = data.paths.map((path: any) => {
                    // Calculate edgeIds if missing
                    let pathEdges = path.edgeIds || [];
                    if (pathEdges.length === 0 && path.nodeIds.length > 1) {
                      pathEdges = [];
                      for (let i = 0; i < path.nodeIds.length - 1; i++) {
                        const edgeId = findEdgeId(path.nodeIds[i], path.nodeIds[i + 1]);
                        if (edgeId) pathEdges.push(edgeId);
                      }
                    }
                    return {
                      nodeIds: path.nodeIds,
                      names: path.nodeIds.map((id: number) => nodeNameMap.get(id) || String(id)),
                      weight: path.totalWeight,
                      edgeIds: pathEdges,
                    };
                  });

                  // Merge all paths for visualization
                  data.paths.forEach((path: any) => {
                    path.nodeIds.forEach((id: number) => allNodes.add(id));
                    if (path.edgeIds) {
                      path.edgeIds.forEach((id: number) => allEdges.add(id));
                    } else {
                      // If edgeIds missing, calculate them
                      for (let i = 0; i < path.nodeIds.length - 1; i++) {
                        const edgeId = findEdgeId(path.nodeIds[i], path.nodeIds[i + 1]);
                        if (edgeId) allEdges.add(edgeId);
                      }
                    }
                  });

                  pathNodeIds = Array.from(allNodes);
                  pathEdgeIds = Array.from(allEdges);
                  pathsCount = data.paths.length;
                  // Show weight of the shortest one (first one)
                  totalWeight = data.paths[0].totalWeight;
                }
              } else if (data.nodeIds) {
                // Standard format (Dijkstra, A*)
                pathNodeIds = data.nodeIds;
                pathEdgeIds = data.edgeIds || [];
                totalWeight = data.totalWeight;

                // If edges missing, calculate
                if (pathEdgeIds.length === 0 && pathNodeIds.length > 1) {
                  for (let i = 0; i < pathNodeIds.length - 1; i++) {
                    const edgeId = findEdgeId(pathNodeIds[i], pathNodeIds[i + 1]);
                    if (edgeId) pathEdgeIds.push(edgeId);
                  }
                }
              }

              if (pathNodeIds.length > 0) {
                // Используем уже созданный nodeNameMap для O(1) lookup
                const names = pathNodeIds.map((id: number) => nodeNameMap.get(id) || String(id));

                // Custom message for multiple paths
                let modalTitle = 'Найденный путь';
                if (pathsCount > 1) {
                  modalTitle = `Найдено путей: ${pathsCount} (показаны все)`;
                }

                setPathResult({
                  nodeIds: pathNodeIds,
                  edgeIds: pathEdgeIds,
                  totalWeight: totalWeight,
                  names,
                  allPaths: allPathsData.length > 0 ? allPathsData : undefined,
                });

                // Update selection to highlight EVERYTHING
                setSelectedNodesLocal(pathNodeIds);
                setSelectedEdgesLocal(pathEdgeIds);

                // Update message
                if (pathsCount > 1) {
                  setFindMessage(`Найдено ${pathsCount} вариантов пути`);
                  setTimeout(() => setFindMessage(null), 3000);
                }

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

      // group-selected: произвольная группировка выбранных узлов
      if (action === 'group-selected') {
        const nodeIds =
          propsSelectedNodes && propsSelectedNodes.length >= 2 ? [...propsSelectedNodes] : [];
        if (onGroupSelected && nodeIds.length >= 2) {
          onGroupSelected(nodeIds);
        }
        setMenu(null);
        return;
      }

      if (onNodeAction && typeof onNodeAction === 'function') {
        try {
          if (menu.node) {
            onNodeAction(action, menu.node);
          }
        } catch (err) {
          console.error('GraphCanvas: ошибка при вызове onNodeAction', err);
        }
      }

      setMenu(null);
    },
    [menu, onNodeAction, fallbackFindFirst, nodes, propsSelectedNodes, onGroupSelected]
  );

  // Закрыть меню при клике вне
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menu]);

  // Обработчик закрытия модального окна пути
  const handleClosePathModal = useCallback(() => {
    setPathModalOpen(false);
    setSelectedNodesLocal([]);
    setSelectedEdgesLocal([]);
    setPathResult(null);
    setPathModalPos(null);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        onInit={setRfInstance}
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeClick={handleEdgeClick}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        panOnDrag={panOnDrag}
        fitView
        onlyRenderVisibleElements
        minZoom={0.1}
        maxZoom={4}
        defaultEdgeOptions={{
          type: 'straight', // Прямые линии рендерятся в 10 раз быстрее кривых Безье при зуме
          style: { strokeWidth: 2 },
        }}
        // Оптимизации для больших графов (>1000 элементов)
        elevateEdgesOnSelect={false}
        selectNodesOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={true}
        zoomOnDoubleClick={false}
        preventScrolling={true}
        // Отключаем интерполяцию при перемещении для лучшей производительности
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Background />
        <Controls />
      </ReactFlow>

      {/* Transient on-screen message */}
      {findMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#323232',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: 8,
            zIndex: 1200,
          }}
        >
          {findMessage}
        </div>
      )}

      {/* Path details modal */}
      {pathModalOpen && pathResult && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.12)',
            zIndex: 2000,
          }}
        >
          <div
            onMouseDown={e => {
              dragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                origX: pathModalPos?.x ?? window.innerWidth / 2 - 180,
                origY: pathModalPos?.y ?? window.innerHeight / 2 - 120,
              };
              e.stopPropagation();
            }}
            onMouseMove={e => {
              if (dragRef.current) {
                const dx = e.clientX - dragRef.current.startX;
                const dy = e.clientY - dragRef.current.startY;
                setPathModalPos({
                  x: dragRef.current.origX + dx,
                  y: dragRef.current.origY + dy,
                });
                e.stopPropagation();
              }
            }}
            onMouseUp={() => {
              dragRef.current = null;
            }}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: pathModalPos?.x ?? window.innerWidth / 2 - 180,
                top: pathModalPos?.y ?? window.innerHeight / 2 - 120,
                background: '#fff',
                padding: 20,
                borderRadius: 10,
                minWidth: 360,
                maxWidth: '90%',
                boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
                cursor: 'move',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>
                {pathResult.allPaths && pathResult.allPaths.length > 1
                  ? `Найдено путей: ${pathResult.allPaths.length}`
                  : 'Найденный путь'}
              </h3>

              {pathResult.allPaths && pathResult.allPaths.length > 0 ? (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {pathResult.allPaths.map((path, pathIdx) => (
                    <div
                      key={pathIdx}
                      style={{
                        marginBottom: 16,
                        paddingBottom: 12,
                        borderBottom:
                          pathIdx < pathResult.allPaths!.length - 1 ? '1px solid #eee' : 'none',
                      }}
                    >
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontWeight: 600,
                          color: '#333',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: PATH_COLORS[pathIdx % PATH_COLORS.length],
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                        />
                        Путь {pathIdx + 1} ({path.nodeIds.length} узлов
                        {path.weight !== undefined ? `, вес: ${path.weight}` : ''})
                      </p>
                      <ol style={{ paddingLeft: 18, margin: 0 }}>
                        {path.names.map((name, idx) => (
                          <li key={idx} style={{ marginBottom: 4, fontSize: '14px' }}>
                            {name} <small style={{ color: '#999' }}>#{path.nodeIds[idx]}</small>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <p style={{ margin: '6px 0 12px 0', color: '#666' }}>
                    Вес: {pathResult.totalWeight ?? 'N/A'}
                  </p>
                  <ol style={{ paddingLeft: 18 }}>
                    {pathResult.names &&
                      pathResult.names.map((n, idx) => (
                        <li key={idx} style={{ marginBottom: 6 }}>
                          {n} <small style={{ color: '#999' }}>#{pathResult.nodeIds[idx]}</small>
                        </li>
                      ))}
                  </ol>
                </>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <button
                  onClick={handleClosePathModal}
                  style={{
                    background: '#e0e0e0',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  Закрыть
                </button>
                <button
                  onClick={handleClosePathModal}
                  style={{
                    background: '#1976d2',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  ОК
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context menu */}
      {menu && (
        <div
          style={{
            position: 'fixed',
            top: menu.y,
            left: menu.x,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 8,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            zIndex: 1001,
            minWidth: 160,
          }}
        >
          {/* Глобальное меню (клик по фону) */}
          {menu.type === 'pane' ? (
            <>
              {hasActiveGroups && (
                <>
                  <button style={menuBtn} onClick={() => handleMenuAction('expand-all')}>
                    🔓 Развернуть все группы
                  </button>
                  <button style={menuBtn} onClick={() => handleMenuAction('collapse-all')}>
                    🔒 Свернуть все группы
                  </button>
                  <div style={{ height: 1, background: '#eee', margin: '4px 0' }} />
                </>
              )}
              <button style={menuBtn} onClick={() => handleMenuAction('fit-view')}>
                📐 Показать всё
              </button>
            </>
          ) : menu.node && menu.node.isCollapsedGroup ? (
            /* Меню для мета-узла */
            <>
              <button
                style={{ ...menuBtn, color: '#4caf50', fontWeight: 600 }}
                onClick={() => handleMenuAction('expand-group')}
              >
                🔓 Развернуть группу ({menu.node._collapsedCount} узлов)
              </button>
              <div style={{ height: 1, background: '#eee', margin: '4px 0' }} />
              <button style={menuBtn} onClick={() => handleMenuAction('select-group-nodes')}>
                Выбрать узлы группы
              </button>
            </>
          ) : (
            /* Меню для обычного узла */
            <>
              <button style={menuBtn} onClick={() => handleMenuAction('create-relation')}>
                Создать связь
              </button>
              <button style={menuBtn} onClick={() => handleMenuAction('expand')}>
                Раскрыть связи
              </button>
              <button style={menuBtn} onClick={() => handleMenuAction('edit')}>
                Редактировать
              </button>
              <button style={menuBtn} onClick={() => handleMenuAction('hide')}>
                Скрыть
              </button>
              <button
                style={{ ...menuBtn, color: '#f44336' }}
                onClick={() => handleMenuAction('delete')}
              >
                Удалить
              </button>
              <button style={menuBtn} onClick={() => handleMenuAction('find-path')}>
                Поиск пути
              </button>
              {onGroupSelected && propsSelectedNodes && propsSelectedNodes.length >= 2 && (
                <>
                  <div style={{ height: 1, background: '#eee', margin: '4px 0' }} />
                  <button
                    style={{ ...menuBtn, color: '#1976d2', fontWeight: 600 }}
                    onClick={() => handleMenuAction('group-selected')}
                  >
                    🗂 Сгруппировать выбранные ({propsSelectedNodes.length})
                  </button>
                </>
              )}
            </>
          )}
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

