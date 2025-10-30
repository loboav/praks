import React from 'react';
import { GraphObject } from '../types/graph';

interface ObjectCardProps {
  object: GraphObject;
}

const ObjectCard: React.FC<ObjectCardProps> = ({ object }) => (
  <div style={{ position: 'absolute', top: 80, right: 16, background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 998 }}>
    <b>Объект:</b> {object.name}
    <ul>
      {Object.entries(object.properties || {}).map(([k, v]) => <li key={k}>{k}: {String(v)}</li>)}
    </ul>
  </div>
);

export default ObjectCard;
