import React, { useEffect, useRef, useState } from "react";
import { GraphObject, GraphRelation, ObjectType, RelationType } from "../types/graph";
import GraphCanvas from "./GraphCanvas";
import ObjectCard from "./ObjectCard";
import RelationCard from "./RelationCard";
import SearchPanel from "./SearchPanel";
import AddObjectModal from "./modals/AddObjectModal";
import AddRelationModal from "./modals/AddRelationModal";
import AddObjectTypeModal from "./modals/AddObjectTypeModal";
import AddRelationTypeModal from "./modals/AddRelationTypeModal";
import Toolbar from "./Toolbar";
import Sidebar from "./Sidebar";
import BatchEditModal from "./BatchEditModal";

const api = (path: string, opts?: any) =>
  fetch("/api" + path, opts).then(r => r.json());

export default function GraphView() {
  const [nodes, setNodes] = useState<GraphObject[]>([]);
  const [edges, setEdges] = useState<GraphRelation[]>([]);
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
  const [relationTypes, setRelationTypes] = useState<RelationType[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [path, setPath] = useState<number[]>([]);
  const [addObjectOpen, setAddObjectOpen] = useState(false);
  const [addRelation, setAddRelation] = useState<{ source: GraphObject | null; target: GraphObject | null }>({ source: null, target: null });
  const [addRelationOpen, setAddRelationOpen] = useState(false);

  // --- Массовое выделение ---
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [batchEditOpen, setBatchEditOpen] = useState(false);

  useEffect(() => {
    api("/objecttype").then(setObjectTypes);
    api("/relationtype").then(setRelationTypes);
    api("/objects").then(setNodes);
    api("/relations").then(setEdges);
  }, []);

  const handleAddObject = async (data: { name: string; objectTypeId: number; properties: Record<string, string>; color?: string; icon?: string }) => {
    const propertiesArr = Object.entries(data.properties).map(([key, value]) => ({
      Key: key,
      Value: value
    }));
    const payload: any = {
      Name: data.name,
      ObjectTypeId: data.objectTypeId,
      Properties: propertiesArr
    };
    if (data.color) payload.Color = data.color;
    if (data.icon) payload.Icon = data.icon;
    const res = await fetch('/api/objects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text();
      alert('Ошибка создания объекта: ' + text);
      return;
    }
    const updated = await api('/objects');
    setNodes(updated);
  };

  const findPath = async (from: number, to: number) => {
    const res = await api(`/find-path?sourceId=${from}&targetId=${to}`);
    setPath(res);
  };

  const handleNodeAction = (action: string, node: GraphObject) => {
    if (action === 'create-relation') {
      // Если уже выбран source, а клик по другому объекту — это target
      if (addRelation.source && !addRelation.target && node.id !== addRelation.source.id) {
        setAddRelation(r => ({ ...r, target: node }));
        setAddRelationOpen(true);
      } else {
        // Первый клик — выбираем source
        setAddRelation({ source: node, target: null });
        // Не открываем модалку сразу, ждём второго объекта
      }
    } else if (action === 'edit') {
      handleEditNode(node);
    } else if (action === 'delete') {
      handleDeleteNode(node);
    }
  };

  const handleSelectNode = (node: GraphObject) => {
    setSelected({ type: "node", data: node });
    // Не открываем модалку для связи здесь, только через onNodeAction
  };

  const handleAddRelation = async (data: { source: number; target: number; relationTypeId: number; properties: Record<string, string> }) => {
    // Формируем payload в стиле .NET backend
    const payload = {
      Source: data.source,
      Target: data.target,
      RelationTypeId: data.relationTypeId,
      Properties: Object.entries(data.properties).map(([Key, Value]) => ({ Key, Value }))
    };
    console.log('POST /api/relations', payload);
    const res = await fetch('/api/relations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text();
      alert('Ошибка создания связи: ' + text);
      return;
    }
    const updated = await api('/relations');
    setEdges(updated);
  };

  // Toolbar режимы
  const handleToolbarSelect = () => alert('Режим выделения (MVP)');
  const handleToolbarMove = () => alert('Режим перемещения (MVP)');
  const handleToolbarAlign = () => alert('Выравнивание (MVP)');
  const handleToolbarFilter = () => alert('Фильтр (MVP)');

  // Модальное окно для типа объекта
  const [addObjectTypeOpen, setAddObjectTypeOpen] = useState(false);
  const handleAddObjectType = () => setAddObjectTypeOpen(true);
  const handleCreateObjectType = async (data: { name: string; description?: string }) => {
    const payload: any = { Name: data.name, Objects: [], RelationTypes: [] };
    if (data.description && data.description.trim() !== '') {
      payload.Description = data.description;
    }
    const res = await fetch('/api/objecttype', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text();
      alert('Ошибка создания типа объекта: ' + text);
      return;
    }
    const types = await api('/objecttype');
    setObjectTypes(types);
  };

  // Модальное окно для типа связи
  const [addRelationTypeOpen, setAddRelationTypeOpen] = useState(false);
  const handleAddRelationType = () => setAddRelationTypeOpen(true);
  const handleCreateRelationType = async (data: { name: string; description?: string; objectTypeId: number }) => {
    await fetch('/api/relationtype', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const relTypes = await fetch('/api/relationtype').then(r => r.json());
    setRelationTypes(relTypes);
  };

  // Actions bar
  const [searchOpen, setSearchOpen] = useState(false);

  // Фильтрация типов связей по типу исходного объекта
  const filteredRelationTypes = addRelation.source && addRelation.source.objectTypeId
    ? relationTypes.filter(rt => rt.objectTypeId === addRelation.source!.objectTypeId)
    : relationTypes;

  // Генерируем координаты для объектов без координат и приводим к x/y/id:string для GraphCanvas
  const nodesWithPositions = nodes.map(node => {
    const x = typeof node.PositionX === 'number' ? node.PositionX : Math.random() * 600 + 100;
    const y = typeof node.PositionY === 'number' ? node.PositionY : Math.random() * 400 + 100;
    return {
      ...node,
      // id оставляем числом, чтобы не ломать типизацию
      PositionX: x,
      PositionY: y,
      x,
      y,
      label: node.name || ''
    };
  });
  // Для отладки: выводим, что реально передаём в GraphCanvas
  console.log('nodesWithPositions', nodesWithPositions);
  console.log('edges', edges);

  // Редактирование и удаление объектов и связей
  const [editNode, setEditNode] = useState<GraphObject | null>(null);
  const [editEdge, setEditEdge] = useState<GraphRelation | null>(null);

  const handleEditNode = (node: GraphObject) => {
    setEditNode(node);
  };
  const handleDeleteNode = async (node: GraphObject) => {
    if (window.confirm('Удалить объект?')) {
      await fetch(`/api/objects/${node.id}`, { method: 'DELETE' });
      setNodes(nodes.filter(n => n.id !== node.id));
    }
  };
  const handleEditEdge = (edge: GraphRelation) => {
    setEditEdge(edge);
  };
  const handleDeleteEdge = async (edge: GraphRelation) => {
    if (window.confirm('Удалить связь?')) {
      await fetch(`/api/relations/${edge.id}`, { method: 'DELETE' });
      setEdges(edges.filter(e => e.id !== edge.id));
    }
  };

  // Сохранение изменений объекта
  const handleSaveEditNode = async (data: { id: number; name: string; objectTypeId: number; properties: Record<string, string>; color?: string; icon?: string }) => {
    const propertiesArr = Object.entries(data.properties).map(([key, value]) => ({ Key: key, Value: value }));
    const payload: any = {
      Id: data.id,
      Name: data.name,
      ObjectTypeId: data.objectTypeId,
      Properties: propertiesArr
    };
    if (data.color) payload.Color = data.color;
    if (data.icon) payload.Icon = data.icon;
    const res = await fetch(`/api/objects/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text();
      alert('Ошибка редактирования объекта: ' + text);
      return;
    }
    const updated = await api('/objects');
    setNodes(updated);
    setEditNode(null);
  };

  // Сохранение изменений связи
  const handleSaveEditEdge = async (data: { id: number; relationTypeId: number; properties: Record<string, string> }) => {
    const propertiesArr = Object.entries(data.properties).map(([key, value]) => ({ Key: key, Value: value }));
    const payload = {
      Id: data.id,
      RelationTypeId: data.relationTypeId,
      Properties: propertiesArr
    };
    const res = await fetch(`/api/relations/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text();
      alert('Ошибка редактирования связи: ' + text);
      return;
    }
    const updated = await api('/relations');
    setEdges(updated);
    setEditEdge(null);
  };

  // Удаление типа объекта
  const handleDeleteObjectType = async (id: number) => {
    if (window.confirm('Удалить тип объекта?')) {
      await fetch(`/api/objecttype/${id}`, { method: 'DELETE' });
      setObjectTypes(objectTypes.filter(t => t.id !== id));
    }
  };
  // Удаление типа связи
  const handleDeleteRelationType = async (id: number) => {
    if (window.confirm('Удалить тип связи?')) {
      await fetch(`/api/relationtype/${id}`, { method: 'DELETE' });
      setRelationTypes(relationTypes.filter(t => t.id !== id));
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#f4f6fa', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#f4f6fa', overflow: 'hidden' }}>
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <Sidebar
            objectTypes={objectTypes}
            relationTypes={relationTypes}
            onAddObjectType={handleAddObjectType}
            onAddRelationType={handleAddRelationType}
            onDeleteObjectType={handleDeleteObjectType}
            onDeleteRelationType={handleDeleteRelationType}
          />
          <div style={{ flex: 1, position: 'relative', minWidth: 0, minHeight: 0 }}>
            <GraphCanvas
              nodes={nodesWithPositions}
              edges={edges}
              relationTypes={relationTypes}
              onSelectNode={node => {
                if (window.event && (window.event as MouseEvent).ctrlKey) {
                  setSelectedNodes(prev =>
                    prev.includes(node.id) ? prev.filter(id => id !== node.id) : [...prev, node.id]
                  );
                } else {
                  setSelectedNodes([node.id]);
                }
                setSelected({ type: "node", data: node });
              }}
              onSelectEdge={edge => setSelected({ type: "edge", data: edge })}
              onNodeAction={handleNodeAction}
              selectedNodes={selectedNodes}
            />
        {/* Кнопка массового редактирования */}
        {selectedNodes.length > 1 && (
          <button style={{ position: 'fixed', bottom: 80, right: 40, zIndex: 1002, background: '#2196f3', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 18, fontWeight: 600, boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
            onClick={() => setBatchEditOpen(true)}>
            Редактировать выбранные ({selectedNodes.length})
          </button>
        )}

        {/* Модалка массового редактирования */}
        {batchEditOpen && (
          <BatchEditModal
            open={batchEditOpen}
            onClose={() => setBatchEditOpen(false)}
            onSave={async (fields) => {
              await fetch('/api/objects/batch-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedNodes, fields })
              });
              setBatchEditOpen(false);
              setSelectedNodes([]);
              const updated = await api('/objects');
              setNodes(updated);
            }}
          />
        )}
            {selected?.type === "node" && <ObjectCard object={selected.data} />}
            {selected?.type === "edge" && (
              <RelationCard relation={selected.data} onEdit={() => handleEditEdge(selected.data)} onDelete={() => handleDeleteEdge(selected.data)} />
            )}
          </div>
        </div>
        {/* Actions bar снизу с иконками */}
        <div style={{ height: 60, background: '#23272f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, fontSize: 18, fontWeight: 500, letterSpacing: 0.5 }}>
          <button onClick={() => setAddObjectOpen(true)} style={actionBtn}><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2"/><path d="M12 8v8M8 12h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg><span style={{ marginLeft: 8 }}>Добавить объект</span></button>
          <button onClick={() => setAddRelation({ source: null, target: null })} style={actionBtn}><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="7" cy="12" r="3" stroke="#fff" strokeWidth="2"/><circle cx="17" cy="12" r="3" stroke="#fff" strokeWidth="2"/><path d="M10 12h4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg><span style={{ marginLeft: 8 }}>Добавить связь</span></button>
          <button onClick={() => setSearchOpen(true)} style={actionBtn}><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="2"/><path d="M20 20l-3-3" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg><span style={{ marginLeft: 8 }}>Поиск пути</span></button>
          <button onClick={() => alert('Фильтр (MVP)')} style={actionBtn}><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M6 12h12M8 18h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg><span style={{ marginLeft: 8 }}>Фильтр</span></button>
        </div>
        <AddObjectModal
          open={addObjectOpen || !!editNode}
          onClose={() => { setAddObjectOpen(false); setEditNode(null); }}
          onCreate={handleAddObject}
          onEdit={handleSaveEditNode}
          objectTypes={objectTypes}
          editData={editNode ? {
            id: editNode.id,
            name: editNode.name,
            objectTypeId: editNode.objectTypeId,
            properties: Array.isArray(editNode.properties)
              ? editNode.properties.reduce((acc: any, p: any) => {
                  acc[p.key || p.Key] = p.value || p.Value;
                  return acc;
                }, {})
              : (typeof editNode.properties === 'object' ? editNode.properties : {}),
            color: editNode.color,
            icon: editNode.icon
          } : undefined}
        />
        <AddRelationModal
          open={addRelationOpen || !!editEdge}
          onClose={() => { setAddRelation({ source: null, target: null }); setAddRelationOpen(false); setEditEdge(null); }}
          onCreate={data => { handleAddRelation(data); setAddRelation({ source: null, target: null }); setAddRelationOpen(false); }}
          onEdit={handleSaveEditEdge}
          relationTypes={filteredRelationTypes}
          sourceId={addRelation.source?.id || (editEdge ? editEdge.source : 0)}
          targetId={addRelation.target?.id || (editEdge ? editEdge.target : 0)}
          editData={editEdge ? {
            id: editEdge.id,
            relationTypeId: editEdge.relationTypeId,
            properties: Array.isArray(editEdge.properties)
              ? editEdge.properties.reduce((acc: any, p: any) => {
                  acc[p.key || p.Key] = p.value || p.Value;
                  return acc;
                }, {})
              : (typeof editEdge.properties === 'object' ? editEdge.properties : {})
          } : undefined}
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
        {/* Модальное окно поиска пути */}
        {searchOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', padding: 28, borderRadius: 12, minWidth: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', fontFamily: 'Segoe UI' }}>
              <SearchPanel findPath={findPath} path={path} />
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <button onClick={() => setSearchOpen(false)} style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 6, padding: '7px 18px', fontWeight: 500, fontSize: 16, cursor: 'pointer' }}>Закрыть</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const actionBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#fff',
  borderRadius: 8,
  padding: '8px 18px',
  fontSize: 17,
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  transition: 'background 0.15s',
};