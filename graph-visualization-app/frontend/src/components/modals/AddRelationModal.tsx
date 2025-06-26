import React, { useState } from 'react';
import { RelationType } from '../../types/graph';

interface AddRelationModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { source: number; target: number; relationTypeId: number; properties: Record<string, string> }) => void;
  relationTypes: RelationType[];
  sourceId: number;
  targetId: number;
}

const AddRelationModal: React.FC<AddRelationModalProps> = ({ open, onClose, onCreate, relationTypes, sourceId, targetId }) => {
  const [relationTypeId, setRelationTypeId] = useState<number>(relationTypes[0]?.id || 0);
  const [properties, setProperties] = useState<{ key: string; value: string }[]>([]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.2)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 350 }}>
        <h3>Создать связь</h3>
        <form onSubmit={e => {
          e.preventDefault();
          onCreate({
            source: sourceId,
            target: targetId,
            relationTypeId,
            properties: Object.fromEntries(properties.map(p => [p.key, p.value]))
          });
          setRelationTypeId(relationTypes[0]?.id || 0);
          setProperties([]);
          onClose();
        }}>
          <div>
            <label>Тип связи:</label>
            <select value={relationTypeId} onChange={e => setRelationTypeId(Number(e.target.value))}>
              {relationTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label>Свойства:</label>
            {properties.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                <input placeholder="Ключ" value={p.key} onChange={e => setProperties(props => props.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} />
                <input placeholder="Значение" value={p.value} onChange={e => setProperties(props => props.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
                <button type="button" onClick={() => setProperties(props => props.filter((_, j) => j !== i))}>-</button>
              </div>
            ))}
            <button type="button" onClick={() => setProperties(props => [...props, { key: '', value: '' }])}>Добавить свойство</button>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button type="submit">Создать</button>
            <button type="button" onClick={onClose}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRelationModal;
