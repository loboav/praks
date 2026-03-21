import React, { useMemo } from 'react';
import { GraphObject } from '../types/graph';
import { computeSelectedNodesStats } from '../utils/propertyAggregations';

interface AggregatedPropertiesCardProps {
  nodes: GraphObject[];
  onClose?: () => void;
}

const AggregatedPropertiesCard: React.FC<AggregatedPropertiesCardProps> = ({ nodes, onClose }) => {
  const stats = useMemo(() => computeSelectedNodesStats(nodes), [nodes]);

  if (nodes.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', top: 80, right: 16, background: '#fff',
      padding: '16px', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 998, width: 320, maxHeight: '80vh', overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#333' }}>Сводка ({nodes.length} узлов)</h3>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#999' }}>
            ✕
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {stats.length === 0 ? (
          <div style={{ color: '#777', fontSize: 13 }}>Нет общих свойств</div>
        ) : (
          stats.map(stat => (
            <div key={stat.property} style={{ background: '#f8f9fa', padding: 10, borderRadius: 6, border: '1px solid #eee' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#444' }}>
                {stat.property} <span style={{ fontWeight: 'normal', color: '#888', fontSize: 11 }}>({stat.count} знач.)</span>
              </div>
              
              {stat.type === 'number' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12, color: '#555' }}>
                  <div><b>Sum:</b> {stat.sum?.toLocaleString()}</div>
                  <div><b>Avg:</b> {stat.avg?.toLocaleString()}</div>
                  <div><b>Min:</b> {stat.min?.toLocaleString()}</div>
                  <div><b>Max:</b> {stat.max?.toLocaleString()}</div>
                </div>
              )}

              {stat.type === 'date' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4, fontSize: 12, color: '#555' }}>
                  <div><b>First:</b> {stat.firstDate}</div>
                  <div><b>Last:</b> {stat.lastDate}</div>
                </div>
              )}
              
              {stat.type === 'string' && (
                <div style={{ fontSize: 12, color: '#777' }}>Текстовые значения</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AggregatedPropertiesCard;
