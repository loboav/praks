import React, { useState } from 'react';
import { ObjectType } from '../../types/graph';

interface AddObjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; objectTypeId: number; properties: Record<string, string> }) => void;
  objectTypes: ObjectType[];
}

const AddObjectModal: React.FC<AddObjectModalProps> = ({ open, onClose, onCreate, objectTypes }) => {
  const [name, setName] = useState('');
  const [objectTypeId, setObjectTypeId] = useState<number>(objectTypes[0]?.id || 0);
  const [properties, setProperties] = useState<{ key: string; value: string }[]>([]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.25)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', padding: 32, borderRadius: 12, minWidth: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', fontFamily: 'Segoe UI', animation: 'fadeIn .18s' }}>
        <h2 style={{ marginTop: 0, marginBottom: 18, fontWeight: 600, fontSize: 22 }}>Добавить объект</h2>
        <form onSubmit={e => {
          e.preventDefault();
          onCreate({
            name,
            objectTypeId,
            properties: Object.fromEntries(properties.map(p => [p.key, p.value]))
          });
          setName('');
          setObjectTypeId(objectTypes[0]?.id || 0);
          setProperties([]);
          onClose();
        }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontWeight: 500 }}>Тип объекта:</label>
            <select value={objectTypeId} onChange={e => setObjectTypeId(Number(e.target.value))} style={{ marginLeft: 8, padding: 4, borderRadius: 6, border: '1px solid #bbb' }}>
              {objectTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontWeight: 500 }}>Имя:</label>
            <input value={name} onChange={e => setName(e.target.value)} required style={{ marginLeft: 8, padding: 4, borderRadius: 6, border: '1px solid #bbb', width: 220 }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontWeight: 500 }}>Свойства:</label>
            <div style={{ marginTop: 6 }}>
              {properties.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                  <input placeholder="Ключ" value={p.key} onChange={e => setProperties(props => props.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} style={{ padding: 4, borderRadius: 6, border: '1px solid #bbb', width: 100 }} />
                  <input placeholder="Значение" value={p.value} onChange={e => setProperties(props => props.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} style={{ padding: 4, borderRadius: 6, border: '1px solid #bbb', width: 120 }} />
                  <button type="button" onClick={() => setProperties(props => props.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#f44336', fontSize: 18, cursor: 'pointer' }} title="Удалить">×</button>
                </div>
              ))}
              <button type="button" onClick={() => setProperties(props => [...props, { key: '', value: '' }])} style={{ marginTop: 4, background: '#f5f5f5', border: '1px solid #bbb', borderRadius: 6, padding: '2px 10px', cursor: 'pointer', fontSize: 15 }}>+ Добавить свойство</button>
            </div>
          </div>
          <div style={{ marginTop: 18, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="submit" style={{ background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontWeight: 500, fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 8px rgba(76,175,80,0.08)' }}>Создать</button>
            <button type="button" onClick={onClose} style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 6, padding: '7px 18px', fontWeight: 500, fontSize: 16, cursor: 'pointer' }}>Отмена</button>
          </div>
        </form>
        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        `}</style>
      </div>
    </div>
  );
};

export default AddObjectModal;
