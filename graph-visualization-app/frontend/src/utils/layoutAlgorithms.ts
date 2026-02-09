import { GraphObject, GraphRelation } from '../types/graph';

export interface LayoutResult {
  nodes: Array<{ id: number; x: number; y: number }>;
}

export interface ForceDirectedOptions {
  iterations?: number;
  repulsion?: number;
  attraction?: number;
  damping?: number;
  centerGravity?: number;
  minDistance?: number;
}

export function forceDirectedLayout(
  nodes: GraphObject[],
  edges: GraphRelation[],
  options: ForceDirectedOptions = {}
): LayoutResult {
  const n = nodes.length;

  // Адаптивные итерации: 300 для малых графов, плавно снижается для больших
  // 100 узлов → 300, 500 → 150, 1000 → 80, 2000 → 50
  const defaultIterations = Math.max(50, Math.min(300, Math.round((300 * 100) / Math.max(n, 1))));

  const {
    iterations = defaultIterations,
    repulsion = 15000,
    attraction = 0.005,
    damping = 0.85,
    centerGravity = 0.05,
    minDistance = 150,
  } = options;

  // Используем индексированные массивы вместо Map для быстрого доступа
  // Это избегает overhead хеш-таблицы на каждой итерации
  const posX = new Float64Array(n);
  const posY = new Float64Array(n);
  const velX = new Float64Array(n);
  const velY = new Float64Array(n);
  const forceX = new Float64Array(n);
  const forceY = new Float64Array(n);

  // Маппинг nodeId → index для быстрого доступа
  const idToIndex = new Map<number, number>();
  const ids: number[] = new Array(n);

  nodes.forEach((node, i) => {
    ids[i] = node.id;
    idToIndex.set(node.id, i);
    posX[i] = node.PositionX ?? Math.random() * 800 + 100;
    posY[i] = node.PositionY ?? Math.random() * 600 + 100;
  });

  // Предкомпилируем рёбра в индексы для O(1) доступа
  const edgeIndices: Array<[number, number]> = [];
  edges.forEach(edge => {
    const si = idToIndex.get(edge.source);
    const ti = idToIndex.get(edge.target);
    if (si !== undefined && ti !== undefined) {
      edgeIndices.push([si, ti]);
    }
  });

  const centerX = 500;
  const centerY = 400;

  // Для больших графов (>500 узлов): пространственная Grid-оптимизация
  // Вместо O(n²) попарного сравнения, разбиваем на ячейки и считаем
  // отталкивание только между соседними ячейками
  const useGrid = n > 500;
  const cellSize = minDistance * 3; // Размер ячейки сетки

  for (let iter = 0; iter < iterations; iter++) {
    // Обнуляем силы
    forceX.fill(0);
    forceY.fill(0);

    if (useGrid) {
      // Grid-based repulsion: O(n × k) где k — среднее число соседей в ячейке
      // Вместо O(n²) = 1M операций → ~O(n × 20-50) = 20-50K операций
      const grid = new Map<string, number[]>();

      for (let i = 0; i < n; i++) {
        const cx = Math.floor(posX[i] / cellSize);
        const cy = Math.floor(posY[i] / cellSize);
        const key = `${cx},${cy}`;
        const cell = grid.get(key);
        if (cell) {
          cell.push(i);
        } else {
          grid.set(key, [i]);
        }
      }

      for (let i = 0; i < n; i++) {
        const cx = Math.floor(posX[i] / cellSize);
        const cy = Math.floor(posY[i] / cellSize);

        // Проверяем 3×3 соседние ячейки
        for (let dcx = -1; dcx <= 1; dcx++) {
          for (let dcy = -1; dcy <= 1; dcy++) {
            const neighbors = grid.get(`${cx + dcx},${cy + dcy}`);
            if (!neighbors) continue;

            for (let k = 0; k < neighbors.length; k++) {
              const j = neighbors[k];
              if (j <= i) continue; // Избегаем дублирования пар

              const dx = posX[j] - posX[i];
              const dy = posY[j] - posY[i];
              const distSq = dx * dx + dy * dy;
              const dist = Math.sqrt(distSq) || 1;

              let rf = repulsion / distSq;
              if (dist < minDistance) rf *= 2;

              const fx = (dx / dist) * rf;
              const fy = (dy / dist) * rf;

              forceX[i] -= fx;
              forceY[i] -= fy;
              forceX[j] += fx;
              forceY[j] += fy;
            }
          }
        }

        // Center gravity
        forceX[i] += (centerX - posX[i]) * centerGravity;
        forceY[i] += (centerY - posY[i]) * centerGravity;
      }
    } else {
      // Стандартный O(n²) для малых графов (<500 узлов) — тут он быстрее из-за overhead сетки
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = posX[j] - posX[i];
          const dy = posY[j] - posY[i];
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq) || 1;

          let rf = repulsion / distSq;
          if (dist < minDistance) rf *= 2;

          const fx = (dx / dist) * rf;
          const fy = (dy / dist) * rf;

          forceX[i] -= fx;
          forceY[i] -= fy;
          forceX[j] += fx;
          forceY[j] += fy;
        }

        // Center gravity
        forceX[i] += (centerX - posX[i]) * centerGravity;
        forceY[i] += (centerY - posY[i]) * centerGravity;
      }
    }

    // Силы притяжения (рёбра) — O(E)
    for (let e = 0; e < edgeIndices.length; e++) {
      const si = edgeIndices[e][0];
      const ti = edgeIndices[e][1];

      const dx = posX[ti] - posX[si];
      const dy = posY[ti] - posY[si];
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const af = attraction * dist;
      const fx = (dx / dist) * af;
      const fy = (dy / dist) * af;

      forceX[si] += fx;
      forceY[si] += fy;
      forceX[ti] -= fx;
      forceY[ti] -= fy;
    }

    // Обновляем позиции
    for (let i = 0; i < n; i++) {
      velX[i] = (velX[i] + forceX[i]) * damping;
      velY[i] = (velY[i] + forceY[i]) * damping;
      posX[i] += velX[i];
      posY[i] += velY[i];
    }
  }

  return {
    nodes: ids.map((id, i) => ({
      id,
      x: posX[i],
      y: posY[i],
    })),
  };
}

