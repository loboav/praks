import { useState, useCallback, useMemo, useEffect } from 'react';
import { GraphObject, GraphRelation, ObjectType } from '../types/graph';

/**
 * Правило группировки узлов
 */
export interface GroupingRule {
  id: string;
  title: string; // Название правила ("По городу", "По типу")
  propertyKey: string; // Ключ свойства для группировки ("city", "objectTypeId")
  categoryIds?: number[]; // Фильтр по типам объектов (опционально)
  isActive: boolean;
  createdAt: number;
}

/**
 * Группа узлов с общим значением свойства
 */
export interface NodeGroup {
  id: string;
  ruleId: string;
  propertyValue: string; // Значение свойства ("Москва", "Person")
  nodeIds: number[]; // ID узлов в группе
  categoryId?: number; // Общая категория (если все узлы одного типа)
  isCollapsed: boolean;
}

interface UseNodeGroupingProps {
  nodes: GraphObject[];
  edges: GraphRelation[];
  objectTypes: ObjectType[];
}

interface UseNodeGroupingReturn {
  // Правила
  rules: GroupingRule[];
  createRule: (title: string, propertyKey: string, categoryIds?: number[]) => void;
  deleteRule: (ruleId: string) => void;
  toggleRule: (ruleId: string) => void;
  activeRule: GroupingRule | null;

  // Группы
  groups: NodeGroup[];
  toggleGroupCollapse: (groupId: string) => void;
  collapseAllGroups: () => void;
  expandAllGroups: () => void;

  // Трансформированные данные для рендеринга
  transformedNodes: GraphObject[];
  transformedEdges: GraphRelation[];

  // Доступные свойства для группировки
  availableProperties: string[];
}

const STORAGE_KEY_RULES = 'graph_grouping_rules';
const STORAGE_KEY_COLLAPSED = 'graph_grouping_collapsed';

/**
 * Хук для группировки узлов по свойствам (по паттерну Linkurious)
 */
