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
    repulsion = 40000,
    attraction = 0.005,
    damping = 0.85,
    centerGravity = 0.05,
    minDistance = 350,
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
  const degrees = new Float64Array(n);

  nodes.forEach((node, i) => {
    ids[i] = node.id;
    idToIndex.set(node.id, i);
    posX[i] = node.PositionX ?? Math.random() * 800 + 100;
    posY[i] = node.PositionY ?? Math.random() * 600 + 100;
  });

  const edgeIndices: Array<[number, number]> = [];
  edges.forEach(edge => {
    const si = idToIndex.get(edge.source);
    const ti = idToIndex.get(edge.target);
    if (si !== undefined && ti !== undefined) {
      edgeIndices.push([si, ti]);
      degrees[si]++;
      degrees[ti]++;
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
              // Adaptive repulsion based on degree (more edges = needs more space)
              const degI = degrees[i];
              const degJ = degrees[j];
              rf *= (1 + Math.log1p(degI)) * (1 + Math.log1p(degJ));
              
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
          const degI = degrees[i];
          const degJ = degrees[j];
          rf *= (1 + Math.log1p(degI)) * (1 + Math.log1p(degJ));
          
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

// Keep only forceDirectedLayout as it's the most advanced custom fallback, but remove exports for others if not used elsewhere.
// Note: UI currently uses ELK for everything, so these are technically legacy but kept for safety.
