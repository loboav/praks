import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodeGrouping } from '../hooks/useNodeGrouping';
import { GraphObject, GraphRelation, ObjectType } from '../types/graph';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test data
const objectTypes: ObjectType[] = [
    { id: 1, name: 'Person' },
    { id: 2, name: 'Company' },
];

const createNodes = (): GraphObject[] => [
    { id: 1, name: 'Alice', objectTypeId: 1, properties: { city: 'Moscow' } },
    { id: 2, name: 'Bob', objectTypeId: 1, properties: { city: 'Moscow' } },
    { id: 3, name: 'Charlie', objectTypeId: 1, properties: { city: 'London' } },
    { id: 4, name: 'Dave', objectTypeId: 1, properties: { city: 'London' } },
    { id: 5, name: 'Eve', objectTypeId: 2, properties: { city: 'Moscow' } },
];

const createEdges = (): GraphRelation[] => [
    { id: 1, source: 1, target: 2, relationTypeId: 1, properties: {} },
    { id: 2, source: 1, target: 3, relationTypeId: 1, properties: {} },
    { id: 3, source: 2, target: 3, relationTypeId: 1, properties: {} },
    { id: 4, source: 3, target: 4, relationTypeId: 1, properties: {} },
    { id: 5, source: 4, target: 5, relationTypeId: 1, properties: {} },
];

