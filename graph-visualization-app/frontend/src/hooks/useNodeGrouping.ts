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
const STORAGE_KEY_EXPANDED = 'graph_grouping_expanded';

/**
 * Простая хеш-функция для генерации стабильных отрицательных ID мета-узлов
 */
function stableHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

let _ruleIdCounter = 0;

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

  // Множество РАЗВЁРНУТЫХ групп (по умолчанию все свёрнуты)
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXPANDED);
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
    localStorage.setItem(STORAGE_KEY_EXPANDED, JSON.stringify([...expandedGroupIds]));
  }, [expandedGroupIds]);

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
      id: `rule-${Date.now()}-${++_ruleIdCounter}`,
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
    // Сбрасываем expanded при смене правила (всё свернётся)
    setExpandedGroupIds(new Set());
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
          isCollapsed: !expandedGroupIds.has(groupId), // Свёрнуты по умолчанию, развёрнуты если в expandedGroupIds
        });
      }
    });

    return result;
  }, [nodes, activeRule, objectTypes, expandedGroupIds]);

  // Переключение сворачивания группы (toggle expanded)
  const toggleGroupCollapse = useCallback((groupId: string) => {
    setExpandedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        // Был развёрнут → сворачиваем
        next.delete(groupId);
      } else {
        // Был свёрнут → разворачиваем
        next.add(groupId);
      }
      return next;
    });
  }, []);

  // Свернуть все группы (очищаем expanded set)
  const collapseAllGroups = useCallback(() => {
    setExpandedGroupIds(new Set());
  }, []);

  // Развернуть все группы (добавляем все в expanded set)
  const expandAllGroups = useCallback(() => {
    setExpandedGroupIds(new Set(groups.map(g => g.id)));
  }, [groups]);

  // Проверка: свёрнута ли группа (свёрнута = НЕ в expandedGroupIds)
  const isGroupCollapsed = useCallback(
    (groupId: string): boolean => {
      return !expandedGroupIds.has(groupId);
    },
    [expandedGroupIds]
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
    const collapsedGroups = groups.filter(g => !expandedGroupIds.has(g.id));

    collapsedGroups.forEach(group => {
      group.nodeIds.forEach(id => hiddenNodeIds.add(id));
    });

    // Фильтруем скрытые узлы — Set.has() O(1)
    const visibleNodes = nodes.filter(n => !hiddenNodeIds.has(n.id));

    // Создаём мета-узлы для свёрнутых групп
    const metaNodes: GraphObject[] = [];

    collapsedGroups.forEach(group => {
      // Все группы в collapsedGroups гарантированно свёрнуты

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
        id: -(Math.abs(stableHash(group.id)) + 1), // Стабильный уникальный отрицательный ID
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
  }, [nodes, activeRule, groups, expandedGroupIds, objectTypes]);

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
      if (!expandedGroupIds.has(group.id)) {
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
    const resultEdgesMap = new Map<string, GraphRelation>();
    const edgeCounts = new Map<string, number>();

    edges.forEach(edge => {
      let newSource = edge.source;
      let newTarget = edge.target;

      // Если узлы принадлежат свернутым группам, заменяем их ID на ID мета-узлов
      if (nodeToGroupMeta.has(edge.source)) {
        newSource = nodeToGroupMeta.get(edge.source)!;
      }
      if (nodeToGroupMeta.has(edge.target)) {
        newTarget = nodeToGroupMeta.get(edge.target)!;
      }

      // Пропускаем рёбра внутри одной группы (петли на мета-узле не нужны)
      if (newSource === newTarget) return;

      // Ключ для уникального ребра между двумя узлами (независимо от направления и ТИПА)
      // Мы схлопываем ВСЕ связи между А и Б в одну, чтобы не перегружать граф
      const sourceId = typeof newSource === 'number' ? newSource : String(newSource);
      const targetId = typeof newTarget === 'number' ? newTarget : String(newTarget);

      // Сортируем ID чтобы направление не влияло на ключ
      const [minId, maxId] = [sourceId, targetId].sort();
      const edgeKey = `${minId}-${maxId}`;

      const currentCount = edgeCounts.get(edgeKey) || 0;
      edgeCounts.set(edgeKey, currentCount + 1);

      // Сохраняем только первое попавшееся ребро как представителя
      // Можно было бы создать создать фиктивное ребро типа "Mixed", но пока берем первое
      if (!resultEdgesMap.has(edgeKey)) {
        resultEdgesMap.set(edgeKey, {
          ...edge,
          source: newSource,
          target: newTarget,
          // Сбрасываем ID чтобы ReactFlow не сходил с ума от дубликатов, 
          // но лучше использовать стабильный ID на основе ключа
          id: parseInt(stableHash(edgeKey).toString().slice(0, 9)) // Генерируем стабильный числовой ID
        });
      }
    });

    // Формируем итоговый массив и проставляем счетчики
    const resultEdges = Array.from(resultEdgesMap.values()).map(edge => {
      const sourceId = typeof edge.source === 'number' ? edge.source : String(edge.source);
      const targetId = typeof edge.target === 'number' ? edge.target : String(edge.target);
      const [minId, maxId] = [sourceId, targetId].sort();
      const edgeKey = `${minId}-${maxId}`;

      const count = edgeCounts.get(edgeKey) || 1;

      // Если рёбер много, добавляем свойство count
      if (count > 1) {
        return { ...edge, _aggregatedEdgeCount: count };
      }
      return edge;
    });

    return resultEdges;
  }, [edges, groups, expandedGroupIds, transformedNodes, activeRule]);

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
