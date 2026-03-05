import { useState, useCallback, useMemo, useEffect } from 'react';
import { GraphRelation, RelationType } from '../types/graph';

// ─── Типы ────────────────────────────────────────────────────────────────────

/** Агрегированная статистика по числовому свойству рёбер */
export interface EdgeNumericStat {
  key: string;
  count: number;   // кол-во валидных значений
  sum: number;
  avg: number;
  min: number;
  max: number;
}

/** Агрегированная статистика по датам */
export interface EdgeDateStat {
  key: string;
  count: number;
  first: string;   // самая ранняя дата (форматированная)
  last: string;    // самая поздняя дата (форматированная)
}

/** Агрегированное ребро — представляет N параллельных рёбер одного типа */
export interface AggregatedEdge extends GraphRelation {
  _isAggregated: true;
  _originalEdgeIds: number[];          // IDs исходных рёбер
  _aggregatedEdgeCount: number;        // сколько рёбер схлопнуто
  _numericStats: EdgeNumericStat[];    // числовая статистика по свойствам
  _dateStats: EdgeDateStat[];          // статистика по датам
  _hasInvalidProps: boolean;           // были ли невалидные значения
}

export interface UseEdgeGroupingReturn {
  /** Типы связей, для которых включена группировка */
  enabledTypeIds: Set<number>;
  toggleType: (typeId: number) => void;
  enableAll: (typeIds: number[]) => void;
  disableAll: () => void;
  isEnabled: (typeId: number) => boolean;

  /** Трансформированные рёбра (параллельные схлопнуты) */
  groupedEdges: GraphRelation[];

  /** Выбранное агрегированное ребро для инспекции */
  selectedAggEdge: AggregatedEdge | null;
  selectAggEdge: (edge: AggregatedEdge | null) => void;

  /** Найти агрегированное ребро по ID (для обработки клика) */
  findAggEdge: (edgeId: number) => AggregatedEdge | undefined;

  /** Сколько групп параллельных рёбер сформировано */
  groupCount: number;
}

// ─── Константы ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'graph_edge_grouping_v1';

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function tryNum(v: string): number | null {
  if (!v && v !== '0') return null;
  const n = parseFloat(v.replace(',', '.'));
  return isNaN(n) ? null : n;
}

function tryDate(v: string): number | null {
  if (!v) return null;
  let ts = Date.parse(v);
  if (!isNaN(ts)) return ts;
  // dd.mm.yyyy
  const m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    ts = Date.parse(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
    if (!isNaN(ts)) return ts;
  }
  // dd/mm/yyyy
  const m2 = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m2) {
    ts = Date.parse(`${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`);
    if (!isNaN(ts)) return ts;
  }
  return null;
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Вычисляет агрегированную статистику по набору рёбер.
 * Для каждого свойства определяет тип (число / дата / строка)
 * и собирает соответствующие метрики.
 */
function computeEdgeStats(
  edges: GraphRelation[]
): Pick<AggregatedEdge, '_numericStats' | '_dateStats' | '_hasInvalidProps'> {
  if (edges.length === 0) {
    return { _numericStats: [], _dateStats: [], _hasInvalidProps: false };
  }

  // Собираем все ключи свойств
  const allKeys = new Set<string>();
  edges.forEach(e => {
    if (e.properties) Object.keys(e.properties).forEach(k => allKeys.add(k));
  });

  const numericStats: EdgeNumericStat[] = [];
  const dateStats: EdgeDateStat[] = [];
  let hasInvalid = false;

  allKeys.forEach(key => {
    const rawValues = edges
      .map(e => e.properties?.[key] ?? '')
      .filter(v => v !== '');

    if (rawValues.length === 0) return;

    // Сначала пробуем числа
    const nums = rawValues.map(tryNum).filter((x): x is number => x !== null);
    if (nums.length > 0 && nums.length >= rawValues.length * 0.5) {
      if (nums.length < rawValues.length) hasInvalid = true;
      const sum = nums.reduce((a, b) => a + b, 0);
      numericStats.push({
        key,
        count: nums.length,
        sum,
        avg: sum / nums.length,
        min: Math.min(...nums),
        max: Math.max(...nums),
      });
      return;
    }

    // Пробуем даты
    const dates = rawValues.map(tryDate).filter((x): x is number => x !== null);
    if (dates.length > 0 && dates.length >= rawValues.length * 0.5) {
      if (dates.length < rawValues.length) hasInvalid = true;
      dateStats.push({
        key,
        count: dates.length,
        first: fmtDate(Math.min(...dates)),
        last: fmtDate(Math.max(...dates)),
      });
      return;
    }

    // Строки — не агрегируем, просто отмечаем что есть невалидное для чисел/дат
    // (не делаем ничего — строки показываются только в NodeGrouping)
  });

  return { _numericStats: numericStats, _dateStats: dateStats, _hasInvalidProps: hasInvalid };
}

