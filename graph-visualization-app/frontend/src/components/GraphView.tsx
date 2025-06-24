import React, { useEffect, useRef, useState } from "react";
import { DataSet, Network } from "vis-network/standalone";
import { GraphObject, GraphRelation, ObjectType, RelationType } from "../types/graph";

const api = (path: string, opts?: any) =>
  fetch("/api/graph" + path, opts).then(r => r.json());

export default function GraphView() {
  const container = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<GraphObject[]>([]);
  const [edges, setEdges] = useState<GraphRelation[]>([]);
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
  const [relationTypes, setRelationTypes] = useState<RelationType[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [path, setPath] = useState<number[]>([]);

  // Загрузка данных
  useEffect(() => {
    api("/object-types").then(setObjectTypes);
    api("/relation-types").then(setRelationTypes);
    api("/objects").then(setNodes);
    api("/relations").then(setEdges);
  }, []);

  // Визуализация
  useEffect(() => {
    if (!container.current) return;
    const visNodes = new DataSet(nodes.map(n => ({
      id: n.id, label: n.name, group: String(n.objectTypeId) // group должен быть строкой
    })));
    const visEdges = new DataSet(edges.map(e => ({
      id: e.id, from: e.source, to: e.target, label: relationTypes.find(rt => rt.id === e.relationTypeId)?.name
    })));
    const network = new Network(container.current, { nodes: visNodes, edges: visEdges }, {
      nodes: { shape: "ellipse" }, edges: { arrows: "to" }
    });
    network.on("selectNode", params => {
      const node = nodes.find(n => n.id === params.nodes[0]);
      setSelected({ type: "node", data: node });
    });
    network.on("selectEdge", params => {
      const edge = edges.find(e => e.id === params.edges[0]);
      setSelected({ type: "edge", data: edge });
    });
    return () => network.destroy();
  }, [nodes, edges, relationTypes]);

  // Примитивные формы для CRUD (можно доработать)
  const [newObjectType, setNewObjectType] = useState({ name: '', description: '' });
  const [newRelationType, setNewRelationType] = useState({ name: '', description: '', objectTypeId: 0 });
  const [newObject, setNewObject] = useState<{ name: string; objectTypeId: number; properties: Record<string, string> }>({
    name: '',
    objectTypeId: 0,
    properties: {}
  });
  const [newRelation, setNewRelation] = useState<{ source: number; target: number; relationTypeId: number; properties: Record<string, string> }>({
    source: 0,
    target: 0,
    relationTypeId: 0,
    properties: {}
  });

  const handleCreateObjectType = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/graph/object-type', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newObjectType)
    });
    setNewObjectType({ name: '', description: '' });
    api("/object-types").then(setObjectTypes);
  };

  const handleCreateRelationType = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/graph/relation-type', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRelationType)
    });
    setNewRelationType({ name: '', description: '', objectTypeId: 0 });
    api("/relation-types").then(setRelationTypes);
  };

  const handleCreateObject = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/graph/create-object', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newObject)
    });
    setNewObject({ name: '', objectTypeId: 0, properties: {} });
    api("/objects").then(setNodes);
  };

  const handleCreateRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/graph/create-relation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRelation)
    });
    setNewRelation({ source: 0, target: 0, relationTypeId: 0, properties: {} });
    api("/relations").then(setEdges);
  };

  // Поиск пути
  const findPath = async (from: number, to: number) => {
    const res = await api(`/find-path?sourceId=${from}&targetId=${to}`);
    setPath(res);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 16 }}>
        <div>
          <h3>Граф</h3>
          <div ref={container} style={{ width: 600, height: 400, border: "1px solid #ccc" }} />
        </div>
        <div>
          <h3>Типы объектов</h3>
          <ul>
            {objectTypes.map(t => <li key={t.id}>{t.name}</li>)}
          </ul>
          <h3>Типы связей</h3>
          <ul>
            {relationTypes.map(t => <li key={t.id}>{t.name} (для типа {t.objectTypeId})</li>)}
          </ul>
          <h3>Объекты</h3>
          <ul>
            {nodes.map(n => <li key={n.id}>{n.name} (тип {n.objectTypeId})</li>)}
          </ul>
          <h3>Связи</h3>
          <ul>
            {edges.map(e => <li key={e.id}>#{e.id}: {e.source} → {e.target} ({e.relationTypeId})</li>)}
          </ul>
        </div>
        <div>
          <h3>Карточка</h3>
          {selected?.type === "node" && (
            <div>
              <b>Объект:</b> {selected.data.name}
              <ul>
                {Object.entries(selected.data.properties || {}).map(([k, v]) => <li key={k}>{k}: {String(v)}</li>)}
              </ul>
            </div>
          )}
          {selected?.type === "edge" && (
            <div>
              <b>Связь:</b> #{selected.data.id}
              <ul>
                {Object.entries(selected.data.properties || {}).map(([k, v]) => <li key={k}>{k}: {String(v)}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
      <div>
        <h3>Поиск пути</h3>
        <form onSubmit={e => { e.preventDefault(); findPath(Number(e.currentTarget.from.value), Number(e.currentTarget.to.value)); }}>
          <input name="from" type="number" placeholder="ID от" required />
          <input name="to" type="number" placeholder="ID до" required />
          <button type="submit">Найти путь</button>
        </form>
        {path.length > 0 && <div>Путь: {path.join(" → ")}</div>}
      </div>
    </div>
  );
}