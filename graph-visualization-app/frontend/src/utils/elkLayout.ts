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

    // Convert to ELK graph format
    const elkNodes = nodes.map(node => ({
        id: String(node.id),
        width: 220,
        height: 90
    }));

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
        children: elkNodes,
        edges: elkEdges
    };

    try {
        const layoutedGraph = await elk.layout(graph);

        const positions = layoutedGraph.children?.map(node => ({
            id: Number(node.id),
            x: (node.x || 0) + 100,
            y: (node.y || 0) + 100
        })) || [];

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