export function circularLayout(nodes: GraphObject[]): LayoutResult {
  const n = nodes.length;
  if (n === 0) return { nodes: [] };

  const nodeWidth = 200; // Ширина узла + отступ между узлами

  // Для малых графов (≤50) — один круг
  if (n <= 50) {
    const radius = Math.max(250, (n * nodeWidth) / (2 * Math.PI));
    const centerX = radius + 100;
    const centerY = radius + 100;
    const angleStep = (2 * Math.PI) / n;

    return {
      nodes: nodes.map((node, i) => ({
        id: node.id,
        x: centerX + radius * Math.cos(i * angleStep),
        y: centerY + radius * Math.sin(i * angleStep),
      })),
    };
  }

  // Для больших графов — концентрические кольца
  // Каждое кольцо вмещает столько узлов, сколько влезает по окружности без перекрытий
  const ringGap = 120; // Расстояние между кольцами
  const firstRadius = 300;
  const result: Array<{ id: number; x: number; y: number }> = [];

  // Распределяем узлы по кольцам
  const rings: number[][] = []; // индексы узлов в каждом кольце
  let remaining = n;
  let idx = 0;
  let ringIdx = 0;

  while (remaining > 0) {
    const radius = firstRadius + ringIdx * ringGap;
    const circumference = 2 * Math.PI * radius;
    const capacity = Math.max(1, Math.floor(circumference / nodeWidth));
    const count = Math.min(capacity, remaining);

    const ring: number[] = [];
    for (let i = 0; i < count; i++) {
      ring.push(idx++);
    }
    rings.push(ring);
    remaining -= count;
    ringIdx++;
  }

  // Вычисляем максимальный радиус для позиционирования центра
  const maxRadius = firstRadius + (rings.length - 1) * ringGap;
  const centerX = maxRadius + 200;
  const centerY = maxRadius + 200;

  // Расставляем узлы по кольцам
  rings.forEach((ring, rIdx) => {
    const radius = firstRadius + rIdx * ringGap;
    const angleStep = (2 * Math.PI) / ring.length;
    // Сдвигаем каждое чётное кольцо на пол-шага чтобы узлы не были на одной линии
    const angleOffset = rIdx % 2 === 0 ? 0 : angleStep / 2;

    ring.forEach((nodeIdx, i) => {
      const angle = i * angleStep + angleOffset;
      result.push({
        id: nodes[nodeIdx].id,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    });
  });

  return { nodes: result };
}

export function gridLayout(nodes: GraphObject[]): LayoutResult {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const spacing = 150;
  const startX = 100;
  const startY = 100;

  return {
    nodes: nodes.map((node, i) => ({
      id: node.id,
      x: startX + (i % cols) * spacing,
      y: startY + Math.floor(i / cols) * spacing,
    })),
  };
}

export function hierarchicalLayout(nodes: GraphObject[], edges: GraphRelation[]): LayoutResult {
  const levels = new Map<number, number>();
  const visited = new Set<number>();

  const findRoots = () => {
    const hasIncoming = new Set(edges.map(e => e.target));
    return nodes.filter(n => !hasIncoming.has(n.id));
  };

  const assignLevels = (nodeId: number, level: number) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    levels.set(nodeId, Math.max(levels.get(nodeId) || 0, level));

    edges.filter(e => e.source === nodeId).forEach(e => assignLevels(e.target, level + 1));
  };

  const roots = findRoots();
  if (roots.length === 0 && nodes.length > 0) {
    assignLevels(nodes[0].id, 0);
  } else {
    roots.forEach(root => assignLevels(root.id, 0));
  }

  nodes.forEach(node => {
    if (!levels.has(node.id)) {
      levels.set(node.id, 0);
    }
  });

  const nodesByLevel = new Map<number, number[]>();
  levels.forEach((level, nodeId) => {
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(nodeId);
  });

  const levelHeight = 150;
  const startY = 100;
  const centerX = 500;

  const result: Array<{ id: number; x: number; y: number }> = [];

  // Адаптивный spacing: минимум 200px (ширина узла + отступ)
  // Узлы никогда не перекрываются, layout растягивается горизонтально
  const nodeSpacing = 200;

  nodesByLevel.forEach((nodeIds, level) => {
    const count = nodeIds.length;
    const totalWidth = (count - 1) * nodeSpacing;
    const startX = centerX - totalWidth / 2;

    nodeIds.forEach((nodeId, i) => {
      result.push({
        id: nodeId,
        x: startX + i * nodeSpacing,
        y: startY + level * levelHeight,
      });
    });
  });

  return { nodes: result };
}

export function radialLayout(nodes: GraphObject[], edges: GraphRelation[]): LayoutResult {
  const centerX = 500;
  const centerY = 400;

  const findRoots = () => {
    const hasIncoming = new Set(edges.map(e => e.target));
    return nodes.filter(n => !hasIncoming.has(n.id));
  };

  const roots = findRoots();
  const centerNode = roots.length > 0 ? roots[0] : nodes[0];

  if (!centerNode) return { nodes: [] };

  const levels = new Map<number, number>();
  const visited = new Set<number>();

  const assignLevels = (nodeId: number, level: number) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    levels.set(nodeId, level);

    edges.filter(e => e.source === nodeId).forEach(e => assignLevels(e.target, level + 1));
  };

  assignLevels(centerNode.id, 0);

  nodes.forEach(node => {
    if (!levels.has(node.id)) {
      levels.set(node.id, 1);
    }
  });

  const nodesByLevel = new Map<number, number[]>();
  levels.forEach((level, nodeId) => {
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(nodeId);
  });

  const result: Array<{ id: number; x: number; y: number }> = [];
  let currentRadius = 0;
  const nodeWidth = 200; // Approximate width including gap
  const nodeHeight = 100; // Approximate height including gap

  // Sort levels to process from center outwards
  const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

  sortedLevels.forEach(level => {
    const nodeIds = nodesByLevel.get(level)!;

    if (level === 0) {
      result.push({ id: nodeIds[0], x: centerX, y: centerY });
      currentRadius += nodeHeight * 1.5; // Initial radius for next layer
    } else {
      // Calculate required circumference to fit all nodes
      const requiredCircumference = nodeIds.length * nodeWidth;
      // Calculate minimum radius based on circumference
      const minRadiusForCircumference = requiredCircumference / (2 * Math.PI);

      // Use the larger of: current accumulated radius OR radius needed for circumference
      const radius = Math.max(currentRadius, minRadiusForCircumference);

      // Update currentRadius for the NEXT layer (add some spacing)
      currentRadius = radius + nodeHeight * 1.5;

      const angleStep = (2 * Math.PI) / nodeIds.length;

      nodeIds.forEach((nodeId, i) => {
        result.push({
          id: nodeId,
          x: centerX + radius * Math.cos(i * angleStep),
          y: centerY + radius * Math.sin(i * angleStep),
        });
      });
    }
  });

  return { nodes: result };
}