describe('useNodeGrouping', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    // --- Rule CRUD ---

    it('should create a grouping rule', () => {
        const { result } = renderHook(() =>
            useNodeGrouping({ nodes: createNodes(), edges: createEdges(), objectTypes })
        );

        act(() => {
            result.current.createRule('By City', 'city', [1]);
        });

        expect(result.current.rules).toHaveLength(1);
        expect(result.current.rules[0].title).toBe('By City');
        expect(result.current.rules[0].propertyKey).toBe('city');
        expect(result.current.rules[0].categoryIds).toEqual([1]);
    });

    it('should delete a grouping rule', () => {
        const { result } = renderHook(() =>
            useNodeGrouping({ nodes: createNodes(), edges: createEdges(), objectTypes })
        );

        act(() => {
            result.current.createRule('By City', 'city', [1]);
        });

        const ruleId = result.current.rules[0].id;

        act(() => {
            result.current.deleteRule(ruleId);
        });

        expect(result.current.rules).toHaveLength(0);
    });

    it('should activate/deactivate a rule via toggle', () => {
        const { result } = renderHook(() =>
            useNodeGrouping({ nodes: createNodes(), edges: createEdges(), objectTypes })
        );

        act(() => {
            result.current.createRule('By City', 'city', [1]);
        });

        const ruleId = result.current.rules[0].id;

        // Activate
        act(() => {
            result.current.toggleRule(ruleId);
        });
        expect(result.current.activeRule?.id).toBe(ruleId);

        // Deactivate
        act(() => {
            result.current.toggleRule(ruleId);
        });
        expect(result.current.activeRule).toBeNull();
    });

    it('should allow only one active rule at a time', () => {
        const { result } = renderHook(() =>
            useNodeGrouping({ nodes: createNodes(), edges: createEdges(), objectTypes })
        );

        act(() => {
            result.current.createRule('By City', 'city', [1]);
        });

        const rule1Id = result.current.rules[0].id;

        // Separate act() to ensure different Date.now() IDs
        act(() => {
            result.current.createRule('By Name', 'name', [1]);
        });

        const rule2Id = result.current.rules[1].id;
        expect(rule1Id).not.toBe(rule2Id);

        act(() => {
            result.current.toggleRule(rule1Id);
        });
        expect(result.current.activeRule?.id).toBe(rule1Id);

        act(() => {
            result.current.toggleRule(rule2Id);
        });
        expect(result.current.activeRule?.id).toBe(rule2Id);
        expect(result.current.rules.find(r => r.id === rule1Id)?.isActive).toBe(false);
    });

    // --- Collapse/expand ---

    it('should have groups collapsed by default when rule is active', () => {
        const nodes = createNodes();
        const edges = createEdges();
        const { result } = renderHook(() =>
            useNodeGrouping({ nodes, edges, objectTypes })
        );

        act(() => {
            result.current.createRule('By City', 'city', [1]);
        });

        act(() => {
            result.current.toggleRule(result.current.rules[0].id);
        });

        // Nodes in groups should be replaced by meta-nodes (collapsed by default)
        const metaNodes = result.current.transformedNodes.filter(n => n.isCollapsedGroup);
        expect(metaNodes.length).toBeGreaterThan(0);

        // Original grouped nodes should be hidden
        const visibleNodeIds = new Set(result.current.transformedNodes.map(n => n.id));
        // Alice and Bob are in Moscow group (Person type), should be hidden
        expect(visibleNodeIds.has(1)).toBe(false);
        expect(visibleNodeIds.has(2)).toBe(false);
    });

    it('should toggle collapse/expand correctly', () => {
        const nodes = createNodes();
        const edges = createEdges();
        const { result } = renderHook(() =>
            useNodeGrouping({ nodes, edges, objectTypes })
        );

        act(() => {
            result.current.createRule('By City', 'city', [1]);
        });

        act(() => {
            result.current.toggleRule(result.current.rules[0].id);
        });

        // Get a group ID from a meta-node
        const metaNode = result.current.transformedNodes.find(n => n.isCollapsedGroup);
        expect(metaNode).toBeDefined();
        const groupId = metaNode!._collapsedGroupId!;

        // Expand the group
        act(() => {
            result.current.toggleGroupCollapse(groupId);
        });

        // After expanding, the original nodes should appear
        const expandedNodes = result.current.transformedNodes;
        const metaNodesAfterExpand = expandedNodes.filter(
            n => n.isCollapsedGroup && n._collapsedGroupId === groupId
        );
        expect(metaNodesAfterExpand).toHaveLength(0);

        // Collapse again
        act(() => {
            result.current.toggleGroupCollapse(groupId);
        });

        const metaNodesAfterCollapse = result.current.transformedNodes.filter(
            n => n.isCollapsedGroup && n._collapsedGroupId === groupId
        );
        expect(metaNodesAfterCollapse).toHaveLength(1);
    });

    it('should collapse all groups', () => {
        const nodes = createNodes();
        const edges = createEdges();
        const { result } = renderHook(() =>
            useNodeGrouping({ nodes, edges, objectTypes })
        );

        act(() => {
            result.current.createRule('By City', 'city', [1]);
        });

        act(() => {
            result.current.toggleRule(result.current.rules[0].id);
        });

        // Expand all first
        act(() => {
            result.current.expandAllGroups();
        });

        // Then collapse all
        act(() => {
            result.current.collapseAllGroups();
        });

        const metaNodes = result.current.transformedNodes.filter(n => n.isCollapsedGroup);
        expect(metaNodes.length).toBeGreaterThan(0);
    });

    it('should expand all groups', () => {
        const nodes = createNodes();
        const edges = createEdges();
        const { result } = renderHook(() =>
            useNodeGrouping({ nodes, edges, objectTypes })
        );

        act(() => {
            result.current.createRule('By City', 'city', [1]);
        });

        act(() => {
            result.current.toggleRule(result.current.rules[0].id);
        });

        act(() => {
            result.current.expandAllGroups();
        });

        // No meta-nodes should remain
        const metaNodes = result.current.transformedNodes.filter(n => n.isCollapsedGroup);
        expect(metaNodes).toHaveLength(0);
    });

    // --- Meta-node ID stability ---

    it('should generate stable meta-node IDs across re-renders', () => {
        const nodes = createNodes();
        const edges = createEdges();
        const { result, rerender } = renderHook(() =>
            useNodeGrouping({ nodes, edges, objectTypes })
        );

        act(() => {
            result.current.createRule('By City', 'city', [1]);
        });

        act(() => {
            result.current.toggleRule(result.current.rules[0].id);
        });

        const metaIds1 = result.current.transformedNodes
            .filter(n => n.isCollapsedGroup)
            .map(n => n.id)
            .sort();

        // Force re-render
        rerender();

        const metaIds2 = result.current.transformedNodes
            .filter(n => n.isCollapsedGroup)
            .map(n => n.id)
            .sort();

        expect(metaIds1).toEqual(metaIds2);
    });

    it('should have negative meta-node IDs', () => {
        const nodes = createNodes();
        const edges = createEdges();
        const { result } = renderHook(() =>
            useNodeGrouping({ nodes, edges, objectTypes })
        );

        act(() => {
            result.current.createRule('By City', 'city', [1]);
        });

        act(() => {
            result.current.toggleRule(result.current.rules[0].id);
        });

        const metaNodes = result.current.transformedNodes.filter(n => n.isCollapsedGroup);
        metaNodes.forEach(metaNode => {
            expect(metaNode.id).toBeLessThan(0);
        });
    });

    // --- Edge transformation ---

    it('should hide edges inside a collapsed group', () => {
        const nodes = createNodes();
        const edges = createEdges();
        const { result } = renderHook(() =>
            useNodeGrouping({ nodes, edges, objectTypes })
        );

        act(() => {
            result.current.createRule('By City', 'city', [1]);
        });

        act(() => {
            result.current.toggleRule(result.current.rules[0].id);
        });

        // Edge between Alice (Moscow) and Bob (Moscow) should be hidden
        const transformedEdge = result.current.transformedEdges.find(
            e => e.source === 1 && e.target === 2
        );
        expect(transformedEdge).toBeUndefined();
    });

    it('should redirect edges to meta-nodes when group is collapsed', () => {
        const nodes = createNodes();
        const edges = createEdges();
        const { result } = renderHook(() =>
            useNodeGrouping({ nodes, edges, objectTypes })
        );

        act(() => {
            result.current.createRule('By City', 'city', [1]);
        });

        act(() => {
            result.current.toggleRule(result.current.rules[0].id);
        });

        // All edges should reference either meta-nodes (negative IDs) or non-grouped nodes
        const metaNodeIds = new Set(
            result.current.transformedNodes
                .filter(n => n.isCollapsedGroup)
                .map(n => n.id)
        );
        const visibleNodeIds = new Set(result.current.transformedNodes.map(n => n.id));

        result.current.transformedEdges.forEach(edge => {
            expect(visibleNodeIds.has(edge.source)).toBe(true);
            expect(visibleNodeIds.has(edge.target)).toBe(true);
        });
    });

    // --- Without active rule ---

    it('should return original nodes/edges when no rule is active', () => {
        const nodes = createNodes();
        const edges = createEdges();
        const { result } = renderHook(() =>
            useNodeGrouping({ nodes, edges, objectTypes })
        );

        expect(result.current.transformedNodes).toEqual(nodes);
        expect(result.current.transformedEdges).toEqual(edges);
    });
});
