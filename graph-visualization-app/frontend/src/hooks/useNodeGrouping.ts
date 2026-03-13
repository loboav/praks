import { useState, useCallback, useMemo, useEffect } from 'react';
import { GraphObject, GraphRelation, ObjectType } from '../types/graph';

// ─── Типы ───────────────────────────────────────────────────────────────────

/**
 * Правило группировки узлов.
 * mode='property' — группировка всех узлов по значению свойства (один активный).
 * mode='manual'   — произвольная группировка конкретных узлов по ID (всегда активны).
 */
export interface GroupingRule {
  id: string;
  title: string;
  propertyKey: string; // для mode='property'
  categoryIds?: number[]; // фильтр по типам объектов, для mode='property'
  isActive: boolean;
  createdAt: number;
  mode: 'property' | 'manual';
  manualNodeIds?: number[]; // для mode='manual': конкретные ID узлов
  color?: string; // цвет мета-узла для manual-группы
  icon?: string; // иконка мета-узла для manual-группы
}

/** Вычисленная группа узлов */
export interface NodeGroup {
  id: string;
  ruleId: string;
  propertyValue: string;
  nodeIds: number[];
  categoryId?: number;
  isCollapsed: boolean;
  mode: 'property' | 'manual';
}

/** Агрегированная статистика по числовому свойству */
export interface NumericStat {
  key: string;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
}

/** Агрегированная статистика по дате */
export interface DateStat {
  key: string;
  count: number;
  first: string; // ISO строка или raw значение
  last: string;
}

/** Распределение строковых значений */
export interface StringDist {
  key: string;
  distribution: Record<string, number>; // value -> count
  totalCount: number;
  missingCount: number;
}

/** Полная агрегированная статистика для группы */
export interface GroupStats {
  nodeCount: number;
  numericStats: NumericStat[];
  dateStats: DateStat[];
  stringDists: StringDist[];
}

interface UseNodeGroupingProps {
  nodes: GraphObject[];
  edges: GraphRelation[];
  objectTypes: ObjectType[];
}

interface UseNodeGroupingReturn {
  rules: GroupingRule[];
  createRule: (title: string, propertyKey: string, categoryIds?: number[]) => void;
  createManualGroup: (title: string, nodeIds: number[], color?: string, icon?: string) => void;
  deleteRule: (ruleId: string) => void;
  toggleRule: (ruleId: string) => void;
  activeRule: GroupingRule | null;

  groups: NodeGroup[];
  toggleGroupCollapse: (groupId: string) => void;
  collapseAllGroups: () => void;
  expandAllGroups: () => void;

  transformedNodes: GraphObject[];
  transformedEdges: GraphRelation[];

  availableProperties: string[];

  /** Считает агрегированную статистику по узлам группы */
  computeGroupStats: (group: NodeGroup) => GroupStats;
}

// ─── Константы ───────────────────────────────────────────────────────────────

const STORAGE_KEY_RULES = 'graph_grouping_rules_v2';
const STORAGE_KEY_EXPANDED = 'graph_grouping_expanded_v2';

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function stableHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

let _ruleIdCounter = 0;

/** Попытка распознать строку как число */
function tryParseNumber(v: string): number | null {
  if (!v) return null;
  const n = parseFloat(v.replace(',', '.'));
  return isNaN(n) ? null : n;
}

/** Попытка распознать строку как дату, возвращает timestamp или null */
function tryParseDate(v: string): number | null {
  if (!v) return null;
  // ISO дата, Unix timestamp, dd.mm.yyyy и пр.
  const ts = Date.parse(v);
  if (!isNaN(ts)) return ts;
  // попробуем dd.mm.yyyy
  const dm = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dm) {
    const t = Date.parse(`${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`);
    if (!isNaN(t)) return t;
  }
  return null;
}

/** Форматирует timestamp обратно в читаемую дату */
function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ─── Хук ─────────────────────────────────────────────────────────────────────

