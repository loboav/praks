import React from 'react';
import { ObjectType, RelationType } from '../types/graph';

interface SidebarProps {
  objectTypes: ObjectType[];
  relationTypes: RelationType[];
  onAddObjectType: () => void;
  onAddRelationType: () => void;
  onDeleteObjectType: (id: number) => void;
  onDeleteRelationType: (id: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  objectTypes,
  relationTypes,
  onAddObjectType,
  onAddRelationType,
  onDeleteObjectType,
  onDeleteRelationType
}) => {
  return (
    <aside style={{ width: 320, background: '#f5f5f5', padding: 16, borderRight: '1px solid #e0e0e0', height: '100vh', overflowY: 'auto' }}>
      <h3 style={{ marginTop: 0 }}>Типы объектов</h3>
      <button onClick={onAddObjectType} style={{ marginBottom: 10, background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontWeight: 500, cursor: 'pointer' }}>+ Добавить тип объекта</button>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {objectTypes.map(type => (
          <li key={type.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
            <span>{type.name}</span>
            <button onClick={() => onDeleteObjectType(type.id)} style={{ background: 'none', border: 'none', color: '#e53935', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </li>
        ))}
      </ul>
      <h3 style={{ marginTop: 28 }}>Типы связей</h3>
      <button onClick={onAddRelationType} style={{ marginBottom: 10, background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontWeight: 500, cursor: 'pointer' }}>+ Добавить тип связи</button>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {relationTypes.map(type => (
          <li key={type.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
            <span>{type.name}</span>
            <button onClick={() => onDeleteRelationType(type.id)} style={{ background: 'none', border: 'none', color: '#e53935', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;
