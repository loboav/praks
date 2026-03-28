import ELK from 'elkjs/lib/elk.bundled.js';
import { GraphObject, GraphRelation } from '../types/graph';

const elk = new ELK();

export interface ElkLayoutOptions {
    algorithm?: 'layered' | 'mrtree' | 'box' | 'disjoint-directed' | 'random' | 'rectpacking';
    direction?: 'DOWN' | 'UP' | 'RIGHT' | 'LEFT';
    nodeSpacing?: number;
    layerSpacing?: number;
}

/**
 * Runs ELK layout on the main thread.
 * Parameters are automatically scaled down for large graphs to avoid browser freezes.
 */
export async function elkLayout(
    nodes: GraphObject[],
    edges: GraphRelation[],
    options: ElkLayoutOptions = {}
): Promise<Array<{ id: number; x: number; y: number }>> {
    const {
        algorithm = 'layered',
        direction = 'DOWN',
        nodeSpacing = 250,
        layerSpacing = 400
    } = options;

    const n = nodes.length;

    // Build hierarchy using maps
    const rootNodes: any[] = [];
    const elkNodeMap = new Map<string, any>();

    // 1. Create all ELK nodes
    nodes.forEach(node => {
        const isContainer = (node as any)._isExpandedGroupContainer;
        const width = isContainer ? ((node as any)._expandedGroupWidth || 300) : 220;
        const height = isContainer ? ((node as any)._expandedGroupHeight || 300) : 90;

        const elkNode: any = {
            id: String(node.id),
            width,
            height,
        };

        if (isContainer) {
            elkNode.layoutOptions = {
                'elk.padding': '[top=50,left=50,bottom=50,right=50]',
            };
            elkNode.children = [];
        }

        elkNodeMap.set(String(node.id), elkNode);
    });

    // 2. Assign children to parents
    nodes.forEach(node => {
        const parentId = (node as any)._expandedGroupParentId;
        const elkNode = elkNodeMap.get(String(node.id));

        if (parentId && elkNodeMap.has(String(parentId))) {
            const parentElkNode = elkNodeMap.get(String(parentId));
            if (!parentElkNode.children) parentElkNode.children = [];
            parentElkNode.children.push(elkNode);
        } else {
            rootNodes.push(elkNode);
        }
    });

    const elkEdges = edges.map((edge, i) => ({
        id: edge.id ? `e${edge.id}` : `e${edge.source}-${edge.target}-${i}`,
        sources: [String(edge.source)],
        targets: [String(edge.target)]
    }));

    const layoutOptions: Record<string, string> = {
        'elk.algorithm': algorithm,
        'elk.direction': direction,
        'elk.spacing.nodeNode': String(nodeSpacing),
        'elk.separateConnectedComponents': 'true',
        'elk.padding': '[top=100,left=100,bottom=100,right=100]',
    };

    // Algorithm-specific options
    if (algorithm === 'layered') {
        layoutOptions['elk.layered.spacing.nodeNodeBetweenLayers'] = String(layerSpacing);
        layoutOptions['elk.layered.crossingMinimization.strategy'] = 'LAYER_SWEEP';
        layoutOptions['elk.layered.nodePlacement.strategy'] = 'BRANDES_KOEPF';
        layoutOptions['elk.edgeRouting'] = 'ORTHOGONAL';
    } else if (algorithm === 'mrtree') {
        layoutOptions['elk.mrtree.searchOrder'] = 'DFS';
        layoutOptions['elk.spacing.nodeNode'] = '200';
    } else if (algorithm === 'box') {
        layoutOptions['elk.box.spacing'] = '150';
    } else if (algorithm === 'disjoint-directed') {
        layoutOptions['elk.disjoint.spacing'] = '150';
    } else if (algorithm === 'random') {
        layoutOptions['elk.random.seed'] = '42';
    } else if (algorithm === 'rectpacking') {
        layoutOptions['elk.rectpacking.spacing'] = '100';
    }

    const graph = {
        id: 'root',
        layoutOptions,
        children: rootNodes,
        edges: elkEdges
    };

    try {
        const layoutedGraph = await elk.layout(graph);

        const positions: Array<{ id: number; x: number; y: number }> = [];

        // Recursively extract positions, calculating absolute coordinates
        const extractPositions = (elkNode: any, offsetX = 0, offsetY = 0) => {
            const absX = (elkNode.x || 0) + offsetX;
            const absY = (elkNode.y || 0) + offsetY;

            // Skip the virtual root node itself
            if (elkNode.id !== 'root') {
                positions.push({
                    id: Number(elkNode.id),
                    x: absX,
                    y: absY
                });
            }

            if (elkNode.children) {
                elkNode.children.forEach((child: any) => extractPositions(child, absX, absY));
            }
        };

        // Pass 100,100 starting offset as originally intended by the layout container
        extractPositions(layoutedGraph, 100, 100);

        return positions;
    } catch (error) {
        console.error('[elkLayout] Failed:', error);
        return fallbackGrid(nodes);
    }
}

function fallbackGrid(nodes: GraphObject[]): Array<{ id: number; x: number; y: number }> {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    return nodes.map((node, i) => ({
        id: node.id,
        x: (i % cols) * 400 + 100,
        y: Math.floor(i / cols) * 250 + 100
    }));
}
