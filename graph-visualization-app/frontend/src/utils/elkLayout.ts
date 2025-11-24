import ELK from 'elkjs/lib/elk.bundled.js';
import { GraphObject, GraphRelation } from '../types/graph';

const elk = new ELK();

export interface ElkLayoutOptions {
    algorithm?: 'layered' | 'radial' | 'force' | 'mrtree' | 'box' | 'stress';
    direction?: 'DOWN' | 'UP' | 'RIGHT' | 'LEFT';
    nodeSpacing?: number;
    layerSpacing?: number;
}

export async function elkLayout(
    nodes: GraphObject[],
    edges: GraphRelation[],
    options: ElkLayoutOptions = {}
): Promise<Array<{ id: number; x: number; y: number }>> {
    const {
        algorithm = 'layered',
        direction = 'DOWN',
        nodeSpacing = 100,
        layerSpacing = 150
    } = options;

    // Convert to ELK graph format
    const elkNodes = nodes.map(node => ({
        id: String(node.id),
        width: 220, // Slightly wider to ensure no overlap
        height: 90
    }));

    const elkEdges = edges.map(edge => ({
        id: `e${edge.id}`,
        sources: [String(edge.source)],
        targets: [String(edge.target)]
    }));

    const layoutOptions: any = {
        'elk.algorithm': algorithm,
        'elk.direction': direction,
        'elk.spacing.nodeNode': String(nodeSpacing),
        // Critical for disconnected graphs (prevents "chaos")
        'elk.separateConnectedComponents': 'true',
        'elk.padding': '[top=50,left=50,bottom=50,right=50]',
    };

    // Algorithm-specific options
    if (algorithm === 'layered') {
        layoutOptions['elk.layered.spacing.nodeNodeBetweenLayers'] = String(layerSpacing);
        layoutOptions['elk.layered.crossingMinimization.strategy'] = 'LAYER_SWEEP';
        layoutOptions['elk.layered.nodePlacement.strategy'] = 'BRANDES_KOEPF'; // Better than SIMPLE
        layoutOptions['elk.edgeRouting'] = 'ORTHOGONAL'; // Clean right-angle lines
    } else if (algorithm === 'radial') {
        layoutOptions['elk.radial.radius'] = '300'; // Increased radius
        layoutOptions['elk.radial.compaction'] = 'true';
    } else if (algorithm === 'force') {
        layoutOptions['elk.force.iterations'] = '600';
        layoutOptions['elk.force.repulsion'] = '800'; // Stronger repulsion
        layoutOptions['elk.force.temperature'] = '0.1';
    } else if (algorithm === 'stress') {
        // Stress is often better than Force for general graphs
        layoutOptions['elk.stress.desiredEdgeLength'] = '200';
    }

    const graph = {
        id: 'root',
        layoutOptions,
        children: elkNodes,
        edges: elkEdges
    };

    try {
        console.log('ELK input:', graph);
        const layoutedGraph = await elk.layout(graph);
        console.log('ELK output:', layoutedGraph);

        const positions = layoutedGraph.children?.map(node => ({
            id: Number(node.id),
            x: (node.x || 0) + 100,
            y: (node.y || 0) + 100
        })) || [];

        return positions;
    } catch (error) {
        console.error('ELK layout failed:', error);
        return nodes.map((node, i) => ({
            id: node.id,
            x: (i % 5) * 250 + 100,
            y: Math.floor(i / 5) * 150 + 100
        }));
    }
}
