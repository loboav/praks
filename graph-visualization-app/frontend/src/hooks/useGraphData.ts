import { useState, useCallback } from 'react';
import { GraphObject, GraphRelation, ObjectType, RelationType } from '../types/graph';
import { toast } from 'react-toastify';

const api = (path: string, opts?: any) =>
  fetch("/api" + path, opts).then((r) => r.json());

interface UseGraphDataProps {
  onAddHistoryAction?: (action: any) => void;
}

export const useGraphData = ({ onAddHistoryAction }: UseGraphDataProps = {}) => {
  const [nodes, setNodes] = useState<GraphObject[]>([]);
  const [edges, setEdges] = useState<GraphRelation[]>([]);
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
  const [relationTypes, setRelationTypes] = useState<RelationType[]>([]);

  const mergeNodesWithPositions = useCallback((newNodes: GraphObject[], existingNodes: GraphObject[]) => {
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
  }, []);

  const loadInitialData = useCallback(async (layoutLoader?: () => Promise<any>) => {
    const [objTypes, relTypes] = await Promise.all([
      api("/objecttype"),
      api("/relationtype"),
    ]);
    
    setObjectTypes(objTypes);
    setRelationTypes(relTypes);

    const objs = await api("/objects");
    
    if (layoutLoader) {
      const layoutObj = await layoutLoader();
      if (layoutObj && Array.isArray(layoutObj.nodes)) {
        const objsWithPos = objs.map((o: any) => {
          const pos = layoutObj.nodes.find((n: any) => n.id === o.id);
          return pos ? { ...o, PositionX: pos.x, PositionY: pos.y } : o;
        });
        setNodes(objsWithPos);
      } else {
        setNodes(objs);
      }
    } else {
      setNodes(objs);
    }

    const relations = await api("/relations");
    setEdges(relations);
  }, []);

  const addObject = useCallback(async (data: {
    name: string;
    objectTypeId: number;
    properties: Record<string, string>;
  }) => {
    const propertiesArr = Object.entries(data.properties).map(
      ([key, value]) => ({ Key: key, Value: value })
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
    
    const createdObj = await res.json();
    const updated = await api("/objects");
    setNodes(prev => mergeNodesWithPositions(updated, prev));
    
    if (onAddHistoryAction) {
      onAddHistoryAction({
        type: 'create',
        description: `Создан объект "${data.name}"`,
        undo: async () => {
          await fetch(`/api/objects/${createdObj.id}`, { method: 'DELETE' });
          setNodes(prev => prev.filter(n => n.id !== createdObj.id));
        },
        redo: async () => {
          await fetch('/api/objects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const updated = await api('/objects');
          setNodes(prev => mergeNodesWithPositions(updated, prev));
        },
      });
    }
  }, [mergeNodesWithPositions, onAddHistoryAction]);

  const updateObject = useCallback(async (data: {
    id: number;
    name: string;
    objectTypeId: number;
    properties: Record<string, string>;
    color?: string;
    icon?: string;
  }) => {
    const oldNode = nodes.find(n => n.id === data.id);
    if (!oldNode) return;
    
    const propertiesArr = Object.entries(data.properties).map(
      ([key, value]) => ({ Key: key, Value: value })
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
    
    const updated = await api("/objects");
    setNodes(prev => mergeNodesWithPositions(updated, prev));
    
    if (onAddHistoryAction) {
      const oldPropertiesArr = Array.isArray(oldNode.properties)
        ? oldNode.properties.map((p: any) => ({
            Key: p.key || p.Key,
            Value: p.value || p.Value,
          }))
        : [];
      
      const oldPayload: any = {
        Id: oldNode.id,
        Name: oldNode.name,
        ObjectTypeId: oldNode.objectTypeId,
        Properties: oldPropertiesArr,
      };
      
      onAddHistoryAction({
        type: 'update',
        description: `Изменён объект "${data.name}"`,
        undo: async () => {
          await fetch(`/api/objects/${data.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(oldPayload),
          });
          const updated = await api('/objects');
          setNodes(prev => mergeNodesWithPositions(updated, prev));
        },
        redo: async () => {
          await fetch(`/api/objects/${data.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const updated = await api('/objects');
          setNodes(prev => mergeNodesWithPositions(updated, prev));
        },
      });
    }
  }, [nodes, mergeNodesWithPositions, onAddHistoryAction]);

  const deleteObject = useCallback(async (node: GraphObject) => {
    const deletedNode = { ...node };
    let restoredNodeId: number | null = null;
    const restoredEdgeIds: Map<number, number> = new Map();
    
    const relatedEdges = edges.filter(e => e.source === node.id || e.target === node.id);
    
    await fetch(`/api/objects/${node.id}`, { method: "DELETE" });
    setNodes(prev => prev.filter((n) => n.id !== node.id));
    
    if (onAddHistoryAction) {
      onAddHistoryAction({
        type: 'delete',
        description: `Удалён объект "${deletedNode.name}"`,
        undo: async () => {
          const propertiesArr = Array.isArray(deletedNode.properties)
            ? deletedNode.properties.map((p: any) => ({
                Key: p.key || p.Key,
                Value: p.value || p.Value,
              }))
            : [];
          
          const res = await fetch('/api/objects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              Name: deletedNode.name,
              ObjectTypeId: deletedNode.objectTypeId,
              Properties: propertiesArr,
              PositionX: deletedNode.PositionX,
              PositionY: deletedNode.PositionY,
            }),
          });
          const created = await res.json();
          restoredNodeId = created.id;
          const updated = await api('/objects');
          setNodes(prev => mergeNodesWithPositions(updated, prev));
          
          restoredEdgeIds.clear();
          for (const edge of relatedEdges) {
            const edgePropertiesArr = Array.isArray(edge.properties)
              ? edge.properties.map((p: any) => ({
                  Key: p.key || p.Key,
                  Value: p.value || p.Value,
                }))
              : [];
            
            const edgeRes = await fetch('/api/relations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                Source: edge.source === deletedNode.id ? restoredNodeId : edge.source,
                Target: edge.target === deletedNode.id ? restoredNodeId : edge.target,
                RelationTypeId: edge.relationTypeId,
                Properties: edgePropertiesArr,
              }),
            });
            const createdEdge = await edgeRes.json();
            restoredEdgeIds.set(edge.id, createdEdge.id);
          }
          const updatedEdges = await api('/relations');
          setEdges(updatedEdges);
        },
        redo: async () => {
          const idToDelete = restoredNodeId || deletedNode.id;
          await fetch(`/api/objects/${idToDelete}`, { method: 'DELETE' });
          setNodes(prev => prev.filter((n) => n.id !== idToDelete));
          
          if (restoredEdgeIds.size > 0) {
            await Promise.all(
              Array.from(restoredEdgeIds.values()).map(edgeId => 
                fetch(`/api/relations/${edgeId}`, { method: 'DELETE' })
              )
            );
            const updatedEdges = await api('/relations');
            setEdges(updatedEdges);
          }
        },
      });
    }
  }, [edges, mergeNodesWithPositions, onAddHistoryAction]);

  const addRelation = useCallback(async (data: {
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
    
    const createdRelation = await res.json();
    const updated = await api("/relations");
    setEdges(updated);
    
    if (onAddHistoryAction) {
      const sourceNode = nodes.find(n => n.id === data.source);
      const targetNode = nodes.find(n => n.id === data.target);
      
      onAddHistoryAction({
        type: 'create',
        description: `Создана связь ${sourceNode?.name || data.source} → ${targetNode?.name || data.target}`,
        undo: async () => {
          await fetch(`/api/relations/${createdRelation.id}`, { method: 'DELETE' });
          const updated = await api('/relations');
          setEdges(updated);
        },
        redo: async () => {
          await fetch('/api/relations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const updated = await api('/relations');
          setEdges(updated);
        },
      });
    }
  }, [nodes, onAddHistoryAction]);

  const updateRelation = useCallback(async (data: {
    id: number;
    relationTypeId: number;
    properties: Record<string, string>;
  }) => {
    const propertiesArr = Object.entries(data.properties).map(
      ([key, value]) => ({ Key: key, Value: value })
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
  }, []);

  const deleteRelation = useCallback(async (edge: GraphRelation) => {
    const deletedEdge = { ...edge };
    let restoredEdgeId: number | null = null;
    
    await fetch(`/api/relations/${edge.id}`, { method: "DELETE" });
    setEdges(edges.filter((e) => e.id !== edge.id));
    
    if (onAddHistoryAction) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      onAddHistoryAction({
        type: 'delete',
        description: `Удалена связь ${sourceNode?.name || edge.source} → ${targetNode?.name || edge.target}`,
        undo: async () => {
          const propertiesArr = Array.isArray(deletedEdge.properties)
            ? deletedEdge.properties.map((p: any) => ({
                Key: p.key || p.Key,
                Value: p.value || p.Value,
              }))
            : [];
          
          const res = await fetch('/api/relations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              Source: deletedEdge.source,
              Target: deletedEdge.target,
              RelationTypeId: deletedEdge.relationTypeId,
              Properties: propertiesArr,
            }),
          });
          const created = await res.json();
          restoredEdgeId = created.id;
          const updated = await api('/relations');
          setEdges(updated);
        },
        redo: async () => {
          const idToDelete = restoredEdgeId || deletedEdge.id;
          await fetch(`/api/relations/${idToDelete}`, { method: 'DELETE' });
          setEdges(prev => prev.filter(e => e.id !== idToDelete));
        },
      });
    }
  }, [edges, nodes, onAddHistoryAction]);

  const updateNodesPositions = useCallback((
    positions: { id: number; x: number; y: number }[]
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
  }, []);

  const addObjectType = useCallback(async (data: {
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
  }, []);

  const deleteObjectType = useCallback(async (id: number) => {
    await fetch(`/api/objecttype/${id}`, { method: "DELETE" });
    setObjectTypes(objectTypes.filter((t) => t.id !== id));
  }, [objectTypes]);

  const addRelationType = useCallback(async (data: {
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
  }, []);

  const deleteRelationType = useCallback(async (id: number) => {
    await fetch(`/api/relationtype/${id}`, { method: "DELETE" });
    setRelationTypes(relationTypes.filter((t) => t.id !== id));
  }, [relationTypes]);

  return {
    nodes,
    edges,
    objectTypes,
    relationTypes,
    setNodes,
    setEdges,
    loadInitialData,
    addObject,
    updateObject,
    deleteObject,
    addRelation,
    updateRelation,
    deleteRelation,
    updateNodesPositions,
    addObjectType,
    deleteObjectType,
    addRelationType,
    deleteRelationType,
    mergeNodesWithPositions,
  };
};
