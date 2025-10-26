import { useState, useMemo, useEffect } from 'react';
import { GraphObject, GraphRelation, ObjectType, RelationType } from '../types/graph';
import { toast } from 'react-toastify';

export interface FilterState {
  selectedObjectTypes: number[];
  selectedRelationTypes: number[];
  showIsolatedNodes: boolean;
}

interface UseGraphFiltersProps {
  nodes: GraphObject[];
  edges: GraphRelation[];
  objectTypes: ObjectType[];
  relationTypes: RelationType[];
}

export const useGraphFilters = ({
  nodes,
  edges,
  objectTypes,
  relationTypes
}: UseGraphFiltersProps) => {
  const [filters, setFilters] = useState<FilterState>({
    selectedObjectTypes: [],
    selectedRelationTypes: [],
    showIsolatedNodes: true,
  });

  // Auto-initialize filters when types are loaded
  useEffect(() => {
    if (objectTypes.length > 0 && filters.selectedObjectTypes.length === 0) {
      setFilters((prev) => ({
        ...prev,
        selectedObjectTypes: objectTypes.map((t) => t.id),
      }));
    }
    if (relationTypes.length > 0 && filters.selectedRelationTypes.length === 0) {
      setFilters((prev) => ({
        ...prev,
        selectedRelationTypes: relationTypes.map((t) => t.id),
      }));
    }
  }, [objectTypes, relationTypes, filters.selectedObjectTypes.length, filters.selectedRelationTypes.length]);

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (!filters.selectedObjectTypes.includes(node.objectTypeId)) {
        return false;
      }

      if (!filters.showIsolatedNodes) {
        const hasConnections = edges.some(
          (edge) => edge.source === node.id || edge.target === node.id
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

  const applyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    toast.success(
      `Фильтры применены! Узлов: ${filteredNodes.length}, Связей: ${filteredEdges.length}`
    );
  };

  const hasActiveFilters = 
    filters.selectedObjectTypes.length < objectTypes.length ||
    filters.selectedRelationTypes.length < relationTypes.length ||
    !filters.showIsolatedNodes;

  return {
    filters,
    filteredNodes,
    filteredEdges,
    applyFilters,
    hasActiveFilters,
  };
};
