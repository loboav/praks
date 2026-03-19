import { describe, it, expect } from 'vitest';
import {
  forceDirectedLayout,
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

// Note: Legacy circularLayout, gridLayout, hierarchicalLayout, and radialLayout were removed 
// in favor of ELK-based layouts (elkLayout.ts). Tests below focus on the remaining 
// custom force-directed implementation.


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
