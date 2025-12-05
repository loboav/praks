import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GraphObject, GraphRelation, RelationType } from '../types/graph';
import { useGeoNodes, GeoNode, GeoEdge } from '../hooks/useGeoNodes';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface GeoMapViewProps {
    nodes: GraphObject[];
    edges: GraphRelation[];
    relationTypes: RelationType[];
    onSelectNode: (node: GraphObject) => void;
    onSelectEdge: (edge: GraphRelation) => void;
    selectedNodes?: number[];
    selectedEdges?: number[];
}

// Create custom marker icon with node color
const createMarkerIcon = (color: string, isSelected: boolean) => {
    const size = isSelected ? 32 : 24;
    const borderWidth = isSelected ? 3 : 2;

    return L.divIcon({
        className: 'custom-marker',
        html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: ${borderWidth}px solid ${isSelected ? '#1976d2' : '#fff'};
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      "></div>
    `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
};

const GeoMapView: React.FC<GeoMapViewProps> = ({
    nodes,
    edges,
    relationTypes,
    onSelectNode,
    onSelectEdge,
    selectedNodes = [],
    selectedEdges = [],
}) => {
    const { geoNodes, geoEdges, hiddenCount } = useGeoNodes(nodes, edges);

    // Calculate map center (average of all geo-nodes, default to Belarus)
    const center = useMemo<[number, number]>(() => {
        if (geoNodes.length === 0) {
            return [53.9, 27.5667]; // Minsk, Belarus
        }
        const avgLat = geoNodes.reduce((sum, n) => sum + n.latitude, 0) / geoNodes.length;
        const avgLng = geoNodes.reduce((sum, n) => sum + n.longitude, 0) / geoNodes.length;
        return [avgLat, avgLng];
    }, [geoNodes]);

    // Calculate zoom based on spread of nodes
    const zoom = useMemo(() => {
        if (geoNodes.length <= 1) return 7;
        const lats = geoNodes.map(n => n.latitude);
        const lngs = geoNodes.map(n => n.longitude);
        const latSpread = Math.max(...lats) - Math.min(...lats);
        const lngSpread = Math.max(...lngs) - Math.min(...lngs);
        const spread = Math.max(latSpread, lngSpread);
        if (spread > 10) return 5;
        if (spread > 5) return 6;
        if (spread > 2) return 7;
        if (spread > 1) return 8;
        return 9;
    }, [geoNodes]);

    const getRelationTypeName = (relationTypeId: number) => {
        return relationTypes.find(rt => rt.id === relationTypeId)?.name || '';
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ width: '100%', height: '100%' }}
                key={`${center[0]}-${center[1]}-${zoom}`}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Draw edges as polylines */}
                {geoEdges.map((edge) => {
                    const isSelected = selectedEdges.includes(edge.id);
                    return (
                        <Polyline
                            key={edge.id}
                            positions={[
                                [edge.source.latitude, edge.source.longitude],
                                [edge.target.latitude, edge.target.longitude],
                            ]}
                            pathOptions={{
                                color: isSelected ? '#d32f2f' : edge.relation.color || '#2196f3',
                                weight: isSelected ? 5 : 3,
                                opacity: isSelected ? 1 : 0.7,
                                dashArray: isSelected ? undefined : '8, 4',
                            }}
                            eventHandlers={{
                                click: () => onSelectEdge(edge.relation),
                            }}
                        >
                            <Popup>
                                <div>
                                    <strong>{getRelationTypeName(edge.relation.relationTypeId)}</strong>
                                    <br />
                                    {edge.source.name} → {edge.target.name}
                                </div>
                            </Popup>
                        </Polyline>
                    );
                })}

                {/* Draw nodes as markers */}
                {geoNodes.map((node) => {
                    const isSelected = selectedNodes.includes(node.id);
                    return (
                        <Marker
                            key={node.id}
                            position={[node.latitude, node.longitude]}
                            icon={createMarkerIcon(node.color || '#2196f3', isSelected)}
                            eventHandlers={{
                                click: () => onSelectNode(node),
                            }}
                        >
                            <Popup>
                                <div style={{ minWidth: 150 }}>
                                    <strong style={{ fontSize: 14 }}>
                                        {node.icon && `${node.icon} `}{node.name}
                                    </strong>
                                    <hr style={{ margin: '6px 0', border: 'none', borderTop: '1px solid #eee' }} />
                                    <div style={{ fontSize: 12, color: '#666' }}>
                                        <div>📍 {node.latitude.toFixed(4)}, {node.longitude.toFixed(4)}</div>
                                        {Object.entries(node.properties)
                                            .filter(([key]) => key !== 'latitude' && key !== 'longitude')
                                            .slice(0, 3)
                                            .map(([key, value]) => (
                                                <div key={key}><strong>{key}:</strong> {value}</div>
                                            ))
                                        }
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Hidden nodes counter */}
            {hiddenCount > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 12,
                        left: 12,
                        background: 'rgba(0,0,0,0.7)',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 13,
                        zIndex: 1000,
                    }}
                >
                    🔍 Скрыто узлов без координат: {hiddenCount}
                </div>
            )}

            {/* Empty state */}
            {geoNodes.length === 0 && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'rgba(255,255,255,0.95)',
                        padding: '24px 32px',
                        borderRadius: 12,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        textAlign: 'center',
                        zIndex: 1000,
                    }}
                >
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                        Нет узлов с гео-координатами
                    </div>
                    <div style={{ fontSize: 13, color: '#666' }}>
                        Добавьте свойства <code>latitude</code> и <code>longitude</code> к узлам
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeoMapView;
