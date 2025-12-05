import { useMemo } from 'react';
import { GraphObject, GraphRelation } from '../types/graph';

export interface GeoNode extends GraphObject {
    latitude: number;
    longitude: number;
}

export interface GeoEdge {
    id: number;
    source: GeoNode;
    target: GeoNode;
    relation: GraphRelation;
}

/**
 * Filters nodes that have valid latitude and longitude properties.
 * Also returns edges where both source and target have geo-coordinates.
 */
export function useGeoNodes(nodes: GraphObject[], edges: GraphRelation[]) {
    const geoNodes = useMemo<GeoNode[]>(() => {
        return nodes
            .filter(node => {
                const lat = parseFloat(node.properties?.latitude);
                const lng = parseFloat(node.properties?.longitude);
                return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
            })
            .map(node => ({
                ...node,
                latitude: parseFloat(node.properties.latitude),
                longitude: parseFloat(node.properties.longitude),
            }));
    }, [nodes]);

    const geoNodeIds = useMemo(() => new Set(geoNodes.map(n => n.id)), [geoNodes]);

    const geoEdges = useMemo<GeoEdge[]>(() => {
        return edges
            .filter(edge => geoNodeIds.has(edge.source) && geoNodeIds.has(edge.target))
            .map(edge => ({
                id: edge.id,
                source: geoNodes.find(n => n.id === edge.source)!,
                target: geoNodes.find(n => n.id === edge.target)!,
                relation: edge,
            }));
    }, [edges, geoNodes, geoNodeIds]);

    const hiddenCount = nodes.length - geoNodes.length;

    return { geoNodes, geoEdges, hiddenCount };
}