export function useNodeGrouping({
  nodes,
  edges,
  objectTypes,
}: UseNodeGroupingProps): UseNodeGroupingReturn {
  // ── Правила ────────────────────────────────────────────────────────────────

  const [rules, setRules] = useState<GroupingRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RULES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Множество РАЗВЁРНУТЫХ групп (все свёрнуты по умолчанию)
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXPANDED);
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EXPANDED, JSON.stringify([...expandedGroupIds]));
  }, [expandedGroupIds]);

  // ── Активное rule (property mode, только одно) ─────────────────────────────

  const activeRule = useMemo(
    () => rules.find(r => r.mode === 'property' && r.isActive) ?? null,
    [rules]
  );

  // ── Доступные свойства для группировки ────────────────────────────────────

  const availableProperties = useMemo(() => {
    const set = new Set<string>();
    set.add('objectTypeId');
    nodes.forEach(n => n.properties && Object.keys(n.properties).forEach(k => set.add(k)));
    return Array.from(set);
  }, [nodes]);

  // ── Создание property-правила ──────────────────────────────────────────────

  const createRule = useCallback((title: string, propertyKey: string, categoryIds?: number[]) => {
    const newRule: GroupingRule = {
      id: `rule-${Date.now()}-${++_ruleIdCounter}`,
      title,
      propertyKey,
      categoryIds,
      isActive: false,
      createdAt: Date.now(),
      mode: 'property',
    };
    setRules(prev => [...prev, newRule]);
  }, []);

  // ── Создание manual-группы из произвольных узлов ──────────────────────────

  const createManualGroup = useCallback(
    (title: string, nodeIds: number[], color?: string, icon?: string) => {
      if (nodeIds.length < 2) return;
      const newRule: GroupingRule = {
        id: `manual-${Date.now()}-${++_ruleIdCounter}`,
        title,
        propertyKey: '__manual__',
        isActive: true, // manual-группы всегда активны
        createdAt: Date.now(),
        mode: 'manual',
        manualNodeIds: nodeIds,
        color: color ?? '#607d8b',
        icon: icon ?? '📦',
      };
      setRules(prev => [...prev, newRule]);
    },
    []
  );

  // ── Удаление / переключение ────────────────────────────────────────────────

  const deleteRule = useCallback((ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
    // Убираем из expanded
    setExpandedGroupIds(prev => {
      const next = new Set(prev);
      // groupId для property: `${ruleId}-${value}`, для manual: ruleId
      [...next]
        .filter(id => id === ruleId || id.startsWith(ruleId + '-'))
        .forEach(id => next.delete(id));
      return next;
    });
  }, []);

  const toggleRule = useCallback((ruleId: string) => {
    setRules(prev =>
      prev.map(r => {
        if (r.mode === 'manual') {
          // manual-группы не переключаются через общий toggle
          return r;
        }
        return {
          ...r,
          isActive: r.id === ruleId ? !r.isActive : false,
        };
      })
    );
    setExpandedGroupIds(new Set());
  }, []);

  // ── Вычисляем группы ───────────────────────────────────────────────────────

  const groups = useMemo((): NodeGroup[] => {
    const result: NodeGroup[] = [];

    // O(1) Maps
    const objectTypeMap = new Map<number, string>();
    objectTypes.forEach(t => objectTypeMap.set(t.id, t.name));
    const nodeTypeMap = new Map<number, number>();
    nodes.forEach(n => nodeTypeMap.set(n.id, n.objectTypeId));
    const nodeSet = new Set(nodes.map(n => n.id));

    // 1. Property-based groups (только если есть активное property-правило)
    if (activeRule) {
      const categoryFilter =
        activeRule.categoryIds && activeRule.categoryIds.length > 0
          ? new Set(activeRule.categoryIds)
          : null;

      const groupMap = new Map<string, number[]>();

      nodes.forEach(node => {
        if (categoryFilter && !categoryFilter.has(node.objectTypeId)) return;

        let value: string;
        if (activeRule.propertyKey === 'objectTypeId') {
          value = objectTypeMap.get(node.objectTypeId) ?? `Type ${node.objectTypeId}`;
        } else {
          value = node.properties?.[activeRule.propertyKey] ?? 'Не указано';
        }

        const existing = groupMap.get(value) ?? [];
        existing.push(node.id);
        groupMap.set(value, existing);
      });

      groupMap.forEach((nodeIds, propertyValue) => {
        if (nodeIds.length < 2) return;
        const groupId = `${activeRule.id}-${propertyValue}`;
        const catIds = new Set(
          nodeIds.map(id => nodeTypeMap.get(id)).filter((x): x is number => x !== undefined)
        );
        result.push({
          id: groupId,
          ruleId: activeRule.id,
          propertyValue,
          nodeIds,
          categoryId: catIds.size === 1 ? [...catIds][0] : undefined,
          isCollapsed: !expandedGroupIds.has(groupId),
          mode: 'property',
        });
      });
    }

    // 2. Manual groups (всегда, если есть правила с mode='manual')
    rules
      .filter(r => r.mode === 'manual' && r.manualNodeIds && r.manualNodeIds.length >= 2)
      .forEach(rule => {
        // Оставляем только узлы, которые реально есть на графе
        const validIds = (rule.manualNodeIds ?? []).filter(id => nodeSet.has(id));
        if (validIds.length < 2) return;

        const groupId = rule.id;
        const catIds = new Set(
          validIds.map(id => nodeTypeMap.get(id)).filter((x): x is number => x !== undefined)
        );
        result.push({
          id: groupId,
          ruleId: rule.id,
          propertyValue: rule.title,
          nodeIds: validIds,
          categoryId: catIds.size === 1 ? [...catIds][0] : undefined,
          isCollapsed: !expandedGroupIds.has(groupId),
          mode: 'manual',
        });
      });

    return result;
  }, [nodes, activeRule, rules, objectTypes, expandedGroupIds]);

  // ── Управление сворачиванием ───────────────────────────────────────────────

  const toggleGroupCollapse = useCallback((groupId: string) => {
    setExpandedGroupIds(prev => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  }, []);

  const collapseAllGroups = useCallback(() => {
    setExpandedGroupIds(new Set());
  }, []);

  const expandAllGroups = useCallback(() => {
    setExpandedGroupIds(new Set(groups.map(g => g.id)));
  }, [groups]);

  // ── Трансформированные узлы ───────────────────────────────────────────────

  const transformedNodes = useMemo((): GraphObject[] => {
    if (groups.length === 0) return nodes;

    const nodesMap = new Map<number, GraphObject>();
    nodes.forEach(n => nodesMap.set(n.id, n));

    const objectTypeMap = new Map<number, string>();
    objectTypes.forEach(t => objectTypeMap.set(t.id, t.name));

    // Узлы, скрытые в свёрнутых группах
    const hiddenNodeIds = new Set<number>();
    const collapsedGroups = groups.filter(g => !expandedGroupIds.has(g.id));
    collapsedGroups.forEach(g => g.nodeIds.forEach(id => hiddenNodeIds.add(id)));

    const visibleNodes = nodes.filter(n => !hiddenNodeIds.has(n.id));
    const metaNodes: GraphObject[] = [];

    // Множество узлов, принадлежащих раскрытым группам (для перепозиционирования)
    const expandedGroupNodeIds = new Set<number>();
    const expandedGroups = groups.filter(g => expandedGroupIds.has(g.id));
    expandedGroups.forEach(g => g.nodeIds.forEach(id => expandedGroupNodeIds.add(id)));

    // Генерируем мета-узлы для свёрнутых групп
    collapsedGroups.forEach(group => {
      const groupNodes = group.nodeIds
        .map(id => nodesMap.get(id))
        .filter((n): n is GraphObject => n !== undefined);

      if (groupNodes.length === 0) return;

      const avgX = groupNodes.reduce((s, n) => s + (n.PositionX ?? 0), 0) / groupNodes.length;
      const avgY = groupNodes.reduce((s, n) => s + (n.PositionY ?? 0), 0) / groupNodes.length;

      const uniqueCategories = new Set(groupNodes.map(n => n.objectTypeId));
      const isMixed = uniqueCategories.size > 1;

      // Для manual-группы берём цвет/иконку из правила
      const manualRule = group.mode === 'manual' ? rules.find(r => r.id === group.ruleId) : null;

      let color = manualRule?.color ?? '#9e9e9e';
      let icon = manualRule?.icon ?? '📦';

      if (!manualRule && !isMixed && group.categoryId) {
        const firstNode = groupNodes[0];
        color = firstNode?.color ?? '#9e9e9e';
        icon = firstNode?.icon ?? '📦';
      }

      const groupNodeIdsSet = new Set(group.nodeIds);
      const outgoingEdgesCount = edges.filter(e => {
        const sIn = groupNodeIdsSet.has(e.source);
        const tIn = groupNodeIdsSet.has(e.target);
        return (sIn && !tIn) || (!sIn && tIn);
      }).length;

      const metaNode: GraphObject = {
        id: -(Math.abs(stableHash(group.id)) + 1),
        name:
          group.mode === 'manual'
            ? `${group.propertyValue} ×${group.nodeIds.length}`
            : `${group.propertyValue} ×${group.nodeIds.length}`,
        objectTypeId: group.categoryId ?? 0,
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
        _groupNodeNames: groupNodes.map(n => n.name),
        _groupEdgeCount: outgoingEdgesCount,
        _groupIsMixed: isMixed,
        _groupMode: group.mode,
      } as any;

      metaNodes.push(metaNode);
    });

    // ── Генерируем контейнеры для РАСКРЫТЫХ групп ────────────────────────────
    const containerNodes: GraphObject[] = [];

    expandedGroups.forEach(group => {
      const groupNodes = group.nodeIds
        .map(id => nodesMap.get(id))
        .filter((n): n is GraphObject => n !== undefined);

      if (groupNodes.length === 0) return;

      // Центр группы
      const avgX = groupNodes.reduce((s, n) => s + (n.PositionX ?? 0), 0) / groupNodes.length;
      const avgY = groupNodes.reduce((s, n) => s + (n.PositionY ?? 0), 0) / groupNodes.length;

      // Радиус контейнера: растёт с количеством узлов
      const nodeSize = 100; // примерный размер узла
      const padding = 60;
      const R = Math.max(150, 50 * Math.sqrt(groupNodes.length)) + padding;
      const containerSize = R * 2;

      const containerIdString = `expanded-container-${group.id}`;
      // Делаем уникальный отрицательный ID, чтобы GraphCanvas мог его штатно переварить как number
      const containerNumericId = -(Math.abs(stableHash(containerIdString)) + 100000);

      // Создаём узел-контейнер (parent)
      containerNodes.push({
        id: containerNumericId,
        name: group.propertyValue,
        objectTypeId: 0,
        properties: {},
        PositionX: avgX - R,
        PositionY: avgY - R,
        _isExpandedGroupContainer: true,
        _expandedGroupLabel: group.propertyValue,
        _expandedGroupCount: groupNodes.length,
        _expandedGroupWidth: containerSize,
        _expandedGroupHeight: containerSize,
        _collapsedGroupId: group.id, // чтобы двойной клик на контейнере свернул группу
      } as any);

      // Create visible nodes with new positions and parent IDs
      const circleR = R - padding - nodeSize / 2;
      const innerVisibleNodes = groupNodes.map((node, i) => {
        const angle = (2 * Math.PI * i) / groupNodes.length - Math.PI / 2;
        const relX = R + circleR * Math.cos(angle) - nodeSize / 2;
        const relY = R + circleR * Math.sin(angle) - nodeSize / 2;

        return {
          ...node,
          PositionX: relX,
          PositionY: relY,
          _expandedGroupParentId: containerNumericId.toString(),
        } as any;
      });

      // Add to visibleNodes
      visibleNodes.push(...innerVisibleNodes);
    });

    // ReactFlow requires: parents BEFORE children in the array
    return [...containerNodes, ...visibleNodes, ...metaNodes];
  }, [nodes, groups, expandedGroupIds, objectTypes, edges, rules]);

  // ── Трансформированные рёбра ──────────────────────────────────────────────

  const transformedEdges = useMemo((): GraphRelation[] => {
    if (groups.length === 0) return edges;

    // Маппинг nodeId → metaNodeId для свёрнутых групп
    const nodeToGroupMeta = new Map<number, number>();

    const collapsedGroups = groups.filter(g => !expandedGroupIds.has(g.id));
    collapsedGroups.forEach(group => {
      const metaNode = transformedNodes.find(
        n => n.isCollapsedGroup && (n as any)._collapsedGroupId === group.id
      );
      if (!metaNode) return;
      group.nodeIds.forEach(id => nodeToGroupMeta.set(id, metaNode.id));
    });

    // Результирующий список рёбер. 
    // Обычные рёбра (между несвёрнутыми узлами) сохраняем как есть.
    // Рёбра, связанные с мета-узлами, агрегируем.
    const resultEdges: GraphRelation[] = [];
    const aggEdgesMap = new Map<string, GraphRelation>();
    const edgeCounts = new Map<string, number>();

    edges.forEach(edge => {
      const sourceMeta = nodeToGroupMeta.get(edge.source);
      const targetMeta = nodeToGroupMeta.get(edge.target);

      const newSource = sourceMeta ?? edge.source;
      const newTarget = targetMeta ?? edge.target;

      // Пропускаем петли внутри одной группы
      if (newSource === newTarget) return;

      // Если оба узла — оригинальные (или в раскрытых группах), сохраняем ребро целиком.
      // Это позволяет GraphCanvas отрисовывать их как параллельные кривые.
      if (sourceMeta === undefined && targetMeta === undefined) {
        resultEdges.push({
          ...edge,
          source: newSource,
          target: newTarget,
        });
        return;
      }

      // Если хотя бы один узел — мета-узел свёрнутой группы, агрегируем такие связи.
      const [minId, maxId] = [String(newSource), String(newTarget)].sort();
      const edgeKey = `agg::${minId}::${maxId}::${edge.relationTypeId}`;

      edgeCounts.set(edgeKey, (edgeCounts.get(edgeKey) ?? 0) + 1);

      if (!aggEdgesMap.has(edgeKey)) {
        aggEdgesMap.set(edgeKey, {
          ...edge,
          source: newSource,
          target: newTarget,
          id: Math.abs(stableHash(edgeKey)) + 1,
        });
      }
    });

    // Добавляем агрегированные рёбра в результат
    const finalAggEdges = Array.from(aggEdgesMap.values()).map(edge => {
      const [minId, maxId] = [String(edge.source), String(edge.target)].sort();
      const edgeKey = `agg::${minId}::${maxId}::${edge.relationTypeId}`;
      const count = edgeCounts.get(edgeKey) ?? 1;
      return count > 1 ? { ...edge, _aggregatedEdgeCount: count } : edge;
    });

    return [...resultEdges, ...finalAggEdges];
  }, [edges, groups, expandedGroupIds, transformedNodes]);

  // ── Агрегированная статистика по группе ───────────────────────────────────

  const computeGroupStats = useCallback(
    (group: NodeGroup): GroupStats => {
      const nodesMap = new Map<number, GraphObject>();
      nodes.forEach(n => nodesMap.set(n.id, n));

      const groupNodes = group.nodeIds
        .map(id => nodesMap.get(id))
        .filter((n): n is GraphObject => n !== undefined);

      if (groupNodes.length === 0) {
        return { nodeCount: 0, numericStats: [], dateStats: [], stringDists: [] };
      }

      // Собираем все уникальные ключи свойств
      const allKeys = new Set<string>();
      groupNodes.forEach(n => {
        if (n.properties) Object.keys(n.properties).forEach(k => allKeys.add(k));
      });

      const numericStats: NumericStat[] = [];
      const dateStats: DateStat[] = [];
      const stringDists: StringDist[] = [];

      allKeys.forEach(key => {
        const rawValues = groupNodes.map(n => n.properties?.[key] ?? '').filter(v => v !== '');

        if (rawValues.length === 0) return;

        // Пробуем числа
        const numbers = rawValues.map(tryParseNumber).filter((x): x is number => x !== null);
        if (numbers.length > 0 && numbers.length >= rawValues.length * 0.6) {
          numericStats.push({
            key,
            count: numbers.length,
            sum: numbers.reduce((a, b) => a + b, 0),
            avg: numbers.reduce((a, b) => a + b, 0) / numbers.length,
            min: Math.min(...numbers),
            max: Math.max(...numbers),
          });
          return;
        }

        // Пробуем даты
        const dates = rawValues.map(tryParseDate).filter((x): x is number => x !== null);
        if (dates.length > 0 && dates.length >= rawValues.length * 0.6) {
          const minTs = Math.min(...dates);
          const maxTs = Math.max(...dates);
          dateStats.push({
            key,
            count: dates.length,
            first: formatDate(minTs),
            last: formatDate(maxTs),
          });
          return;
        }

        // Строки — распределение
        const dist: Record<string, number> = {};
        rawValues.forEach(v => {
          dist[v] = (dist[v] ?? 0) + 1;
        });
        stringDists.push({
          key,
          distribution: dist,
          totalCount: rawValues.length,
          missingCount: groupNodes.length - rawValues.length,
        });
      });

      return {
        nodeCount: groupNodes.length,
        numericStats,
        dateStats,
        stringDists,
      };
    },
    [nodes]
  );

  // ── Возврат ──────────────────────────────────────────────────────────────

  return {
    rules,
    createRule,
    createManualGroup,
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
    computeGroupStats,
  };
}
