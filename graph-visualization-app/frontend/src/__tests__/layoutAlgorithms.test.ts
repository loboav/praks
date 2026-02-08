import { describe, it, expect } from 'vitest';
import {
  forceDirectedLayout,
  circularLayout,
  gridLayout,
  hierarchicalLayout,
  radialLayout,
} from '../utils/layoutAlgorithms';
import { GraphObject, GraphRelation } from '../types/graph';

const makeNode = (id: number, x?: number, y?: number): GraphObject => ({
  id,
  name: `Node ${id}`,
  objectTypeId: 1,
  properties: {},
  PositionX: x,
  PositionY: y,
});

const makeEdge = (id: number, source: number, target: number): GraphRelation => ({
  id,
  source,
  target,
  relationTypeId: 1,
  properties: {},
});

// ─── circularLayout ───────────────────────────────────────────────

describe('circularLayout', () => {
  it('should return positions for all nodes', () => {
    const nodes = [makeNode(1), makeNode(2), makeNode(3)];
    const result = circularLayout(nodes);
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.map(n => n.id).sort()).toEqual([1, 2, 3]);
  });

  it('should place nodes on a circle (equal distance from center)', () => {
    const nodes = Array.from({ length: 6 }, (_, i) => makeNode(i + 1));
    const result = circularLayout(nodes);

    const centerX = 500;
    const centerY = 400;

    const distances = result.nodes.map(n => {
      const dx = n.x - centerX;
      const dy = n.y - centerY;
      return Math.sqrt(dx * dx + dy * dy);
    });

    // All distances should be the same (on a circle)
    const firstDist = distances[0];
    distances.forEach(d => {
      expect(Math.abs(d - firstDist)).toBeLessThan(0.01);
    });
  });

  it('should handle single node', () => {
    const result = circularLayout([makeNode(1)]);
    expect(result.nodes).toHaveLength(1);
    expect(typeof result.nodes[0].x).toBe('number');
    expect(typeof result.nodes[0].y).toBe('number');
  });

  it('should handle empty array', () => {
    const result = circularLayout([]);
    expect(result.nodes).toEqual([]);
  });

  it('should produce unique positions for each node', () => {
    const nodes = Array.from({ length: 8 }, (_, i) => makeNode(i));
    const result = circularLayout(nodes);

    const posSet = new Set(result.nodes.map(n => `${n.x.toFixed(2)},${n.y.toFixed(2)}`));
    expect(posSet.size).toBe(8);
  });

  it('should increase radius for more nodes', () => {
    const small = circularLayout(Array.from({ length: 5 }, (_, i) => makeNode(i)));
    const large = circularLayout(Array.from({ length: 50 }, (_, i) => makeNode(i)));

    const distSmall = Math.sqrt((small.nodes[0].x - 500) ** 2 + (small.nodes[0].y - 400) ** 2);
    const distLarge = Math.sqrt((large.nodes[0].x - 500) ** 2 + (large.nodes[0].y - 400) ** 2);

    expect(distLarge).toBeGreaterThanOrEqual(distSmall);
  });
});

// ─── gridLayout ───────────────────────────────────────────────────

describe('gridLayout', () => {
  it('should return positions for all nodes', () => {
    const nodes = [makeNode(1), makeNode(2), makeNode(3), makeNode(4)];
    const result = gridLayout(nodes);
    expect(result.nodes).toHaveLength(4);
  });

  it('should arrange nodes in a grid pattern', () => {
    const nodes = Array.from({ length: 9 }, (_, i) => makeNode(i)); // 3x3 grid
    const result = gridLayout(nodes);

    // First row should have same y
    const firstRowY = result.nodes[0].y;
    expect(result.nodes[1].y).toBe(firstRowY);
    expect(result.nodes[2].y).toBe(firstRowY);

    // First column should have same x
    const firstColX = result.nodes[0].x;
    // nodes 0, 3, 6 are in the first column (cols = ceil(sqrt(9)) = 3)
    expect(result.nodes[3].x).toBe(firstColX);
    expect(result.nodes[6].x).toBe(firstColX);
  });

  it('should handle single node', () => {
    const result = gridLayout([makeNode(1)]);
    expect(result.nodes).toHaveLength(1);
  });

  it('should handle empty array', () => {
    const result = gridLayout([]);
    expect(result.nodes).toEqual([]);
  });

  it('should produce non-overlapping positions', () => {
    const nodes = Array.from({ length: 25 }, (_, i) => makeNode(i));
    const result = gridLayout(nodes);

    const posSet = new Set(result.nodes.map(n => `${n.x},${n.y}`));
    expect(posSet.size).toBe(25);
  });

  it('should place nodes with consistent spacing', () => {
    const nodes = Array.from({ length: 4 }, (_, i) => makeNode(i)); // 2x2
    const result = gridLayout(nodes);

    // Horizontal spacing between node 0 and node 1 should equal spacing between node 2 and node 3
    const hSpacing1 = result.nodes[1].x - result.nodes[0].x;
    const hSpacing2 = result.nodes[3].x - result.nodes[2].x;
    expect(hSpacing1).toBe(hSpacing2);
    expect(hSpacing1).toBeGreaterThan(0);
  });
});

