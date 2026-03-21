import { useState, useMemo, useEffect } from 'react';
import { GraphObject, GraphRelation, ObjectType, RelationType } from '../types/graph';
import { toast } from 'react-toastify';

export type FilterOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains';

export interface PropertyRule {
  id: string;
  type: 'rule';
  property: string;
  operator: FilterOperator;
  value: string;
  isEnabled?: boolean;
}

export interface FilterGroup {
  id: string;
  type: 'group';
  logicalOperator: 'AND' | 'OR';
  children: Array<PropertyRule | FilterGroup>;
  isEnabled?: boolean;
}

export interface FilterState {
  selectedObjectTypes: number[];
  selectedRelationTypes: number[];
  showIsolatedNodes: boolean;
  advancedFilter?: FilterGroup;
}

interface UseGraphFiltersProps {
  nodes: GraphObject[];
  edges: GraphRelation[];
  objectTypes: ObjectType[];
  relationTypes: RelationType[];
}

function evaluateRule(properties: any, rule: PropertyRule): boolean {
  if (rule.isEnabled === false) return true;
  if (!properties) return false;
  const propVal = properties[rule.property];
  if (propVal === undefined || propVal === null) {
    if (rule.operator === 'neq' || rule.operator === 'not_contains') return true;
    return false;
  }

  const ruleValStr = rule.value.toLowerCase();
  const propValStr = String(propVal).toLowerCase();
  const propNum = Number(propVal);
  const ruleNum = Number(rule.value);

  switch (rule.operator) {
    case 'eq': return propValStr === ruleValStr;
    case 'neq': return propValStr !== ruleValStr;
    case 'contains': return propValStr.includes(ruleValStr);
    case 'not_contains': return !propValStr.includes(ruleValStr);
    case 'gt': return !isNaN(propNum) && !isNaN(ruleNum) ? propNum > ruleNum : propValStr > ruleValStr;
    case 'lt': return !isNaN(propNum) && !isNaN(ruleNum) ? propNum < ruleNum : propValStr < ruleValStr;
    case 'gte': return !isNaN(propNum) && !isNaN(ruleNum) ? propNum >= ruleNum : propValStr >= ruleValStr;
    case 'lte': return !isNaN(propNum) && !isNaN(ruleNum) ? propNum <= ruleNum : propValStr <= ruleValStr;
    default: return false;
  }
}

function evaluateGroup(properties: any, group: FilterGroup): boolean {
  if (group.isEnabled === false) return true;

  const activeChildren = group.children.filter(c => c.isEnabled !== false);
  if (activeChildren.length === 0) return true;

  if (group.logicalOperator === 'AND') {
    return activeChildren.every(child => 
      child.type === 'rule' ? evaluateRule(properties, child as PropertyRule) : evaluateGroup(properties, child as FilterGroup)
    );
  } else {
    return activeChildren.some(child => 
      child.type === 'rule' ? evaluateRule(properties, child as PropertyRule) : evaluateGroup(properties, child as FilterGroup)
    );
  }
}

export const useGraphFilters = ({
  nodes,
  edges,
  objectTypes,
  relationTypes,
}: UseGraphFiltersProps) => {
  const [filters, setFilters] = useState<FilterState>({
    selectedObjectTypes: [],
    selectedRelationTypes: [],
    showIsolatedNodes: true,
  });

  // Auto-initialize filters when types are loaded
  useEffect(() => {
    if (objectTypes.length > 0 && filters.selectedObjectTypes.length === 0) {
      setFilters(prev => ({
        ...prev,
        selectedObjectTypes: objectTypes.map(t => t.id),
      }));
    }
    if (relationTypes.length > 0 && filters.selectedRelationTypes.length === 0) {
      setFilters(prev => ({
        ...prev,
        selectedRelationTypes: relationTypes.map(t => t.id),
      }));
    }
  }, [
    objectTypes,
    relationTypes,
    filters.selectedObjectTypes.length,
    filters.selectedRelationTypes.length,
  ]);

  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      if (!filters.selectedObjectTypes.includes(node.objectTypeId)) {
        return false;
      }

      if (!filters.showIsolatedNodes) {
        const hasConnections = edges.some(
          edge => edge.source === node.id || edge.target === node.id
        );
        if (!hasConnections) {
          return false;
        }
      }

      if (filters.advancedFilter && filters.advancedFilter.children.length > 0) {
        if (!evaluateGroup(node.properties, filters.advancedFilter)) {
          return false;
        }
      }

      return true;
    });
  }, [nodes, filters.selectedObjectTypes, filters.showIsolatedNodes, filters.advancedFilter, edges]);

  const filteredEdges = useMemo(() => {
    // O(1) Set lookup вместо O(n) .some() на каждое ребро
    // При 1000 узлах и 2000 рёбрах: было O(E×N) = 2M операций, стало O(E) = 2K операций
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    const allowedRelationTypes = new Set(filters.selectedRelationTypes);

    return edges.filter(edge => {
      if (!allowedRelationTypes.has(edge.relationTypeId)) {
        return false;
      }

      return visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target);
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
    !filters.showIsolatedNodes ||
    Boolean(filters.advancedFilter && filters.advancedFilter.children.length > 0);

  return {
    filters,
    filteredNodes,
    filteredEdges,
    applyFilters,
    hasActiveFilters,
  };
};
