import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  GraphObject,
  GraphRelation,
  ObjectType,
  RelationType,
} from "../types/graph";
import GraphCanvas from "./GraphCanvas";
import ObjectCard from "./ObjectCard";
import RelationCard from "./RelationCard";

import AddObjectModal from "./modals/AddObjectModal";
import AddRelationModal from "./modals/AddRelationModal";
import AddObjectTypeModal from "./modals/AddObjectTypeModal";
import AddRelationTypeModal from "./modals/AddRelationTypeModal";
import FilterModal, { FilterState } from "./modals/FilterModal";
import Toolbar from "./Toolbar";
import Sidebar from "./Sidebar";
import { toast } from "react-toastify";

const api = (path: string, opts?: any) =>
  fetch("/api" + path, opts).then((r) => r.json());

export default function GraphView() {
  const [nodes, setNodes] = useState<GraphObject[]>([]);
  const [edges, setEdges] = useState<GraphRelation[]>([]);
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
  const [relationTypes, setRelationTypes] = useState<RelationType[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [path, setPath] = useState<number[]>([]);
  const [addObjectOpen, setAddObjectOpen] = useState(false);
  const [addRelation, setAddRelation] = useState<{
    source: GraphObject | null;
    target: GraphObject | null;
  }>({ source: null, target: null });
  const [addRelationOpen, setAddRelationOpen] = useState(false);

  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    selectedObjectTypes: [],
    selectedRelationTypes: [],
    showIsolatedNodes: true,
  });

  const [layout, setLayout] = useState<any>(null);

  const mergeNodesWithPositions = (newNodes: GraphObject[], existingNodes: GraphObject[]) => {
    return newNodes.map(newNode => {
      const existing = existingNodes.find(n => n.id === newNode.id);
      if (existing && (existing.PositionX !== undefined || existing.PositionY !== undefined)) {
        return {
          ...newNode,
          PositionX: existing.PositionX,
          PositionY: existing.PositionY
        };
      }
      if (newNode.PositionX === undefined || newNode.PositionY === undefined) {
        return {
          ...newNode,
          PositionX: Math.random() * 800 + 100,
          PositionY: Math.random() * 500 + 100
        };
      }
      return newNode;
    });
  };

  const handleNodesPositionChange = (
    positions: { id: number; x: number; y: number }[],
  ) => {
    setNodes((prevNodes) => {
      let changed = false;
      const updated = prevNodes.map((n) => {
        const pos = positions.find((p) => p.id === n.id);
        if (pos && (n.PositionX !== pos.x || n.PositionY !== pos.y)) {
          changed = true;
          return { ...n, PositionX: pos.x, PositionY: pos.y };
        }
        return n;
      });
      return changed ? updated : prevNodes;
    });
  };

  useEffect(() => {
    if (objectTypes.length > 0 && filters.selectedObjectTypes.length === 0) {
      setFilters((prev) => ({
        ...prev,
        selectedObjectTypes: objectTypes.map((t) => t.id),
      }));
    }
    if (
      relationTypes.length > 0 &&
      filters.selectedRelationTypes.length === 0
    ) {
      setFilters((prev) => ({
        ...prev,
        selectedRelationTypes: relationTypes.map((t) => t.id),
      }));
    }
  }, [objectTypes, relationTypes]);

  
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      
      if (!filters.selectedObjectTypes.includes(node.objectTypeId)) {
        return false;
      }

      
      if (!filters.showIsolatedNodes) {
        const hasConnections = edges.some(
          (edge) => edge.source === node.id || edge.target === node.id,
        );
        if (!hasConnections) {
          return false;
        }
      }

      return true;
    });
  }, [nodes, filters.selectedObjectTypes, filters.showIsolatedNodes, edges]);

  const filteredEdges = useMemo(() => {
    return edges.filter((edge) => {
      if (!filters.selectedRelationTypes.includes(edge.relationTypeId)) {
        return false;
      }

      
      const sourceVisible = filteredNodes.some((n) => n.id === edge.source);
      const targetVisible = filteredNodes.some((n) => n.id === edge.target);

      return sourceVisible && targetVisible;
    });
  }, [edges, filters.selectedRelationTypes, filteredNodes]);

  const handleApplyFilter = (newFilters: FilterState) => {
    setFilters(newFilters);
    toast.success(
      `Фильтры применены! Узлов: ${filteredNodes.length}, Связей: ${filteredEdges.length}`,
    );
  };

  useEffect(() => {
    api("/objecttype").then(setObjectTypes);
    api("/relationtype").then(setRelationTypes);
    api("/objects").then((objs) => {
      fetch("/api/layout")
        .then((r) => (r.ok ? r.json() : null))
        .then((l) => {
          if (l && l.layoutJson) {
            try {
              const layoutObj = JSON.parse(l.layoutJson);
              if (layoutObj && Array.isArray(layoutObj.nodes)) {
                const objsWithPos = objs.map((o: any) => {
                  const pos = layoutObj.nodes.find((n: any) => n.id === o.id);
                  return pos ? { ...o, PositionX: pos.x, PositionY: pos.y } : o;
                });
                setNodes(objsWithPos);
                setLayout(layoutObj);
                return;
              }
            } catch {}
          }
          setNodes(objs);
        });
    });
    api("/relations").then(setEdges);
  }, []);

  const handleAddObject = async (data: {
    name: string;
    objectTypeId: number;
    properties: Record<string, string>;
  }) => {
    const propertiesArr = Object.entries(data.properties).map(
      ([key, value]) => ({
        Key: key,
        Value: value,
      }),
    );
    const payload = {
      Name: data.name,
      ObjectTypeId: data.objectTypeId,
      Properties: propertiesArr,
    };
    const res = await fetch("/api/objects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      toast.error("Ошибка создания объекта: " + text);
      return;
    }
    toast.success("Объект успешно создан");
    const updated = await api("/objects");
    setNodes(prev => mergeNodesWithPositions(updated, prev));
  };

  const findPath = async (from: number, to: number) => {
    const res = await api(`/find-path?sourceId=${from}&targetId=${to}`);
    setPath(res);
  };

  const handleNodeAction = (action: string, node: GraphObject) => {
    if (action === "create-relation") {
      if (
        addRelation.source &&
        !addRelation.target &&
        node.id !== addRelation.source.id
      ) {
        setAddRelation((r) => ({ ...r, target: node }));
        setAddRelationOpen(true);
      } else {
        setAddRelation({ source: node, target: null });
      }
    } else if (action === "edit") {
      handleEditNode(node);
    } else if (action === "delete") {
      handleDeleteNode(node);
    }
  };

  const handleSelectNode = (node: GraphObject) => {
    setSelected({ type: "node", data: node });
  };

  const handleAddRelation = async (data: {
    source: number;
    target: number;
    relationTypeId: number;
    properties: Record<string, string>;
  }) => {
    const payload = {
      Source: data.source,
      Target: data.target,
      RelationTypeId: data.relationTypeId,
      Properties: Object.entries(data.properties).map(([Key, Value]) => ({
        Key,
        Value,
      })),
    };
    const res = await fetch("/api/relations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      toast.error("Ошибка создания связи: " + text);
      return;
    }
    toast.success("Связь успешно создана");
    const updated = await api("/relations");
    setEdges(updated);
  };

  const handleSaveLayout = async () => {
    const layoutObj = {
      nodes: nodes.map((n) => ({
        id: n.id,
        x: n.PositionX ?? 0,
        y: n.PositionY ?? 0,
      }))
    };
    await fetch("/api/layout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layoutJson: JSON.stringify(layoutObj) }),
    });
    toast.success("Сетка успешно сохранена!");
  };

  const handleToolbarSelect = () => toast.info("Режим выделения (MVP)");
  const handleToolbarMove = () => toast.info("Режим перемещения (MVP)");
  const [alignType, setAlignType] = useState<"circle" | "tree">("circle");
  const handleToolbarAlign = () => {
    if (nodes.length === 0) return;
    if (alignType === "circle") {
      const centerX = 500,
        centerY = 350,
        radius = 250;
      const angleStep = (2 * Math.PI) / nodes.length;
      const aligned = nodes.map((node, i) => ({
        ...node,
        PositionX: centerX + radius * Math.cos(i * angleStep),
        PositionY: centerY + radius * Math.sin(i * angleStep),
      }));
      setNodes(aligned);
    } else if (alignType === "tree") {
      const levelHeight = 120;
      const rootX = 500;
      const nodesPerLevel = Math.ceil(Math.sqrt(nodes.length));
      let aligned: any[] = [];
      let idx = 0;
      for (let level = 0; idx < nodes.length; level++) {
        const count = Math.min(nodesPerLevel, nodes.length - idx);
        const startX = rootX - ((count - 1) * 120) / 2;
        for (let i = 0; i < count; i++, idx++) {
          aligned.push({
            ...nodes[idx],
            PositionX: startX + i * 120,
            PositionY: 100 + level * levelHeight,
          });
        }
      }
      setNodes(aligned);
    }
  };
  const handleToolbarFilter = () => setFilterOpen(true);

  const [addObjectTypeOpen, setAddObjectTypeOpen] = useState(false);
  const handleAddObjectType = () => setAddObjectTypeOpen(true);
  const handleCreateObjectType = async (data: {
    name: string;
    description?: string;
  }) => {
    const payload: any = { Name: data.name, Objects: [], RelationTypes: [] };
    if (data.description && data.description.trim() !== "") {
      payload.Description = data.description;
    }
    const res = await fetch("/api/objecttype", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      toast.error("Ошибка создания типа объекта: " + text);
      return;
    }
    toast.success("Тип объекта создан");
    const types = await api("/objecttype");
    setObjectTypes(types);
  };

  const [addRelationTypeOpen, setAddRelationTypeOpen] = useState(false);
  const handleAddRelationType = () => setAddRelationTypeOpen(true);
  const handleCreateRelationType = async (data: {
    name: string;
    description?: string;
    objectTypeId: number;
  }) => {
    await fetch("/api/relationtype", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const relTypes = await fetch("/api/relationtype").then((r) => r.json());
    setRelationTypes(relTypes);
  };

  const filteredRelationTypes =
    addRelation.source && addRelation.source.objectTypeId
      ? relationTypes.filter(
          (rt) => rt.objectTypeId === addRelation.source!.objectTypeId,
        )
      : relationTypes;

  const nodesWithPositions = useMemo(() => {
    return filteredNodes.map((node) => ({
      ...node,
      x: typeof node.PositionX === "number" ? node.PositionX : 0,
      y: typeof node.PositionY === "number" ? node.PositionY : 0,
    }));
  }, [filteredNodes]);

  
  const [editNode, setEditNode] = useState<GraphObject | null>(null);
  const [editEdge, setEditEdge] = useState<GraphRelation | null>(null);

  const handleEditNode = (node: GraphObject) => {
    setEditNode(node);
  };
  const handleDeleteNode = async (node: GraphObject) => {
    if (window.confirm("Удалить объект?")) {
      await fetch(`/api/objects/${node.id}`, { method: "DELETE" });
      setNodes(prev => prev.filter((n) => n.id !== node.id));
      toast.success(`Объект "${node.name}" удалён`);
    }
  };
  const handleEditEdge = (edge: GraphRelation) => {
    setEditEdge(edge);
  };
  const handleDeleteEdge = async (edge: GraphRelation) => {
    if (window.confirm("Удалить связь?")) {
      await fetch(`/api/relations/${edge.id}`, { method: "DELETE" });
      setEdges(edges.filter((e) => e.id !== edge.id));
    }
  };

  const handleSaveEditNode = async (data: {
    id: number;
    name: string;
    objectTypeId: number;
    properties: Record<string, string>;
    color?: string;
    icon?: string;
  }) => {
    const propertiesArr = Object.entries(data.properties).map(
      ([key, value]) => ({ Key: key, Value: value }),
    );
    const payload: any = {
      Id: data.id,
      Name: data.name,
      ObjectTypeId: data.objectTypeId,
      Properties: propertiesArr,
    };
    if (data.color !== undefined) payload.Color = data.color;
    if (data.icon !== undefined) payload.Icon = data.icon;
    const res = await fetch(`/api/objects/${data.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      toast.error("Ошибка редактирования объекта: " + text);
      return;
    }
    toast.success("Объект обновлен");
    const updated = await api("/objects");
    setNodes(prev => mergeNodesWithPositions(updated, prev));
    setEditNode(null);
  };

  const handleSaveEditEdge = async (data: {
    id: number;
    relationTypeId: number;
    properties: Record<string, string>;
  }) => {
    const propertiesArr = Object.entries(data.properties).map(
      ([key, value]) => ({ Key: key, Value: value }),
    );
    const payload = {
      Id: data.id,
      RelationTypeId: data.relationTypeId,
      Properties: propertiesArr,
    };
    const res = await fetch(`/api/relations/${data.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      toast.error("Ошибка редактирования связи: " + text);
      return;
    }
    toast.success("Связь обновлена");
    const updated = await api("/relations");
    setEdges(updated);
    setEditEdge(null);
  };

  const handleDeleteObjectType = async (id: number) => {
    if (window.confirm("Удалить тип объекта?")) {
      await fetch(`/api/objecttype/${id}`, { method: "DELETE" });
      setObjectTypes(objectTypes.filter((t) => t.id !== id));
    }
  };
  
  const handleDeleteRelationType = async (id: number) => {
    if (window.confirm("Удалить тип связи?")) {
      await fetch(`/api/relationtype/${id}`, { method: "DELETE" });
      setRelationTypes(relationTypes.filter((t) => t.id !== id));
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#f4f6fa",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          width: "100vw",
          background: "#f4f6fa",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <Sidebar
            objectTypes={objectTypes}
            relationTypes={relationTypes}
            onAddObjectType={handleAddObjectType}
            onAddRelationType={handleAddRelationType}
            onDeleteObjectType={handleDeleteObjectType}
            onDeleteRelationType={handleDeleteRelationType}
          />
          <div
            style={{ flex: 1, position: "relative", minWidth: 0, minHeight: 0 }}
          >
            {nodes.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  gap: 20,
                  fontFamily: "Segoe UI, sans-serif",
                  color: "#5f6368",
                }}
              >
                <svg
                  width="120"
                  height="120"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  style={{ opacity: 0.3 }}
                >
                  <circle cx="12" cy="5" r="3" />
                  <circle cx="5" cy="19" r="3" />
                  <circle cx="19" cy="19" r="3" />
                  <line x1="12" y1="8" x2="5" y2="16" />
                  <line x1="12" y1="8" x2="19" y2="16" />
                </svg>
                <h2 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>
                  Граф пустой
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    textAlign: "center",
                    maxWidth: 400,
                  }}
                >
                  Начните с создания типов объектов в боковой панели, затем
                  добавьте объекты на граф
                </p>
                <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                  <button
                    onClick={() => setAddObjectTypeOpen(true)}
                    style={{
                      background: "#2196f3",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "12px 24px",
                      fontSize: 16,
                      fontWeight: 500,
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(33,150,243,0.3)",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(33,150,243,0.4)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 2px 8px rgba(33,150,243,0.3)";
                    }}
                  >
                    Создать первый тип объекта
                  </button>
                  {objectTypes.length > 0 && (
                    <button
                      onClick={() => setAddObjectOpen(true)}
                      style={{
                        background: "#fff",
                        color: "#2196f3",
                        border: "2px solid #2196f3",
                        borderRadius: 8,
                        padding: "12px 24px",
                        fontSize: 16,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = "#f0f8ff";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = "#fff";
                      }}
                    >
                      Добавить объект
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <GraphCanvas
                  nodes={nodesWithPositions}
                  edges={filteredEdges}
                  relationTypes={relationTypes}
                  onSelectNode={handleSelectNode}
                  onSelectEdge={(edge) =>
                    setSelected({ type: "edge", data: edge })
                  }
                  onNodeAction={handleNodeAction}
                  onNodesPositionChange={handleNodesPositionChange}
                />
                {selected?.type === "node" && (
                  <ObjectCard object={selected.data} />
                )}
                {selected?.type === "edge" && (
                  <RelationCard
                    relation={selected.data}
                    onEdit={() => handleEditEdge(selected.data)}
                    onDelete={() => handleDeleteEdge(selected.data)}
                  />
                )}
              </>
            )}
          </div>
        </div>
        {/* Actions bar снизу с иконками */}
        <div
          style={{
            height: 60,
            background: "#23272f",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            gap: 32,
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: 0.5,
          }}
        >
          <div style={{ fontSize: 13, color: "#aaa" }}>
            Узлов: {filteredNodes.length}/{nodes.length} | Связей:{" "}
            {filteredEdges.length}/{edges.length}
            {(filters.selectedObjectTypes.length < objectTypes.length ||
              filters.selectedRelationTypes.length < relationTypes.length) && (
              <span style={{ color: "#ff9800", marginLeft: 8 }}>
                • Фильтры активны
              </span>
            )}
          </div>
          <button onClick={handleSaveLayout} style={actionBtn}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <rect
                x="4"
                y="4"
                width="16"
                height="16"
                rx="2"
                stroke="#fff"
                strokeWidth="2"
              />
              <path
                d="M8 12h8"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span style={{ marginLeft: 8 }}>Сохранить</span>
          </button>
          <button onClick={() => setAddObjectOpen(true)} style={actionBtn}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" />
              <path
                d="M12 8v8M8 12h8"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span style={{ marginLeft: 8 }}>Добавить объект</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={handleToolbarAlign} style={actionBtn}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" />
                <path
                  d="M12 2v20M2 12h20"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span style={{ marginLeft: 8 }}>Выравнивание</span>
            </button>
            <select
              value={alignType}
              onChange={(e) =>
                setAlignType(e.target.value as "circle" | "tree")
              }
              style={{
                marginLeft: 4,
                borderRadius: 6,
                border: "none",
                padding: "6px 10px",
                fontSize: 16,
                fontWeight: 500,
                background: "#fff",
                color: "#23272f",
                cursor: "pointer",
              }}
            >
              <option value="circle">Круг</option>
              <option value="tree">Дерево</option>
            </select>
          </div>
          <button
            onClick={handleToolbarFilter}
            style={{ ...actionBtn, position: "relative" }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 6h16M6 12h12M8 18h8"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span style={{ marginLeft: 8 }}>Фильтр</span>
            {(filters.selectedObjectTypes.length < objectTypes.length ||
              filters.selectedRelationTypes.length < relationTypes.length ||
              !filters.showIsolatedNodes) && (
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  background: "#ff5722",
                  color: "#fff",
                  borderRadius: "50%",
                  width: 20,
                  height: 20,
                  fontSize: 11,
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }}
              >
                {objectTypes.length -
                  filters.selectedObjectTypes.length +
                  (relationTypes.length -
                    filters.selectedRelationTypes.length) +
                  (filters.showIsolatedNodes ? 0 : 1)}
              </span>
            )}
          </button>
        </div>
        <AddObjectModal
          open={addObjectOpen || !!editNode}
          onClose={() => {
            setAddObjectOpen(false);
            setEditNode(null);
          }}
          onCreate={handleAddObject}
          onEdit={handleSaveEditNode}
          objectTypes={objectTypes}
          editData={
            editNode
              ? {
                  id: editNode.id,
                  name: editNode.name,
                  objectTypeId: editNode.objectTypeId,
                  properties: Array.isArray(editNode.properties)
                    ? editNode.properties.reduce((acc: any, p: any) => {
                        acc[p.key || p.Key] = p.value || p.Value;
                        return acc;
                      }, {})
                    : typeof editNode.properties === "object"
                      ? editNode.properties
                      : {},
                }
              : undefined
          }
        />
        <AddRelationModal
          open={addRelationOpen || !!editEdge}
          onClose={() => {
            setAddRelation({ source: null, target: null });
            setAddRelationOpen(false);
            setEditEdge(null);
          }}
          onCreate={(data) => {
            handleAddRelation(data);
            setAddRelation({ source: null, target: null });
            setAddRelationOpen(false);
          }}
          onEdit={handleSaveEditEdge}
          relationTypes={filteredRelationTypes}
          sourceId={addRelation.source?.id || (editEdge ? editEdge.source : 0)}
          targetId={addRelation.target?.id || (editEdge ? editEdge.target : 0)}
          editData={
            editEdge
              ? {
                  id: editEdge.id,
                  relationTypeId: editEdge.relationTypeId,
                  properties: Array.isArray(editEdge.properties)
                    ? editEdge.properties.reduce((acc: any, p: any) => {
                        acc[p.key || p.Key] = p.value || p.Value;
                        return acc;
                      }, {})
                    : typeof editEdge.properties === "object"
                      ? editEdge.properties
                      : {},
                }
              : undefined
          }
        />
        <AddObjectTypeModal
          open={addObjectTypeOpen}
          onClose={() => setAddObjectTypeOpen(false)}
          onCreate={handleCreateObjectType}
        />
        <AddRelationTypeModal
          open={addRelationTypeOpen}
          onClose={() => setAddRelationTypeOpen(false)}
          onCreate={handleCreateRelationType}
          objectTypes={objectTypes}
        />
        <FilterModal
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          objectTypes={objectTypes}
          relationTypes={relationTypes}
          onApplyFilter={handleApplyFilter}
          currentFilters={filters}
        />
      </div>
    </div>
  );
}

const actionBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#fff",
  borderRadius: 8,
  padding: "8px 18px",
  fontSize: 17,
  fontWeight: 500,
  display: "flex",
  alignItems: "center",
  cursor: "pointer",
  transition: "background 0.15s",
};