// ─── hierarchicalLayout ──────────────────────────────────────────

describe('hierarchicalLayout', () => {
  it('should return positions for all nodes', () => {
    const nodes = [makeNode(1), makeNode(2), makeNode(3)];
    const edges = [makeEdge(10, 1, 2), makeEdge(11, 1, 3)];
    const result = hierarchicalLayout(nodes, edges);
    expect(result.nodes).toHaveLength(3);
  });

  it('should place root nodes at the top (lowest y)', () => {
    const nodes = [makeNode(1), makeNode(2), makeNode(3)];
    const edges = [makeEdge(10, 1, 2), makeEdge(11, 2, 3)]; // 1 → 2 → 3
    const result = hierarchicalLayout(nodes, edges);

    const posMap = new Map(result.nodes.map(n => [n.id, n]));
    expect(posMap.get(1)!.y).toBeLessThan(posMap.get(2)!.y);
    expect(posMap.get(2)!.y).toBeLessThan(posMap.get(3)!.y);
  });

  it('should place siblings at the same level', () => {
    const nodes = [makeNode(1), makeNode(2), makeNode(3)];
    const edges = [makeEdge(10, 1, 2), makeEdge(11, 1, 3)]; // 1 → 2, 1 → 3
    const result = hierarchicalLayout(nodes, edges);

    const posMap = new Map(result.nodes.map(n => [n.id, n]));
    expect(posMap.get(2)!.y).toBe(posMap.get(3)!.y);
  });

  it('should handle disconnected nodes', () => {
    const nodes = [makeNode(1), makeNode(2), makeNode(3)]; // node 3 disconnected
    const edges = [makeEdge(10, 1, 2)];
    const result = hierarchicalLayout(nodes, edges);
    expect(result.nodes).toHaveLength(3);
    // All nodes should have valid positions
    result.nodes.forEach(n => {
      expect(typeof n.x).toBe('number');
      expect(typeof n.y).toBe('number');
      expect(isNaN(n.x)).toBe(false);
      expect(isNaN(n.y)).toBe(false);
    });
  });

  it('should handle empty graph', () => {
    const result = hierarchicalLayout([], []);
    expect(result.nodes).toEqual([]);
  });

  it('should handle single node with no edges', () => {
    const result = hierarchicalLayout([makeNode(1)], []);
    expect(result.nodes).toHaveLength(1);
  });

  it('should handle graph with multiple roots', () => {
    const nodes = [makeNode(1), makeNode(2), makeNode(3), makeNode(4)];
    const edges = [makeEdge(10, 1, 3), makeEdge(11, 2, 4)];
    // Two roots: 1 and 2
    const result = hierarchicalLayout(nodes, edges);
    expect(result.nodes).toHaveLength(4);

    const posMap = new Map(result.nodes.map(n => [n.id, n]));
    // Roots should be at level 0
    expect(posMap.get(1)!.y).toBe(posMap.get(2)!.y);
    // Children at level 1
    expect(posMap.get(3)!.y).toBe(posMap.get(4)!.y);
    expect(posMap.get(3)!.y).toBeGreaterThan(posMap.get(1)!.y);
  });

  it('should handle deep chain', () => {
    const nodes = Array.from({ length: 10 }, (_, i) => makeNode(i));
    const edges = Array.from({ length: 9 }, (_, i) => makeEdge(i + 100, i, i + 1));
    const result = hierarchicalLayout(nodes, edges);

    const posMap = new Map(result.nodes.map(n => [n.id, n]));
    // Each subsequent node should be lower
    for (let i = 0; i < 9; i++) {
      expect(posMap.get(i)!.y).toBeLessThan(posMap.get(i + 1)!.y);
    }
  });
});