/**
 * Генерирует стабильный числовой ID для агрегированного ребра.
 * Используем djb2-хеш строки вида "src::tgt::typeId".
 */
function stableId(src: number, tgt: number, typeId: number): number {
  const s = `agg::${src}::${tgt}::${typeId}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  // Делаем положительным и добавляем большой offset чтобы не пересечься с реальными ID
  return (Math.abs(h) % 9_000_000) + 1_000_000;
}

// ─── Хук ─────────────────────────────────────────────────────────────────────

/**
 * Независимая группировка параллельных рёбер по типу.
 *
 * Логика:
 * - Пользователь включает группировку для конкретных RelationType.
 * - Все параллельные рёбра ОДНОГО типа между ОДНОЙ парой узлов (в одном направлении)
 *   схлопываются в одно агрегированное ребро.
 * - Агрегированное ребро хранит числовую и датовую статистику по свойствам.
 * - При клике на агрегированное ребро → открывается карточка со статистикой.
 */
export function useEdgeGrouping(
  edges: GraphRelation[],
  relationTypes: RelationType[]
): UseEdgeGroupingReturn {
  // ── Персистентное состояние включённых типов ────────────────────────────

  const [enabledTypeIds, setEnabledTypeIds] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set<number>();
    } catch {
      return new Set<number>();
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...enabledTypeIds]));
  }, [enabledTypeIds]);

  // ── Выбранное агрегированное ребро ─────────────────────────────────────

  const [selectedAggEdge, setSelectedAggEdge] = useState<AggregatedEdge | null>(null);

  const selectAggEdge = useCallback((edge: AggregatedEdge | null) => {
    setSelectedAggEdge(edge);
  }, []);

  // ── Управление включёнными типами ──────────────────────────────────────

  const toggleType = useCallback((typeId: number) => {
    setEnabledTypeIds(prev => {
      const next = new Set(prev);
      next.has(typeId) ? next.delete(typeId) : next.add(typeId);
      return next;
    });
    // Сбросить выделение если меняется группировка
    setSelectedAggEdge(null);
  }, []);

  const enableAll = useCallback((typeIds: number[]) => {
    setEnabledTypeIds(new Set(typeIds));
    setSelectedAggEdge(null);
  }, []);

  const disableAll = useCallback(() => {
    setEnabledTypeIds(new Set());
    setSelectedAggEdge(null);
  }, []);

  const isEnabled = useCallback(
    (typeId: number) => enabledTypeIds.has(typeId),
    [enabledTypeIds]
  );

  // ── Трансформация рёбер ────────────────────────────────────────────────

  const { groupedEdges, aggEdgeMap, groupCount } = useMemo(() => {
    if (enabledTypeIds.size === 0) {
      return { groupedEdges: edges, aggEdgeMap: new Map<number, AggregatedEdge>(), groupCount: 0 };
    }

    // Разделяем рёбра на обычные и подлежащие группировке
    const toGroup: GraphRelation[] = [];
    const passThrough: GraphRelation[] = [];

    edges.forEach(e => {
      if (enabledTypeIds.has(e.relationTypeId)) {
        toGroup.push(e);
      } else {
        passThrough.push(e);
      }
    });

    // Группируем по ключу: source::target::typeId (направление важно)
    const buckets = new Map<string, GraphRelation[]>();
    toGroup.forEach(e => {
      const key = `${e.source}::${e.target}::${e.relationTypeId}`;
      const arr = buckets.get(key) ?? [];
      arr.push(e);
      buckets.set(key, arr);
    });

    const aggEdges: GraphRelation[] = [];
    const aggMap = new Map<number, AggregatedEdge>();
    let groups = 0;

    buckets.forEach((group, key) => {
      if (group.length === 1) {
        // Одно ребро — не агрегируем, просто пропускаем через
        passThrough.push(group[0]);
        return;
      }

      groups++;

      const first = group[0];
      const aggId = stableId(first.source, first.target, first.relationTypeId);
      const stats = computeEdgeStats(group);

      const aggEdge: AggregatedEdge = {
        ...first,
        id: aggId,
        _isAggregated: true,
        _originalEdgeIds: group.map(e => e.id),
        _aggregatedEdgeCount: group.length,
        ...stats,
      };

      aggEdges.push(aggEdge);
      aggMap.set(aggId, aggEdge);
    });

    return {
      groupedEdges: [...passThrough, ...aggEdges],
      aggEdgeMap: aggMap,
      groupCount: groups,
    };
  }, [edges, enabledTypeIds]);

  // ── Поиск агрегированного ребра по ID ─────────────────────────────────

  const findAggEdge = useCallback(
    (edgeId: number) => aggEdgeMap.get(edgeId),
    [aggEdgeMap]
  );

  return {
    enabledTypeIds,
    toggleType,
    enableAll,
    disableAll,
    isEnabled,
    groupedEdges,
    selectedAggEdge,
    selectAggEdge,
    findAggEdge,
    groupCount,
  };
}
