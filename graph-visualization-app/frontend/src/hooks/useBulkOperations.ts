import { useCallback } from 'react';
import { GraphObject, GraphRelation } from '../types/graph';
import { toast } from 'react-toastify';

const api = (path: string, opts?: any) =>
  fetch("/api" + path, opts).then((r) => r.json());

interface UseBulkOperationsProps {
  nodes: GraphObject[];
  edges: GraphRelation[];
  setNodes: (updater: (prev: GraphObject[]) => GraphObject[]) => void;
  setEdges: (updater: (prev: GraphRelation[]) => GraphRelation[]) => void;
  mergeNodesWithPositions: (newNodes: GraphObject[], existingNodes: GraphObject[]) => GraphObject[];
  onAddHistoryAction?: (action: any) => void;
}

export const useBulkOperations = ({
  nodes,
  edges,
  setNodes,
  setEdges,
  mergeNodesWithPositions,
  onAddHistoryAction
}: UseBulkOperationsProps) => {

  const bulkDelete = useCallback(async (selectedIds: number[]) => {
    if (selectedIds.length === 0) return;

    try {
      const deletedNodes = nodes.filter(n => selectedIds.includes(n.id));
      const restoredNodeIds: Map<number, number> = new Map();
      const restoredEdgeIds: number[] = [];
      
      const relatedEdges = edges.filter(e => 
        selectedIds.includes(e.source) || selectedIds.includes(e.target)
      );
      
      await Promise.all(
        selectedIds.map(id => fetch(`/api/objects/${id}`, { method: "DELETE" }))
      );
      setNodes(prev => prev.filter(n => !selectedIds.includes(n.id)));
      
      if (onAddHistoryAction) {
        onAddHistoryAction({
          type: 'bulk_delete',
          description: `Удалено ${deletedNodes.length} объект(ов)`,
          undo: async () => {
            restoredNodeIds.clear();
            restoredEdgeIds.length = 0;
            
            for (const node of deletedNodes) {
              const propertiesArr = Array.isArray(node.properties)
                ? node.properties.map((p: any) => ({
                    Key: p.key || p.Key,
                    Value: p.value || p.Value,
                  }))
                : [];
              
              const res = await fetch('/api/objects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  Name: node.name,
                  ObjectTypeId: node.objectTypeId,
                  Properties: propertiesArr,
                  PositionX: node.PositionX,
                  PositionY: node.PositionY,
                }),
              });
              const created = await res.json();
              restoredNodeIds.set(node.id, created.id);
            }
            const updated = await api('/objects');
            setNodes(prev => mergeNodesWithPositions(updated, prev));
            
            for (const edge of relatedEdges) {
              const edgePropertiesArr = Array.isArray(edge.properties)
                ? edge.properties.map((p: any) => ({
                    Key: p.key || p.Key,
                    Value: p.value || p.Value,
                  }))
                : [];
              
              const newSource = restoredNodeIds.get(edge.source) || edge.source;
              const newTarget = restoredNodeIds.get(edge.target) || edge.target;
              
              const edgeRes = await fetch('/api/relations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  Source: newSource,
                  Target: newTarget,
                  RelationTypeId: edge.relationTypeId,
                  Properties: edgePropertiesArr,
                }),
              });
              const createdEdge = await edgeRes.json();
              restoredEdgeIds.push(createdEdge.id);
            }
            const updatedEdges = await api('/relations');
            setEdges(() => updatedEdges);
          },
          redo: async () => {
            const idsToDelete = restoredNodeIds.size > 0 
              ? Array.from(restoredNodeIds.values()) 
              : deletedNodes.map(n => n.id);
            
            await Promise.all(
              idsToDelete.map(id => fetch(`/api/objects/${id}`, { method: 'DELETE' }))
            );
            setNodes(prev => prev.filter(n => !idsToDelete.includes(n.id)));
            
            if (restoredEdgeIds.length > 0) {
              await Promise.all(
                restoredEdgeIds.map(edgeId => 
                  fetch(`/api/relations/${edgeId}`, { method: 'DELETE' })
                )
              );
              const updatedEdges = await api('/relations');
              setEdges(() => updatedEdges);
            }
          },
        });
      }
    } catch (error) {
      toast.error("Ошибка при удалении объектов");
    }
  }, [nodes, edges, setNodes, setEdges, mergeNodesWithPositions, onAddHistoryAction]);

  const bulkChangeType = useCallback(async (selectedIds: number[], newTypeId: number) => {
    if (selectedIds.length === 0) return;

    try {
      const oldNodes = nodes.filter(n => selectedIds.includes(n.id)).map(n => ({
        id: n.id,
        name: n.name,
        objectTypeId: n.objectTypeId,
        properties: Array.isArray(n.properties)
          ? n.properties.map((p: any) => ({
              Key: p.key || p.Key,
              Value: p.value || p.Value,
            }))
          : [],
      }));

      const updatePromises = selectedIds.map(async (id) => {
        const node = nodes.find(n => n.id === id);
        if (!node) return;

        const propertiesArr = Array.isArray(node.properties)
          ? node.properties.map((p: any) => ({
              Key: p.key || p.Key,
              Value: p.value || p.Value,
            }))
          : [];

        return fetch(`/api/objects/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Id: id,
            Name: node.name,
            ObjectTypeId: newTypeId,
            Properties: propertiesArr,
          }),
        });
      });

      await Promise.all(updatePromises);
      const updated = await api("/objects");
      setNodes(prev => mergeNodesWithPositions(updated, prev));
      
      if (onAddHistoryAction) {
        onAddHistoryAction({
          type: 'bulk_update',
          description: `Изменён тип для ${oldNodes.length} объект(ов)`,
          undo: async () => {
            for (const oldNode of oldNodes) {
              await fetch(`/api/objects/${oldNode.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  Id: oldNode.id,
                  Name: oldNode.name,
                  ObjectTypeId: oldNode.objectTypeId,
                  Properties: oldNode.properties,
                }),
              });
            }
            const updated = await api('/objects');
            setNodes(prev => mergeNodesWithPositions(updated, prev));
          },
          redo: async () => {
            for (const oldNode of oldNodes) {
              const node = nodes.find(n => n.id === oldNode.id);
              if (!node) continue;
              
              const propertiesArr = Array.isArray(node.properties)
                ? node.properties.map((p: any) => ({
                    Key: p.key || p.Key,
                    Value: p.value || p.Value,
                  }))
                : [];
              
              await fetch(`/api/objects/${oldNode.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  Id: oldNode.id,
                  Name: node.name,
                  ObjectTypeId: newTypeId,
                  Properties: propertiesArr,
                }),
              });
            }
            const updated = await api('/objects');
            setNodes(prev => mergeNodesWithPositions(updated, prev));
          },
        });
      }
    } catch (error) {
      toast.error("Ошибка при изменении типа объектов");
    }
  }, [nodes, setNodes, mergeNodesWithPositions, onAddHistoryAction]);

  return {
    bulkDelete,
    bulkChangeType,
  };
};