// ─── radialLayout ────────────────────────────────────────────────

describe('radialLayout', () => {
  it('should return positions for all nodes', () => {
    const nodes = [makeNode(1), makeNode(2), makeNode(3)];
    const edges = [makeEdge(10, 1, 2), makeEdge(11, 1, 3)];
    const result = radialLayout(nodes, edges);
    expect(result.nodes).toHaveLength(3);
  });

  it('should place root at center', () => {
    const nodes = [makeNode(1), makeNode(2), makeNode(3)];
    const edges = [makeEdge(10, 1, 2), makeEdge(11, 1, 3)];
    const result = radialLayout(nodes, edges);

    const posMap = new Map(result.nodes.map(n => [n.id, n]));
    expect(posMap.get(1)!.x).toBe(500);
    expect(posMap.get(1)!.y).toBe(400);
  });

  it('should place children farther from center than root', () => {
    const nodes = [makeNode(1), makeNode(2), makeNode(3)];
    const edges = [makeEdge(10, 1, 2), makeEdge(11, 1, 3)];
    const result = radialLayout(nodes, edges);

    const posMap = new Map(result.nodes.map(n => [n.id, n]));
    const rootDist = 0; // root is at center
    const child2Dist = Math.sqrt((posMap.get(2)!.x - 500) ** 2 + (posMap.get(2)!.y - 400) ** 2);
    const child3Dist = Math.sqrt((posMap.get(3)!.x - 500) ** 2 + (posMap.get(3)!.y - 400) ** 2);

    expect(child2Dist).toBeGreaterThan(rootDist);
    expect(child3Dist).toBeGreaterThan(rootDist);
  });

  it('should place siblings at equal distance from center', () => {
    const nodes = [makeNode(1), makeNode(2), makeNode(3), makeNode(4)];
    const edges = [makeEdge(10, 1, 2), makeEdge(11, 1, 3), makeEdge(12, 1, 4)];
    const result = radialLayout(nodes, edges);

    const posMap = new Map(result.nodes.map(n => [n.id, n]));
    const distances = [2, 3, 4].map(id => {
      const p = posMap.get(id)!;
      return Math.sqrt((p.x - 500) ** 2 + (p.y - 400) ** 2);
    });

    // All children should be same distance from center
    expect(Math.abs(distances[0] - distances[1])).toBeLessThan(0.01);
    expect(Math.abs(distances[1] - distances[2])).toBeLessThan(0.01);
  });

  it('should handle empty graph', () => {
    const result = radialLayout([], []);
    expect(result.nodes).toEqual([]);
  });

  it('should handle single node', () => {
    const result = radialLayout([makeNode(1)], []);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].x).toBe(500);
    expect(result.nodes[0].y).toBe(400);
  });

  it('should handle disconnected nodes', () => {
    const nodes = [makeNode(1), makeNode(2), makeNode(3)];
    const edges = [makeEdge(10, 1, 2)]; // node 3 disconnected
    const result = radialLayout(nodes, edges);
    expect(result.nodes).toHaveLength(3);
    result.nodes.forEach(n => {
      expect(isNaN(n.x)).toBe(false);
      expect(isNaN(n.y)).toBe(false);
    });
  });

  it('should place deeper levels farther from center', () => {
    const nodes = [makeNode(1), makeNode(2), makeNode(3)];
    const edges = [makeEdge(10, 1, 2), makeEdge(11, 2, 3)]; // 1 → 2 → 3
    const result = radialLayout(nodes, edges);

    const posMap = new Map(result.nodes.map(n => [n.id, n]));
    const dist2 = Math.sqrt((posMap.get(2)!.x - 500) ** 2 + (posMap.get(2)!.y - 400) ** 2);
    const dist3 = Math.sqrt((posMap.get(3)!.x - 500) ** 2 + (posMap.get(3)!.y - 400) ** 2);

    expect(dist3).toBeGreaterThan(dist2);
  });
});

// ─── forceDirectedLayout ─────────────────────────────────────────

