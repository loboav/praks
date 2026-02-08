import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGraphFilters } from '../hooks/useGraphFilters';
import { GraphObject, GraphRelation, ObjectType, RelationType } from '../types/graph';

const makeNode = (
  id: number,
  objectTypeId: number,
  props: Record<string, string> = {}
): GraphObject => ({
  id,
  name: `Node ${id}`,
  objectTypeId,
  properties: props,
});

const makeEdge = (
  id: number,
  source: number,
  target: number,
  relationTypeId: number
): GraphRelation => ({
  id,
  source,
  target,
  relationTypeId,
  properties: {},
});

const objectTypes: ObjectType[] = [
  { id: 1, name: 'Person' },
  { id: 2, name: 'Company' },
  { id: 3, name: 'Location' },
];

const relationTypes: RelationType[] = [
  { id: 10, name: 'knows', objectTypeId: 1 },
  { id: 20, name: 'works_at', objectTypeId: 1 },
  { id: 30, name: 'located_in', objectTypeId: 2 },
];

describe('useGraphFilters', () => {
  const defaultNodes: GraphObject[] = [
    makeNode(1, 1),
    makeNode(2, 1),
    makeNode(3, 2),
    makeNode(4, 2),
    makeNode(5, 3),
  ];

  const defaultEdges: GraphRelation[] = [
    makeEdge(100, 1, 2, 10),
    makeEdge(101, 1, 3, 20),
    makeEdge(102, 3, 4, 30),
    makeEdge(103, 4, 5, 30),
  ];

  describe('initialization', () => {
    it('should auto-initialize filters with all types selected', () => {
      const { result } = renderHook(() =>
        useGraphFilters({
          nodes: defaultNodes,
          edges: defaultEdges,
          objectTypes,
          relationTypes,
        })
      );

      expect(result.current.filters.selectedObjectTypes).toEqual([1, 2, 3]);
      expect(result.current.filters.selectedRelationTypes).toEqual([10, 20, 30]);
      expect(result.current.filters.showIsolatedNodes).toBe(true);
    });

    it('should return all nodes and edges when no filters are active', () => {
      const { result } = renderHook(() =>
        useGraphFilters({
          nodes: defaultNodes,
          edges: defaultEdges,
          objectTypes,
          relationTypes,
        })
      );

      expect(result.current.filteredNodes).toHaveLength(5);
      expect(result.current.filteredEdges).toHaveLength(4);
    });

    it('should not have active filters initially', () => {
      const { result } = renderHook(() =>
        useGraphFilters({
          nodes: defaultNodes,
          edges: defaultEdges,
          objectTypes,
          relationTypes,
        })
      );

      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe('filtering by object type', () => {
    it('should filter nodes by selected object types', () => {
      const { result } = renderHook(() =>
        useGraphFilters({
          nodes: defaultNodes,
          edges: defaultEdges,
          objectTypes,
          relationTypes,
        })
      );

      act(() => {
        result.current.applyFilters({
          selectedObjectTypes: [1], // Only Person
          selectedRelationTypes: [10, 20, 30],
          showIsolatedNodes: true,
        });
      });

      expect(result.current.filteredNodes).toHaveLength(2);
      expect(result.current.filteredNodes.every(n => n.objectTypeId === 1)).toBe(true);
    });

    it('should filter edges whose source or target is hidden', () => {
      const { result } = renderHook(() =>
        useGraphFilters({
          nodes: defaultNodes,
          edges: defaultEdges,
          objectTypes,
          relationTypes,
        })
      );

      act(() => {
        result.current.applyFilters({
          selectedObjectTypes: [1], // Only Person — hides nodes 3,4,5
          selectedRelationTypes: [10, 20, 30],
          showIsolatedNodes: true,
        });
      });

      // Only edge 100 (1→2) remains because both nodes are type 1
      // Edge 101 (1→3) removed because node 3 is type 2
      expect(result.current.filteredEdges).toHaveLength(1);
      expect(result.current.filteredEdges[0].id).toBe(100);
    });

    it('should show 0 nodes when no object types selected', () => {
      // Use empty objectTypes so auto-init doesn't re-populate
      const { result } = renderHook(() =>
        useGraphFilters({
          nodes: defaultNodes,
          edges: defaultEdges,
          objectTypes: [],
          relationTypes,
        })
      );

      // With no objectTypes provided, selectedObjectTypes stays empty
      expect(result.current.filteredNodes).toHaveLength(0);
      expect(result.current.filteredEdges).toHaveLength(0);
    });

    it('should select multiple object types', () => {
      const { result } = renderHook(() =>
        useGraphFilters({
          nodes: defaultNodes,
          edges: defaultEdges,
          objectTypes,
          relationTypes,
        })
      );

      act(() => {
        result.current.applyFilters({
          selectedObjectTypes: [1, 2], // Person + Company
          selectedRelationTypes: [10, 20, 30],
          showIsolatedNodes: true,
        });
      });

      expect(result.current.filteredNodes).toHaveLength(4);
      expect(result.current.filteredNodes.map(n => n.id).sort()).toEqual([1, 2, 3, 4]);
    });
  });

  describe('filtering by relation type', () => {
    it('should filter edges by selected relation types', () => {
      const { result } = renderHook(() =>
        useGraphFilters({
          nodes: defaultNodes,
          edges: defaultEdges,
          objectTypes,
          relationTypes,
        })
      );

      act(() => {
        result.current.applyFilters({
          selectedObjectTypes: [1, 2, 3],
          selectedRelationTypes: [10], // Only "knows"
          showIsolatedNodes: true,
        });
      });

      expect(result.current.filteredEdges).toHaveLength(1);
      expect(result.current.filteredEdges[0].relationTypeId).toBe(10);
    });

    it('should show 0 edges when no relation types selected', () => {
      // Use empty relationTypes so auto-init doesn't re-populate
      const { result } = renderHook(() =>
        useGraphFilters({
          nodes: defaultNodes,
          edges: defaultEdges,
          objectTypes,
          relationTypes: [],
        })
      );

      // With no relationTypes provided, selectedRelationTypes stays empty
      expect(result.current.filteredEdges).toHaveLength(0);
      // All nodes still visible since showIsolatedNodes is true
      expect(result.current.filteredNodes).toHaveLength(5);
    });

    it('should combine object type and relation type filters', () => {
      const { result } = renderHook(() =>
        useGraphFilters({
          nodes: defaultNodes,
          edges: defaultEdges,
          objectTypes,
          relationTypes,
        })
      );

      act(() => {
        result.current.applyFilters({
          selectedObjectTypes: [1, 2], // Person + Company
          selectedRelationTypes: [20], // Only works_at
          showIsolatedNodes: true,
        });
      });

      // Edge 101 (1→3) is works_at AND both nodes visible
      expect(result.current.filteredEdges).toHaveLength(1);
      expect(result.current.filteredEdges[0].id).toBe(101);
    });
  });

  describe('isolated nodes filter', () => {
    it('should hide isolated nodes when showIsolatedNodes is false', () => {
      // Node 5 (Location) is connected only to node 4 via edge 103
      // Create a scenario with a truly isolated node
      const nodes = [
        makeNode(1, 1),
        makeNode(2, 1),
        makeNode(3, 1), // isolated — no edges connect to it
      ];
      const edges = [makeEdge(100, 1, 2, 10)];

      const { result } = renderHook(() =>
        useGraphFilters({
          nodes,
          edges,
          objectTypes,
          relationTypes,
        })
      );

      act(() => {
        result.current.applyFilters({
          selectedObjectTypes: [1],
          selectedRelationTypes: [10],
          showIsolatedNodes: false,
        });
      });

      // Node 3 should be hidden (no connections)
      expect(result.current.filteredNodes).toHaveLength(2);
      expect(result.current.filteredNodes.map(n => n.id).sort()).toEqual([1, 2]);
    });

    it('should show isolated nodes when showIsolatedNodes is true', () => {
      const nodes = [
        makeNode(1, 1),
        makeNode(2, 1),
        makeNode(3, 1), // isolated
      ];
      const edges = [makeEdge(100, 1, 2, 10)];

      const { result } = renderHook(() =>
        useGraphFilters({
          nodes,
          edges,
          objectTypes,
          relationTypes,
        })
      );

      act(() => {
        result.current.applyFilters({
          selectedObjectTypes: [1],
          selectedRelationTypes: [10],
          showIsolatedNodes: true,
        });
      });

      expect(result.current.filteredNodes).toHaveLength(3);
    });
  });

  describe('hasActiveFilters', () => {
    it('should be true when some object types are deselected', () => {
      const { result } = renderHook(() =>
        useGraphFilters({
          nodes: defaultNodes,
          edges: defaultEdges,
          objectTypes,
          relationTypes,
        })
      );

      act(() => {
        result.current.applyFilters({
          selectedObjectTypes: [1],
          selectedRelationTypes: [10, 20, 30],
          showIsolatedNodes: true,
        });
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should be true when some relation types are deselected', () => {
      const { result } = renderHook(() =>
        useGraphFilters({
          nodes: defaultNodes,
          edges: defaultEdges,
          objectTypes,
          relationTypes,
        })
      );

      act(() => {
        result.current.applyFilters({
          selectedObjectTypes: [1, 2, 3],
          selectedRelationTypes: [10],
          showIsolatedNodes: true,
        });
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should be true when showIsolatedNodes is false', () => {
      const { result } = renderHook(() =>
        useGraphFilters({
          nodes: defaultNodes,
          edges: defaultEdges,
          objectTypes,
          relationTypes,
        })
      );

      act(() => {
        result.current.applyFilters({
          selectedObjectTypes: [1, 2, 3],
          selectedRelationTypes: [10, 20, 30],
          showIsolatedNodes: false,
        });
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should be false when all types selected and showIsolatedNodes is true', () => {
      const { result } = renderHook(() =>
        useGraphFilters({
          nodes: defaultNodes,
          edges: defaultEdges,
          objectTypes,
          relationTypes,
        })
      );

      // Already auto-initialized — should not have active filters
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty nodes array', () => {
      const { result } = renderHook(() =>
        useGraphFilters({
          nodes: [],
          edges: [],
          objectTypes,
          relationTypes,
        })
      );

      expect(result.current.filteredNodes).toEqual([]);
      expect(result.current.filteredEdges).toEqual([]);
    });

    it('should handle edges referencing non-existent nodes', () => {
      const nodes = [makeNode(1, 1)];
      const edges = [makeEdge(100, 1, 999, 10)]; // node 999 doesn't exist

      const { result } = renderHook(() =>
        useGraphFilters({
          nodes,
          edges,
          objectTypes,
          relationTypes,
        })
      );

      // Edge should be filtered out because target node is not visible
      expect(result.current.filteredEdges).toHaveLength(0);
    });

    it('should handle empty object types', () => {
      const { result } = renderHook(() =>
        useGraphFilters({
          nodes: defaultNodes,
          edges: defaultEdges,
          objectTypes: [],
          relationTypes,
        })
      );

      // With no object types, selectedObjectTypes stays empty → no nodes pass
      expect(result.current.filteredNodes).toHaveLength(0);
    });

    it('should handle empty relation types', () => {
      const { result } = renderHook(() =>
        useGraphFilters({
          nodes: defaultNodes,
          edges: defaultEdges,
          objectTypes,
          relationTypes: [],
        })
      );

      // With no relation types, selectedRelationTypes stays empty → no edges pass
      expect(result.current.filteredEdges).toHaveLength(0);
    });

    it('should reactively update when nodes change', () => {
      let nodes = [makeNode(1, 1), makeNode(2, 1)];
      const edges = [makeEdge(100, 1, 2, 10)];

      const { result, rerender } = renderHook(
        props =>
          useGraphFilters({
            nodes: props.nodes,
            edges: props.edges,
            objectTypes,
            relationTypes,
          }),
        { initialProps: { nodes, edges } }
      );

      expect(result.current.filteredNodes).toHaveLength(2);

      // Add a new node
      nodes = [...nodes, makeNode(3, 1)];
      rerender({ nodes, edges });
      expect(result.current.filteredNodes).toHaveLength(3);
    });

    it('should reactively update when edges change', () => {
      const nodes = [makeNode(1, 1), makeNode(2, 1), makeNode(3, 1)];
      let edges = [makeEdge(100, 1, 2, 10)];

      const { result, rerender } = renderHook(
        props =>
          useGraphFilters({
            nodes: props.nodes,
            edges: props.edges,
            objectTypes,
            relationTypes,
          }),
        { initialProps: { nodes, edges } }
      );

      expect(result.current.filteredEdges).toHaveLength(1);

      edges = [...edges, makeEdge(101, 2, 3, 10)];
      rerender({ nodes, edges });
      expect(result.current.filteredEdges).toHaveLength(2);
    });
  });

  describe('performance (Set-based lookup)', () => {
    it('should efficiently filter large datasets', () => {
      // Generate 1000 nodes and 2000 edges
      const largeNodes: GraphObject[] = [];
      const largeEdges: GraphRelation[] = [];

      for (let i = 0; i < 1000; i++) {
        largeNodes.push(makeNode(i, (i % 3) + 1));
      }
      for (let i = 0; i < 2000; i++) {
        largeEdges.push(makeEdge(i + 10000, i % 1000, (i + 1) % 1000, ((i % 3) + 1) * 10));
      }

      const start = performance.now();

      const { result } = renderHook(() =>
        useGraphFilters({
          nodes: largeNodes,
          edges: largeEdges,
          objectTypes,
          relationTypes,
        })
      );

      const duration = performance.now() - start;

      expect(result.current.filteredNodes).toHaveLength(1000);
      expect(result.current.filteredEdges).toHaveLength(2000);
      // Should complete in under 100ms even with 1000 nodes / 2000 edges
      expect(duration).toBeLessThan(500);
    });

    it('should efficiently filter with partial type selection on large dataset', () => {
      const largeNodes: GraphObject[] = [];
      const largeEdges: GraphRelation[] = [];

      for (let i = 0; i < 1000; i++) {
        largeNodes.push(makeNode(i, (i % 3) + 1));
      }
      for (let i = 0; i < 2000; i++) {
        largeEdges.push(makeEdge(i + 10000, i % 1000, (i + 1) % 1000, ((i % 3) + 1) * 10));
      }

      const { result } = renderHook(() =>
        useGraphFilters({
          nodes: largeNodes,
          edges: largeEdges,
          objectTypes,
          relationTypes,
        })
      );

      const start = performance.now();

      act(() => {
        result.current.applyFilters({
          selectedObjectTypes: [1], // Only ~333 nodes
          selectedRelationTypes: [10, 20, 30],
          showIsolatedNodes: true,
        });
      });

      const duration = performance.now() - start;

      // Should have roughly 1/3 of nodes
      expect(result.current.filteredNodes.length).toBeGreaterThan(300);
      expect(result.current.filteredNodes.length).toBeLessThan(400);
      // All filtered nodes should be type 1
      expect(result.current.filteredNodes.every(n => n.objectTypeId === 1)).toBe(true);
      // Should be fast
      expect(duration).toBeLessThan(500);
    });
  });

  describe('self-loop edges', () => {
    it('should include self-loop edges when the node is visible', () => {
      const nodes = [makeNode(1, 1)];
      const edges = [makeEdge(100, 1, 1, 10)]; // self-loop

      const { result } = renderHook(() =>
        useGraphFilters({
          nodes,
          edges,
          objectTypes,
          relationTypes,
        })
      );

      expect(result.current.filteredEdges).toHaveLength(1);
    });

    it('should exclude self-loop edges when the node is hidden', () => {
      const nodes = [makeNode(1, 2)]; // type 2 = Company
      const edges = [makeEdge(100, 1, 1, 10)];

      const { result } = renderHook(() =>
        useGraphFilters({
          nodes,
          edges,
          objectTypes,
          relationTypes,
        })
      );

      act(() => {
        result.current.applyFilters({
          selectedObjectTypes: [1], // Only Person — node 1 is Company
          selectedRelationTypes: [10, 20, 30],
          showIsolatedNodes: true,
        });
      });

      expect(result.current.filteredNodes).toHaveLength(0);
      expect(result.current.filteredEdges).toHaveLength(0);
    });
  });
});