export function useNodeGrouping({
  nodes,
  edges,
  objectTypes,
}: UseNodeGroupingProps): UseNodeGroupingReturn {
  // Загрузка правил из localStorage
  const [rules, setRules] = useState<GroupingRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RULES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Состояние сворачивания групп
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COLLAPSED);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Сохранение в localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COLLAPSED, JSON.stringify([...collapsedGroupIds]));
  }, [collapsedGroupIds]);

  // Активное правило
  const activeRule = useMemo(() => rules.find(r => r.isActive) || null, [rules]);

  // Доступные свойства для группировки
  const availableProperties = useMemo(() => {
    const propsSet = new Set<string>();
    propsSet.add('objectTypeId'); // Всегда доступна группировка по типу

    nodes.forEach(node => {
      if (node.properties) {
        Object.keys(node.properties).forEach(key => propsSet.add(key));
      }
    });

    return Array.from(propsSet);
  }, [nodes]);

  // Создание правила
  const createRule = useCallback((title: string, propertyKey: string, categoryIds?: number[]) => {
    const newRule: GroupingRule = {
      id: `rule-${Date.now()}`,
      title,
      propertyKey,
      categoryIds,
      isActive: false,
      createdAt: Date.now(),
    };
    setRules(prev => [...prev, newRule]);
  }, []);

  // Удаление правила
  const deleteRule = useCallback((ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
  }, []);

  // Включение/выключение правила (только одно активно)
  const toggleRule = useCallback((ruleId: string) => {
    setRules(prev =>
      prev.map(r => ({
        ...r,
        isActive: r.id === ruleId ? !r.isActive : false,
      }))
    );
    // Сбрасываем collapsed при смене правила
    setCollapsedGroupIds(new Set());
  }, []);

  // Вычисляем группы на основе активного правила
  const groups = useMemo((): NodeGroup[] => {
    if (!activeRule) return [];

    // O(1) Map для objectTypes вместо .find() в цикле
    const objectTypeMap = new Map<number, string>();
    objectTypes.forEach(t => objectTypeMap.set(t.id, t.name));

    // O(1) Map для node.id → objectTypeId вместо .find() при определении категории
    const nodeTypeMap = new Map<number, number>();
    nodes.forEach(n => nodeTypeMap.set(n.id, n.objectTypeId));

    // O(1) Set для categoryIds фильтра
    const categoryFilter =
      activeRule.categoryIds && activeRule.categoryIds.length > 0
        ? new Set(activeRule.categoryIds)
        : null;

    const groupMap = new Map<string, number[]>();

    nodes.forEach(node => {
      // Проверяем фильтр по категориям — Set.has() O(1) вместо .includes() O(n)
      if (categoryFilter && !categoryFilter.has(node.objectTypeId)) return;

      // Получаем значение свойства — Map.get() O(1) вместо .find() O(n)
      let value: string;
      if (activeRule.propertyKey === 'objectTypeId') {
        value = objectTypeMap.get(node.objectTypeId) || `Type ${node.objectTypeId}`;
      } else {
        value = node.properties?.[activeRule.propertyKey] || 'Не указано';
      }

      const existing = groupMap.get(value) || [];
      existing.push(node.id);
      groupMap.set(value, existing);
    });

    // Создаём группы (только если больше 1 узла)
    const result: NodeGroup[] = [];
    groupMap.forEach((nodeIds, propertyValue) => {
      if (nodeIds.length > 1) {
        const groupId = `${activeRule.id}-${propertyValue}`;

        // Определяем общую категорию — Map.get() O(1) вместо .find() O(n)
        const categoryIds = new Set(nodeIds.map(id => nodeTypeMap.get(id)).filter(Boolean));

        result.push({
          id: groupId,
          ruleId: activeRule.id,
          propertyValue,
          nodeIds,
          categoryId: categoryIds.size === 1 ? [...categoryIds][0] : undefined,
          isCollapsed: collapsedGroupIds.has(groupId) || true, // По умолчанию свёрнуты
        });
      }
    });

    return result;
  }, [nodes, activeRule, objectTypes, collapsedGroupIds]);

  // Переключение сворачивания группы
  const toggleGroupCollapse = useCallback((groupId: string) => {
    setCollapsedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  // Свернуть все группы
  const collapseAllGroups = useCallback(() => {
    setCollapsedGroupIds(new Set(groups.map(g => g.id)));
  }, [groups]);

  // Развернуть все группы
  const expandAllGroups = useCallback(() => {
    setCollapsedGroupIds(new Set());
  }, []);

  // Проверка: свёрнута ли группа
  const isGroupCollapsed = useCallback(
    (groupId: string): boolean => {
      // Новые группы по умолчанию свёрнуты
      if (!collapsedGroupIds.has(groupId)) {
        const group = groups.find(g => g.id === groupId);
        return group ? true : false;
      }
      return collapsedGroupIds.has(groupId);
    },
    [collapsedGroupIds, groups]
  );

  // Трансформированные узлы
  const transformedNodes = useMemo((): GraphObject[] => {
    if (!activeRule || groups.length === 0) {
      return nodes;
    }

    // O(1) Map для узлов по ID вместо .filter() + .includes() в цикле
    const nodesMap = new Map<number, GraphObject>();
    nodes.forEach(n => nodesMap.set(n.id, n));

    // O(1) Map для objectTypes
    const objectTypeMap = new Map<number, string>();
    objectTypes.forEach(t => objectTypeMap.set(t.id, t.name));

    // Собираем ID узлов в свёрнутых группах
    const hiddenNodeIds = new Set<number>();
    const collapsedGroups = groups.filter(g => !collapsedGroupIds.has(g.id) || true);

    collapsedGroups.forEach(group => {
      const isCollapsed = !collapsedGroupIds.has(`expanded-${group.id}`);
      if (isCollapsed) {
        group.nodeIds.forEach(id => hiddenNodeIds.add(id));
      }
    });

    // Фильтруем скрытые узлы — Set.has() O(1)
    const visibleNodes = nodes.filter(n => !hiddenNodeIds.has(n.id));

    // Создаём мета-узлы для свёрнутых групп
    const metaNodes: GraphObject[] = [];

    collapsedGroups.forEach(group => {
      const isCollapsed = !collapsedGroupIds.has(`expanded-${group.id}`);
      if (!isCollapsed) return;

      // O(1) Map lookup вместо .filter() + .includes() O(n×m)
      const groupNodes = group.nodeIds
        .map(id => nodesMap.get(id))
        .filter((n): n is GraphObject => n !== undefined);

      const avgX = groupNodes.reduce((sum, n) => sum + (n.PositionX || 0), 0) / groupNodes.length;
      const avgY = groupNodes.reduce((sum, n) => sum + (n.PositionY || 0), 0) / groupNodes.length;

      // Определяем иконку и цвет
      let color = '#9e9e9e';
      let icon = '📦';

      if (group.categoryId) {
        // O(1) Map lookup вместо .find()
        const typeName = objectTypeMap.get(group.categoryId);
        if (typeName) {
          const firstNode = groupNodes[0];
          color = firstNode?.color || '#9e9e9e';
          icon = firstNode?.icon || '📦';
        }
      }

      const metaNode: GraphObject = {
        id: -Date.now() - Math.random() * 1000, // Уникальный отрицательный ID
        name: `${group.propertyValue} ×${group.nodeIds.length}`,
        objectTypeId: group.categoryId || 0,
        properties: {},
        PositionX: avgX,
        PositionY: avgY,
        color,
        icon,
        isCollapsedGroup: true,
        _collapsedNodeIds: group.nodeIds,
        _collapsedCount: group.nodeIds.length,
        _collapsedGroupId: group.id,
        _groupPropertyValue: group.propertyValue,
        _groupNodeNames: groupNodes.map(n => n.name).slice(0, 5),
      } as GraphObject & {
        _groupPropertyValue: string;
        _groupNodeNames: string[];
      };

      metaNodes.push(metaNode);
    });

    return [...visibleNodes, ...metaNodes];
  }, [nodes, activeRule, groups, collapsedGroupIds, objectTypes]);

  // Трансформированные рёбра
  const transformedEdges = useMemo((): GraphRelation[] => {
    if (!activeRule || groups.length === 0) {
      return edges;
    }

    // O(1) Map: groupId → metaNode.id вместо .find() O(n) в цикле
    const groupIdToMetaNodeId = new Map<string, number>();
    transformedNodes.forEach(n => {
      if (n.isCollapsedGroup && n._collapsedGroupId) {
        groupIdToMetaNodeId.set(n._collapsedGroupId, n.id);
      }
    });

    // Маппинг: nodeId → metaNodeId (если узел в свёрнутой группе)
    const nodeToGroupMeta = new Map<number, number>();

    groups.forEach(group => {
      const isCollapsed = !collapsedGroupIds.has(`expanded-${group.id}`);
      if (isCollapsed) {
        // O(1) Map lookup вместо .find() O(n)
        const metaNodeId = groupIdToMetaNodeId.get(group.id);
        if (metaNodeId !== undefined) {
          group.nodeIds.forEach(nodeId => {
            nodeToGroupMeta.set(nodeId, metaNodeId);
          });
        }
      }
    });

    if (nodeToGroupMeta.size === 0) {
      return edges;
    }

    // Трансформируем рёбра
    const resultEdges: GraphRelation[] = [];
    const seenEdges = new Set<string>();

    edges.forEach(edge => {
      let newSource = edge.source;
      let newTarget = edge.target;

      if (nodeToGroupMeta.has(edge.source)) {
        newSource = nodeToGroupMeta.get(edge.source)!;
      }
      if (nodeToGroupMeta.has(edge.target)) {
        newTarget = nodeToGroupMeta.get(edge.target)!;
      }

      // Пропускаем рёбра внутри одной группы
      if (newSource === newTarget) return;

      // Дедупликация
      const edgeKey = `${Math.min(newSource, newTarget)}-${Math.max(newSource, newTarget)}`;
      if (seenEdges.has(edgeKey)) return;
      seenEdges.add(edgeKey);

      resultEdges.push({
        ...edge,
        source: newSource,
        target: newTarget,
      });
    });

    return resultEdges;
  }, [edges, groups, collapsedGroupIds, transformedNodes, activeRule]);

  return {
    rules,
    createRule,
    deleteRule,
    toggleRule,
    activeRule,
    groups,
    toggleGroupCollapse,
    collapseAllGroups,
    expandAllGroups,
    transformedNodes,
    transformedEdges,
    availableProperties,
  };
}