describe('forceDirectedLayout', () => {
  it('should return positions for all nodes', () => {
    const nodes = [makeNode(1), makeNode(2), makeNode(3)];
    const edges = [makeEdge(10, 1, 2)];
    const result = forceDirectedLayout(nodes, edges, { iterations: 10 });
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.map(n => n.id).sort()).toEqual([1, 2, 3]);
  });

  it('should produce valid numeric positions', () => {
    const nodes = [makeNode(1), makeNode(2)];
    const edges = [makeEdge(10, 1, 2)];
    const result = forceDirectedLayout(nodes, edges, { iterations: 10 });
    result.nodes.forEach(n => {
      expect(typeof n.x).toBe('number');
      expect(typeof n.y).toBe('number');
      expect(isNaN(n.x)).toBe(false);
      expect(isNaN(n.y)).toBe(false);
      expect(isFinite(n.x)).toBe(true);
      expect(isFinite(n.y)).toBe(true);
    });
  });

  it('should separate disconnected nodes via repulsion', () => {
    // Two nodes very close, no edges → should repel each other
    const nodes = [makeNode(1, 500, 400), makeNode(2, 501, 400)];
    const result = forceDirectedLayout(nodes, [], { iterations: 50 });

    const posMap = new Map(result.nodes.map(n => [n.id, n]));
    const dx = Math.abs(posMap.get(1)!.x - posMap.get(2)!.x);
    // They should be pushed apart
    expect(dx).toBeGreaterThan(10);
  });

  it('should pull connected nodes closer via attraction', () => {
    // Two connected nodes far apart → should attract
    const nodes = [makeNode(1, 100, 400), makeNode(2, 900, 400)];
    const edges = [makeEdge(10, 1, 2)];
    const result = forceDirectedLayout(nodes, edges, { iterations: 50 });

    const posMap = new Map(result.nodes.map(n => [n.id, n]));
    const finalDx = Math.abs(posMap.get(1)!.x - posMap.get(2)!.x);
    // They should be closer than the original 800px
    expect(finalDx).toBeLessThan(800);
  });

  it('should handle single node', () => {
    const result = forceDirectedLayout([makeNode(1, 300, 300)], [], {
      iterations: 10,
    });
    expect(result.nodes).toHaveLength(1);
    expect(isFinite(result.nodes[0].x)).toBe(true);
    expect(isFinite(result.nodes[0].y)).toBe(true);
  });

  it('should handle empty graph', () => {
    const result = forceDirectedLayout([], [], { iterations: 10 });
    expect(result.nodes).toEqual([]);
  });

  it('should handle edges referencing missing nodes', () => {
    const nodes = [makeNode(1)];
    const edges = [makeEdge(10, 1, 999)]; // node 999 missing
    // Should not crash
    const result = forceDirectedLayout(nodes, edges, { iterations: 10 });
    expect(result.nodes).toHaveLength(1);
  });

  it('should use adaptive iterations for large graphs', () => {
    // With 1000 nodes, default iterations should be much less than 300
    const nodes = Array.from({ length: 1000 }, (_, i) =>
      makeNode(i, Math.random() * 800, Math.random() * 600)
    );
    const edges = Array.from({ length: 500 }, (_, i) =>
      makeEdge(i + 10000, i % 1000, (i * 7 + 3) % 1000)
    );

    const start = performance.now();
    const result = forceDirectedLayout(nodes, edges);
    const duration = performance.now() - start;

    expect(result.nodes).toHaveLength(1000);
    // Should complete in reasonable time (under 5 seconds)
    // The old O(n²)×300 would take much longer
    expect(duration).toBeLessThan(5000);
  });

  it('should use grid optimization for >500 nodes', () => {
    const nodes = Array.from({ length: 600 }, (_, i) =>
      makeNode(i, Math.random() * 1000, Math.random() * 1000)
    );
    const edges = Array.from({ length: 300 }, (_, i) =>
      makeEdge(i + 10000, i % 600, (i + 1) % 600)
    );

    const result = forceDirectedLayout(nodes, edges, { iterations: 20 });
    expect(result.nodes).toHaveLength(600);

    // All positions should be valid
    result.nodes.forEach(n => {
      expect(isFinite(n.x)).toBe(true);
      expect(isFinite(n.y)).toBe(true);
    });
  });

  it('should respect custom options', () => {
    // Use more iterations and lower repulsion so attraction effect is dominant
    const nodes = [makeNode(1, 400, 400), makeNode(2, 600, 400)];
    const edges = [makeEdge(10, 1, 2)];

    const highAttraction = forceDirectedLayout(nodes, edges, {
      iterations: 200,
      attraction: 0.1,
      repulsion: 100,
    });
    const lowAttraction = forceDirectedLayout(nodes, edges, {
      iterations: 200,
      attraction: 0.0001,
      repulsion: 100,
    });

    const posHigh = new Map(highAttraction.nodes.map(n => [n.id, n]));
    const posLow = new Map(lowAttraction.nodes.map(n => [n.id, n]));

    const distHigh = Math.sqrt(
      (posHigh.get(1)!.x - posHigh.get(2)!.x) ** 2 + (posHigh.get(1)!.y - posHigh.get(2)!.y) ** 2
    );
    const distLow = Math.sqrt(
      (posLow.get(1)!.x - posLow.get(2)!.x) ** 2 + (posLow.get(1)!.y - posLow.get(2)!.y) ** 2
    );

    // Higher attraction should result in smaller distance
    expect(distHigh).toBeLessThan(distLow);
  });

  it('should apply center gravity', () => {
    // Place a single node far from center
    const nodes = [makeNode(1, 5000, 5000)];
    const result = forceDirectedLayout(nodes, [], {
      iterations: 100,
      centerGravity: 0.1,
    });

    // Should be pulled towards center (500, 400)
    expect(Math.abs(result.nodes[0].x - 500)).toBeLessThan(4600);
    expect(Math.abs(result.nodes[0].y - 400)).toBeLessThan(4700);
  });

  it('should handle nodes with undefined positions', () => {
    const nodes = [makeNode(1), makeNode(2)]; // no PositionX/Y
    const edges = [makeEdge(10, 1, 2)];
    const result = forceDirectedLayout(nodes, edges, { iterations: 10 });
    expect(result.nodes).toHaveLength(2);
    result.nodes.forEach(n => {
      expect(isFinite(n.x)).toBe(true);
      expect(isFinite(n.y)).toBe(true);
    });
  });

  it('should produce stable results with deterministic inputs', () => {
    const nodes = [makeNode(1, 100, 100), makeNode(2, 200, 200)];
    const edges = [makeEdge(10, 1, 2)];

    const result1 = forceDirectedLayout(nodes, edges, { iterations: 30 });
    const result2 = forceDirectedLayout(nodes, edges, { iterations: 30 });

    // Same inputs → same outputs
    expect(result1.nodes[0].x).toBeCloseTo(result2.nodes[0].x, 5);
    expect(result1.nodes[0].y).toBeCloseTo(result2.nodes[0].y, 5);
    expect(result1.nodes[1].x).toBeCloseTo(result2.nodes[1].x, 5);
    expect(result1.nodes[1].y).toBeCloseTo(result2.nodes[1].y, 5);
  });
});

