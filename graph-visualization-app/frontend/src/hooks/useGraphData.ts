import { useState, useCallback } from 'react';
import { GraphObject, GraphRelation, ObjectType, RelationType } from '../types/graph';
import { toast } from 'react-toastify';
import { apiClient } from '../utils/apiClient';

const api = async (path: string, opts?: any) => {
  const response = await apiClient.get('/api' + path, opts);
  return response.json();
};

interface UseGraphDataProps {
  onAddHistoryAction?: (action: any) => void;
}

export const useGraphData = ({ onAddHistoryAction }: UseGraphDataProps = {}) => {
  const [nodes, setNodes] = useState<GraphObject[]>([]);
  const [edges, setEdges] = useState<GraphRelation[]>([]);
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
  const [relationTypes, setRelationTypes] = useState<RelationType[]>([]);

  const mergeNodesWithPositions = useCallback(
    (newNodes: GraphObject[], existingNodes: GraphObject[]) => {
      // O(n) Map lookup вместо O(n²) .find() в цикле
      const existingMap = new Map<number, GraphObject>();
      existingNodes.forEach(n => existingMap.set(n.id, n));

      return newNodes.map(newNode => {
        const existing = existingMap.get(newNode.id);
        if (existing && (existing.PositionX !== undefined || existing.PositionY !== undefined)) {
          return {
            ...newNode,
            PositionX: existing.PositionX,
            PositionY: existing.PositionY,
          };
        }
        if (newNode.PositionX === undefined || newNode.PositionY === undefined) {
          return {
            ...newNode,
            PositionX: Math.random() * 800 + 100,
            PositionY: Math.random() * 500 + 100,
          };
        }
        return newNode;
      });
    },
    []
  );

  const loadInitialData = useCallback(async (layoutLoader?: () => Promise<any>) => {
    const [objTypes, relTypes] = await Promise.all([api('/object-types'), api('/relation-types')]);

    setObjectTypes(objTypes);
    setRelationTypes(relTypes);

    // Check localStorage for hidden mode
    const graphMode = localStorage.getItem('graph_mode');
    let objs: GraphObject[] = [];

    if (graphMode === 'hidden') {
      // Load only saved visible nodes
      const savedIdsStr = localStorage.getItem('visible_node_ids');
      const savedIds: number[] = savedIdsStr ? JSON.parse(savedIdsStr) : [];

      if (savedIds.length > 0) {
        const res = await apiClient.post('/api/objects/batch', savedIds);
        objs = await res.json();
      }
      // If savedIds is empty, objs stays empty - that's correct for hidden mode
    } else {
      // Normal mode - load all objects
      objs = await api('/objects');
    }

    if (layoutLoader) {
      const layoutObj = await layoutLoader();
      if (layoutObj && Array.isArray(layoutObj.nodes)) {
        // O(n) Map lookup вместо O(n²) .find() в цикле
        const posMap = new Map<number, { x: number; y: number }>();
        layoutObj.nodes.forEach((n: any) => posMap.set(n.id, { x: n.x, y: n.y }));

        const objsWithPos = objs.map((o: any) => {
          const pos = posMap.get(o.id);
          return pos ? { ...o, PositionX: pos.x, PositionY: pos.y } : o;
        });
        setNodes(objsWithPos);
      } else {
        setNodes(objs);
      }
    } else {
      setNodes(objs);
    }

    const relations = await api('/relations');
    setEdges(relations);
  }, []);

  const addObject = useCallback(
    async (data: {
      name: string;
      objectTypeId: number;
      properties: Record<string, string>;
      color?: string;
      icon?: string;
    }) => {
      const propertiesArr = Object.entries(data.properties).map(([key, value]) => ({
        Key: key,
        Value: value,
      }));
      const payload: any = {
        Name: data.name,
        ObjectTypeId: data.objectTypeId,
        Properties: propertiesArr,
      };

      // Добавляем color и icon только если они переданы и не пустые
      if (data.color && data.color.trim() !== '') {
        payload.Color = data.color;
      }
      if (data.icon && data.icon.trim() !== '') {
        payload.Icon = data.icon;
      }

      const res = await apiClient.post('/api/objects', payload);

      if (!res.ok) {
        const text = await res.text();
        toast.error('Ошибка создания объекта: ' + text);
        return;
      }

      const createdObj = await res.json();
      const updated = await api('/objects');
      setNodes(prev => mergeNodesWithPositions(updated, prev));

      if (onAddHistoryAction) {
        onAddHistoryAction({
          type: 'create',
          description: `Создан объект "${data.name}"`,
          undo: async () => {
            await apiClient.delete(`/api/objects/${createdObj.id}`);
            setNodes(prev => prev.filter(n => n.id !== createdObj.id));
          },
          redo: async () => {
            await apiClient.post('/api/objects', payload);
            const updated = await api('/objects');
            setNodes(prev => mergeNodesWithPositions(updated, prev));
          },
        });
      }
    },
    [mergeNodesWithPositions, onAddHistoryAction]
  );

  const updateObject = useCallback(
    async (data: {
      id: number;
      name: string;
      objectTypeId: number;
      properties: Record<string, string>;
      color?: string;
      icon?: string;
    }) => {
      const oldNode = nodes.find(n => n.id === data.id);
      if (!oldNode) return;

      const propertiesArr = Object.entries(data.properties).map(([key, value]) => ({
        Key: key,
        Value: value,
      }));
      const payload: any = {
        Id: data.id,
        Name: data.name,
        ObjectTypeId: data.objectTypeId,
        Properties: propertiesArr,
      };
      if (data.color !== undefined) payload.Color = data.color;
      if (data.icon !== undefined) payload.Icon = data.icon;

      const res = await apiClient.put(`/api/objects/${data.id}`, payload);

      if (!res.ok) {
        const text = await res.text();
        toast.error('Ошибка редактирования объекта: ' + text);
        return;
      }

      const updated = await api('/objects');
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
            await apiClient.put(`/api/objects/${data.id}`, oldPayload);
            const updated = await api('/objects');
            setNodes(prev => mergeNodesWithPositions(updated, prev));
          },
          redo: async () => {
            await apiClient.put(`/api/objects/${data.id}`, payload);
            const updated = await api('/objects');
            setNodes(prev => mergeNodesWithPositions(updated, prev));
          },
        });
      }
    },
    [nodes, mergeNodesWithPositions, onAddHistoryAction]
  );

  const deleteObject = useCallback(
    async (node: GraphObject) => {
      const deletedNode = { ...node };
      let restoredNodeId: number | null = null;
      const restoredEdgeIds: Map<number, number> = new Map();

      const relatedEdges = edges.filter(e => e.source === node.id || e.target === node.id);

      await apiClient.delete(`/api/objects/${node.id}`);
      setNodes(prev => prev.filter(n => n.id !== node.id));

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

            const res = await apiClient.post('/api/objects', {
              Name: deletedNode.name,
              ObjectTypeId: deletedNode.objectTypeId,
              Properties: propertiesArr,
              PositionX: deletedNode.PositionX,
              PositionY: deletedNode.PositionY,
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

              const edgeRes = await apiClient.post('/api/relations', {
                Source: edge.source === deletedNode.id ? restoredNodeId : edge.source,
                Target: edge.target === deletedNode.id ? restoredNodeId : edge.target,
                RelationTypeId: edge.relationTypeId,
                Properties: edgePropertiesArr,
              });
              const createdEdge = await edgeRes.json();
              restoredEdgeIds.set(edge.id, createdEdge.id);
            }
            const updatedEdges = await api('/relations');
            setEdges(updatedEdges);
          },
          redo: async () => {
            const idToDelete = restoredNodeId || deletedNode.id;
            await apiClient.delete(`/api/objects/${idToDelete}`);
            setNodes(prev => prev.filter(n => n.id !== idToDelete));

            if (restoredEdgeIds.size > 0) {
              await Promise.all(
                Array.from(restoredEdgeIds.values()).map(edgeId =>
                  apiClient.delete(`/api/relations/${edgeId}`)
                )
              );
              const updatedEdges = await api('/relations');
              setEdges(updatedEdges);
            }
          },
        });
      }
    },
    [edges, mergeNodesWithPositions, onAddHistoryAction]
  );

  const addRelation = useCallback(
    async (data: {
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

      const res = await apiClient.post('/api/relations', payload);

      if (!res.ok) {
        const text = await res.text();
        toast.error('Ошибка создания связи: ' + text);
        return;
      }

      const createdRelation = await res.json();
      const updated = await api('/relations');
      setEdges(updated);

      if (onAddHistoryAction) {
        const sourceNode = nodes.find(n => n.id === data.source);
        const targetNode = nodes.find(n => n.id === data.target);

        onAddHistoryAction({
          type: 'create',
          description: `Создана связь ${sourceNode?.name || data.source} → ${targetNode?.name || data.target}`,
          undo: async () => {
            await apiClient.delete(`/api/relations/${createdRelation.id}`);
            const updated = await api('/relations');
            setEdges(updated);
          },
          redo: async () => {
            await apiClient.post('/api/relations', payload);
            const updated = await api('/relations');
            setEdges(updated);
          },
        });
      }
    },
    [nodes, onAddHistoryAction]
  );

  const updateRelation = useCallback(
    async (data: { id: number; relationTypeId: number; properties: Record<string, string> }) => {
      const propertiesArr = Object.entries(data.properties).map(([key, value]) => ({
        Key: key,
        Value: value,
      }));
      const payload = {
        Id: data.id,
        RelationTypeId: data.relationTypeId,
        Properties: propertiesArr,
      };

      const res = await apiClient.put(`/api/relations/${data.id}`, payload);

      if (!res.ok) {
        const text = await res.text();
        toast.error('Ошибка редактирования связи: ' + text);
        return;
      }

      toast.success('Связь обновлена');
      const updated = await api('/relations');
      setEdges(updated);
    },
    []
  );

  const deleteRelation = useCallback(
    async (edge: GraphRelation) => {
      const deletedEdge = { ...edge };
      let restoredEdgeId: number | null = null;

      await apiClient.delete(`/api/relations/${edge.id}`);
      setEdges(edges.filter(e => e.id !== edge.id));

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

            const res = await apiClient.post('/api/relations', {
              Source: deletedEdge.source,
              Target: deletedEdge.target,
              RelationTypeId: deletedEdge.relationTypeId,
              Properties: propertiesArr,
            });
            const created = await res.json();
            restoredEdgeId = created.id;
            const updated = await api('/relations');
            setEdges(updated);
          },
          redo: async () => {
            const idToDelete = restoredEdgeId || deletedEdge.id;
            await apiClient.delete(`/api/relations/${idToDelete}`);
            setEdges(prev => prev.filter(e => e.id !== idToDelete));
          },
        });
      }
    },
    [edges, nodes, onAddHistoryAction]
  );

  const updateNodesPositions = useCallback((positions: { id: number; x: number; y: number }[]) => {
    setNodes(prevNodes => {
      // O(n) Map lookup вместо O(n²) .find() в цикле
      const posMap = new Map<number, { x: number; y: number }>();
      positions.forEach(p => posMap.set(p.id, { x: p.x, y: p.y }));

      let changed = false;
      const updated = prevNodes.map(n => {
        const pos = posMap.get(n.id);
        if (pos && (n.PositionX !== pos.x || n.PositionY !== pos.y)) {
          changed = true;
          return { ...n, PositionX: pos.x, PositionY: pos.y };
        }
        return n;
      });
      return changed ? updated : prevNodes;
    });
  }, []);

  const addObjectType = useCallback(async (data: { name: string; description?: string }) => {
    const payload: any = { Name: data.name, Objects: [], RelationTypes: [] };
    if (data.description && data.description.trim() !== '') {
      payload.Description = data.description;
    }

    const res = await apiClient.post('/api/object-types', payload);

    if (!res.ok) {
      const text = await res.text();
      toast.error('Ошибка создания типа объекта: ' + text);
      return;
    }

    toast.success('Тип объекта создан');
    const types = await api('/object-types');
    setObjectTypes(types);
  }, []);

  const deleteObjectType = useCallback(
    async (id: number) => {
      await apiClient.delete(`/api/object-types/${id}`);
      setObjectTypes(objectTypes.filter(t => t.id !== id));
    },
    [objectTypes]
  );

  const addRelationType = useCallback(
    async (data: { name: string; description?: string; objectTypeId: number }) => {
      await apiClient.post('/api/relation-types', data);
      const relTypes = await api('/relation-types');
      setRelationTypes(relTypes);
    },
    []
  );

  const deleteRelationType = useCallback(
    async (id: number) => {
      await apiClient.delete(`/api/relation-types/${id}`);
      setRelationTypes(relationTypes.filter(t => t.id !== id));
    },
    [relationTypes]
  );

  // Helper to save visible node IDs to localStorage
  const saveVisibleNodeIds = useCallback((nodeList: GraphObject[]) => {
    const ids = nodeList.map(n => n.id);
    localStorage.setItem('visible_node_ids', JSON.stringify(ids));
  }, []);

  // Hide all nodes (enter investigation mode)
  const hideAll = useCallback(() => {
    localStorage.setItem('graph_mode', 'hidden');
    localStorage.setItem('visible_node_ids', '[]');
    setNodes([]);
    setEdges([]);
  }, []);

  // Show all nodes (exit investigation mode)
  const showAll = useCallback(() => {
    localStorage.setItem('graph_mode', 'all');
    localStorage.removeItem('visible_node_ids');
    window.location.reload();
  }, []);

  // Expand node - load its neighbors
  const expandNode = useCallback(
    async (nodeId: number) => {
      try {
        const res = await apiClient.get(`/api/objects/${nodeId}/neighbors`);
        const data = await res.json();

        if (data.nodes && Array.isArray(data.nodes)) {
          setNodes(prev => {
            const newNodes = data.nodes.filter((n: any) => !prev.some(p => p.id === n.id));
            if (newNodes.length === 0) {
              toast.info('Все соседи уже на графе');
              return prev;
            }

            // Find parent node for positioning
            const parentNode = prev.find(n => n.id === nodeId);
            const centerX = parentNode?.PositionX ?? 400;
            const centerY = parentNode?.PositionY ?? 300;

            // Assign positions around parent
            const nodesWithPos = newNodes.map((n: any, i: number) => ({
              ...n,
              PositionX: centerX + Math.cos((i * Math.PI * 2) / newNodes.length) * 150,
              PositionY: centerY + Math.sin((i * Math.PI * 2) / newNodes.length) * 150,
            }));

            const updated = [...prev, ...nodesWithPos];
            saveVisibleNodeIds(updated);
            return updated;
          });
        }

        if (data.relations && Array.isArray(data.relations)) {
          setEdges(prev => {
            const newEdges = data.relations.filter((r: any) => !prev.some(p => p.id === r.id));
            if (newEdges.length === 0) return prev;
            return [...prev, ...newEdges];
          });
        }

        toast.success(`Раскрыто связей: ${data.relations?.length || 0}`);
      } catch (e) {
        toast.error('Ошибка при раскрытии узла');
        console.error(e);
      }
    },
    [saveVisibleNodeIds]
  );

  // Add single node to view (from search)
  const addNodeToView = useCallback(
    async (nodeId: number) => {
      try {
        // First check if node already exists
        const existingNode = nodes.find(n => n.id === nodeId);
        if (existingNode) {
          toast.info('Объект уже на графе');
          return existingNode;
        }

        // Fetch the node
        const res = await apiClient.post('/api/objects/batch', [nodeId]);
        const fetchedNodes = await res.json();

        if (fetchedNodes.length === 0) {
          toast.error('Объект не найден');
          return null;
        }

        const newNode = {
          ...fetchedNodes[0],
          PositionX: 400 + Math.random() * 100 - 50,
          PositionY: 300 + Math.random() * 100 - 50,
        };

        setNodes(prev => {
          const updated = [...prev, newNode];
          saveVisibleNodeIds(updated);
          return updated;
        });

        toast.success('Объект добавлен на граф');
        return newNode;
      } catch (e) {
        toast.error('Ошибка при добавлении объекта');
        console.error(e);
        return null;
      }
    },
    [nodes, saveVisibleNodeIds]
  );

  // Check if we're in hidden mode
  const isHiddenMode = useCallback(() => {
    return localStorage.getItem('graph_mode') === 'hidden';
  }, []);

  // Hide single node (remove from view, not from database)
  // Also hides orphan nodes that become disconnected after hiding
  const hideNode = useCallback(
    (nodeId: number) => {
      setNodes(prev => {
        // Remove the target node
        let updated = prev.filter(n => n.id !== nodeId);

        // Get edges that will remain (not connected to hidden node)
        const remainingEdges = edges.filter(e => e.source !== nodeId && e.target !== nodeId);

        // Find orphan nodes (nodes with no remaining connections)
        const orphanIds = new Set<number>();
        updated.forEach(node => {
          const hasConnection = remainingEdges.some(
            e =>
              (e.source === node.id || e.target === node.id) &&
              updated.some(n => n.id === (e.source === node.id ? e.target : e.source))
          );
          if (!hasConnection) {
            orphanIds.add(node.id);
          }
        });

        // Remove orphan nodes as well
        if (orphanIds.size > 0) {
          updated = updated.filter(n => !orphanIds.has(n.id));
        }

        saveVisibleNodeIds(updated);
        return updated;
      });
      // Also remove edges connected to this node from view
      setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
      toast.info('Узел скрыт');
    },
    [edges, saveVisibleNodeIds]
  );

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
    // New Expand feature functions
    hideAll,
    showAll,
    expandNode,
    addNodeToView,
    isHiddenMode,
    hideNode,
  };
};
