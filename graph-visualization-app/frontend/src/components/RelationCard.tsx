import React from 'react';
import { GraphRelation } from '../types/graph';

interface RelationCardProps {
  relation: GraphRelation;
  onEdit?: () => void;
  onDelete?: () => void;
}

const RelationCard: React.FC<RelationCardProps> = ({ relation, onEdit, onDelete }) => (
  <div style={{ position: 'absolute', top: 60, right: 16, background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
    <b>Связь:</b> #{relation.id}
    <ul>
      {Object.entries(relation.properties || {}).map(([k, v]) => <li key={k}>{k}: {String(v)}</li>)}
    </ul>
    {(onEdit || onDelete) && (
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        {onEdit && <button onClick={onEdit} style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>Редактировать</button>}
        {onDelete && <button onClick={onDelete} style={{ background: '#f44336', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>Удалить</button>}
      </div>
    )}
  </div>
);

export default RelationCard;