// ─── all layouts: common invariants ──────────────────────────────

describe('all layouts: common invariants', () => {
  const nodes = Array.from({ length: 20 }, (_, i) => makeNode(i));
  const edges = Array.from({ length: 15 }, (_, i) => makeEdge(i + 100, i % 20, (i + 1) % 20));

  const layouts = [
    { name: 'circular', fn: () => circularLayout(nodes) },
    { name: 'grid', fn: () => gridLayout(nodes) },
    { name: 'hierarchical', fn: () => hierarchicalLayout(nodes, edges) },
    { name: 'radial', fn: () => radialLayout(nodes, edges) },
    {
      name: 'forceDirected',
      fn: () => forceDirectedLayout(nodes, edges, { iterations: 10 }),
    },
  ];

  layouts.forEach(({ name, fn }) => {
    describe(`${name}`, () => {
      it('should return a result for every input node', () => {
        const result = fn();
        expect(result.nodes).toHaveLength(20);
      });

      it('should return correct node IDs', () => {
        const result = fn();
        const ids = result.nodes.map(n => n.id).sort((a, b) => a - b);
        expect(ids).toEqual(nodes.map(n => n.id).sort((a, b) => a - b));
      });

      it('should return finite x and y for every node', () => {
        const result = fn();
        result.nodes.forEach(n => {
          expect(isFinite(n.x)).toBe(true);
          expect(isFinite(n.y)).toBe(true);
        });
      });

      it('should not return NaN positions', () => {
        const result = fn();
        result.nodes.forEach(n => {
          expect(isNaN(n.x)).toBe(false);
          expect(isNaN(n.y)).toBe(false);
        });
      });
    });
  });
});
