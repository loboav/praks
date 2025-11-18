import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  NodeChange,
  Node,
  Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import { GraphObject, GraphRelation, RelationType } from "../types/graph";
import { apiClient } from "../utils/apiClient";

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
  onNodesPositionChange?: (
    positions: { id: number; x: number; y: number }[],
  ) => void;
}

interface HighlightProps {
  selectedNodes?: number[];
  selectedEdges?: number[];
}

const GraphCanvas: React.FC<GraphCanvasProps & HighlightProps> = ({
  nodes,
  edges,
  relationTypes,
  onSelectNode,
  onSelectEdge,
  onNodeAction,
  selectedNodes: propsSelectedNodes,
  selectedEdges,
  panOnDrag = true,
  onNodesPositionChange,
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

  // Флаг для отслеживания программных изменений (align)
  const isProgrammaticChangeRef = useRef(false);

  // Контекстное меню
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    node: GraphObject;
  } | null>(null);

  // Fallback state for find-path flow when parent handler doesn't implement it
  const [fallbackFindFirst, setFallbackFindFirst] = useState<number | null>(
    null,
  );

  // Мемоизация выбранных узлов
  const combinedSelectedNodes = useMemo(() => {
    return propsSelectedNodes && propsSelectedNodes.length > 0
      ? propsSelectedNodes
      : selectedNodesLocal;
  }, [propsSelectedNodes, selectedNodesLocal]);

  const combinedSelectedEdges = useMemo(() => {
    return selectedEdges && selectedEdges.length > 0
      ? selectedEdges
      : selectedEdgesLocal;
  }, [selectedEdges, selectedEdgesLocal]);

  // Мемоизация преобразования узлов для ReactFlow
  const initialRfNodes = useMemo<Node[]>(() => {
    return nodes.map((node) => ({
      id: node.id.toString(),
      data: {
        label: node.icon ? `${node.icon} ${node.name}` : node.name,
        orig: node,
      },
      position: {
        x: node.PositionX ?? 400,
        y: node.PositionY ?? 300,
      },
      style: {
        border:
          combinedSelectedNodes && combinedSelectedNodes.includes(node.id)
            ? "4px solid #1976d2"
            : `2px solid ${node.color || "#2196f3"}`,
        borderRadius: 8,
        padding: 8,
        background: "#fff",
        color: node.color || undefined,
        boxShadow:
          combinedSelectedNodes && combinedSelectedNodes.includes(node.id)
            ? "0 0 0 6px rgba(25,118,210,0.12)"
            : undefined,
      },
    }));
  }, [nodes, combinedSelectedNodes]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(initialRfNodes);

  // Синхронизация узлов только при изменении nodes или selection
  // Но НЕ при перемещении (это важно для устранения мигания)
  useEffect(() => {
    setRfNodes((currentNodes) => {
      // Проверяем, действительно ли изменились данные или позиции из props
      const hasDataChanges =
        nodes.length !== currentNodes.length ||
        nodes.some((node) => {
          const currentNode = currentNodes.find(
            (n) => n.id === node.id.toString(),
          );
          if (!currentNode) return true;

          const newLabel = node.icon ? `${node.icon} ${node.name}` : node.name;

          // Проверяем изменение данных
          const dataChanged =
            currentNode.data.label !== newLabel ||
            currentNode.data.orig.objectTypeId !== node.objectTypeId;

          // Проверяем изменение позиций из props (например, при выравнивании)
          const positionChanged =
            (node.PositionX !== undefined &&
              Math.abs(currentNode.position.x - node.PositionX) > 1) ||
            (node.PositionY !== undefined &&
              Math.abs(currentNode.position.y - node.PositionY) > 1);

          return dataChanged || positionChanged;
        });

      if (hasDataChanges) {
        // Отменяем debounce при программных изменениях
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        isProgrammaticChangeRef.current = true;
        return initialRfNodes;
      }

      // Обновляем только стили (для selection), сохраняя позиции
      return currentNodes.map((currentNode) => {
        const node = nodes.find((n) => n.id.toString() === currentNode.id);
        if (!node) return currentNode;

        const isSelected =
          combinedSelectedNodes && combinedSelectedNodes.includes(node.id);
        return {
          ...currentNode,
          style: {
            border: isSelected
              ? "4px solid #1976d2"
              : `2px solid ${node.color || "#2196f3"}`,
            borderRadius: 8,
            padding: 8,
            background: "#fff",
            color: node.color || undefined,
            boxShadow: isSelected
              ? "0 0 0 6px rgba(25,118,210,0.12)"
              : undefined,
          },
        };
      });
    });
  }, [nodes, combinedSelectedNodes, initialRfNodes]);

  // Мемоизация преобразования рёбер для ReactFlow
  const rfEdges = useMemo<Edge[]>(() => {
    return edges.map((edge) => {
      const isHighlighted =
        combinedSelectedEdges && combinedSelectedEdges.includes(edge.id);
      return {
        id: edge.id.toString(),
        source: edge.source.toString(),
        target: edge.target.toString(),
        label:
          relationTypes.find((rt) => rt.id === edge.relationTypeId)?.name || "",
        style: {
          stroke: isHighlighted ? "#d32f2f" : edge.color || "#2196f3",
          strokeWidth: isHighlighted ? 8 : 2,
          opacity: isHighlighted
            ? 1
            : combinedSelectedEdges && combinedSelectedEdges.length > 0
              ? 0.18
              : 1,
          strokeDasharray: isHighlighted ? undefined : "6 6",
        },
        animated: !isHighlighted,
      };
    });
  }, [edges, relationTypes, combinedSelectedEdges]);

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
    [onNodesPositionChange],
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
        (change) => change.type === "position" && change.dragging === false,
      );

      if (positionChanges.length > 0 && onNodesPositionChange) {
        // Получаем текущие позиции после изменений
        setRfNodes((currentNodes) => {
          const positions = currentNodes.map((n: Node) => ({
            id: Number(n.id),
            x: n.position.x,
            y: n.position.y,
          }));

          // Вызываем debounced обновление
          debouncedPositionUpdate(positions);

          return currentNodes;
        });
      }
    },
    [onNodesChange, onNodesPositionChange, debouncedPositionUpdate, setRfNodes],
  );

  // Контекстное меню по правому клику
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: any) => {
      event.preventDefault();
      setMenu({ x: event.clientX, y: event.clientY, node: node.data.orig });
    },
    [],
  );

  // Обработка клика по узлу
  const handleNodeClick = useCallback(
    (_: any, node: any) => {
      onSelectNode(node.data.orig);
    },
    [onSelectNode],
  );

  // Обработка клика по рёбру
  const handleEdgeClick = useCallback(
    (_: any, edge: any) => {
      const foundEdge = edges.find((e) => e.id.toString() === edge.id);
      if (foundEdge) {
        onSelectEdge(foundEdge);
      }
    },
    [edges, onSelectEdge],
  );

  // Действия из меню
  const handleMenuAction = useCallback(
    (action: string) => {
      if (!menu) {
        setMenu(null);
        return;
      }

      // Fallback: if action is 'find-path' and parent handler doesn't support it, handle here
      if (action === "find-path") {
        const parentStr =
          onNodeAction && (onNodeAction as any).toString
            ? (onNodeAction as any).toString()
            : "";
        const parentHasFind = parentStr.includes("find-path");

        if (!parentHasFind) {
          // First click: store origin; second click: call backend
          if (!fallbackFindFirst) {
            setFallbackFindFirst(menu.node.id);
            setFindMessage(
              "Первый узел для поиска пути выбран: " +
                (menu.node.name || menu.node.id),
            );
            setTimeout(() => setFindMessage(null), 2200);
            setMenu(null);
            return;
          } else if (fallbackFindFirst && fallbackFindFirst !== menu.node.id) {
            const from = fallbackFindFirst;
            const to = menu.node.id;
            const base = (window as any).__API_BASE || "";
            const url =
              `${base}/api/dijkstra-path?fromId=${from}&toId=${to}`.replace(
                /([^:]?)\/\//g,
                "$1//",
              );

            const tryPrimary = async () => {
              try {
                const r = await apiClient.get(url);
                if (r.status === 404 && !base) {
                  return null;
                }
                if (!r.ok) {
                  throw new Error("server error " + r.status);
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
                  const r2 = await apiClient.get(
                    `http://localhost:5000/api/dijkstra-path?fromId=${from}&toId=${to}`,
                  );
                  if (r2.ok) data = await r2.json();
                } catch (e) {}
              }

              if (!data) {
                setFindMessage("Ошибка при поиске пути на сервере");
                setTimeout(() => setFindMessage(null), 2500);
                setFallbackFindFirst(null);
                return;
              }

              if (data && data.nodeIds && data.nodeIds.length) {
                const names = (data.nodeIds as number[]).map(
                  (id: number) =>
                    nodes.find((n) => n.id === id)?.name || String(id),
                );
                setPathResult({
                  nodeIds: data.nodeIds,
                  edgeIds: data.edgeIds || [],
                  totalWeight: data.totalWeight,
                  names,
                });
                setSelectedNodesLocal(data.nodeIds);
                setSelectedEdgesLocal(data.edgeIds || []);
                setPathModalOpen(true);
              } else {
                setFindMessage("Путь не найден");
                setTimeout(() => setFindMessage(null), 2200);
              }
              setFallbackFindFirst(null);
            })();

            setMenu(null);
            return;
          }
        }
      }

      if (onNodeAction && typeof onNodeAction === "function") {
        try {
          onNodeAction(action, menu.node);
        } catch (err) {
          console.error("GraphCanvas: ошибка при вызове onNodeAction", err);
        }
      }

      setMenu(null);
    },
    [menu, onNodeAction, fallbackFindFirst, nodes],
  );

  // Закрыть меню при клике вне
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
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
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeClick={handleEdgeClick}
        panOnDrag={panOnDrag}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>

      {/* Transient on-screen message */}
      {findMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#323232",
            color: "#fff",
            padding: "10px 16px",
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
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.12)",
            zIndex: 2000,
          }}
        >
          <div
            onMouseDown={(e) => {
              dragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                origX: pathModalPos?.x ?? window.innerWidth / 2 - 180,
                origY: pathModalPos?.y ?? window.innerHeight / 2 - 120,
              };
              e.stopPropagation();
            }}
            onMouseMove={(e) => {
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
              position: "absolute",
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: pathModalPos?.x ?? window.innerWidth / 2 - 180,
                top: pathModalPos?.y ?? window.innerHeight / 2 - 120,
                background: "#fff",
                padding: 20,
                borderRadius: 10,
                minWidth: 360,
                maxWidth: "90%",
                boxShadow: "0 12px 40px rgba(0,0,0,0.28)",
                cursor: "move",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>Найденный путь</h3>
              <p style={{ margin: "6px 0 12px 0", color: "#666" }}>
                Вес: {pathResult.totalWeight ?? "N/A"}
              </p>
              <ol style={{ paddingLeft: 18 }}>
                {pathResult.names &&
                  pathResult.names.map((n, idx) => (
                    <li key={idx} style={{ marginBottom: 6 }}>
                      {n}{" "}
                      <small style={{ color: "#999" }}>
                        #{pathResult.nodeIds[idx]}
                      </small>
                    </li>
                  ))}
              </ol>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <button
                  onClick={handleClosePathModal}
                  style={{
                    background: "#e0e0e0",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Закрыть
                </button>
                <button
                  onClick={handleClosePathModal}
                  style={{
                    background: "#1976d2",
                    color: "#fff",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: 6,
                    cursor: "pointer",
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
            position: "fixed",
            top: menu.y,
            left: menu.x,
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 8,
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            zIndex: 1001,
            minWidth: 160,
          }}
        >
          <button
            style={menuBtn}
            onClick={() => handleMenuAction("create-relation")}
          >
            Создать связь
          </button>
          <button style={menuBtn} onClick={() => handleMenuAction("edit")}>
            Редактировать
          </button>
          <button style={menuBtn} onClick={() => handleMenuAction("delete")}>
            Удалить
          </button>
          <button style={menuBtn} onClick={() => handleMenuAction("find-path")}>
            Поиск пути
          </button>
        </div>
      )}
    </div>
  );
};

const menuBtn: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "10px 18px",
  background: "none",
  border: "none",
  textAlign: "left",
  fontSize: 16,
  cursor: "pointer",
  color: "#23272f",
  borderBottom: "1px solid #eee",
};

export default GraphCanvas;
