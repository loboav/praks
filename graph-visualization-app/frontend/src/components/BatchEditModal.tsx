import React, { useState } from 'react';

interface BatchEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (fields: { objectTypeId?: number; properties?: Record<string, string>; color?: string; icon?: string }) => void;
}


const iconList = [
  '',
  '⭐',
  '💡',
  '📦',
  '🖥️',
  '📁',
  '⚙️',
  '🔒',
  '🔑',
  '📄',
  '🧩',
  '🗂️',
  '🧑',
  '🏢',
  '🌐',
];

const BatchEditModal: React.FC<BatchEditModalProps> = ({ open, onClose, onSave }) => {
  const [objectTypeId, setObjectTypeId] = useState('');
  const [properties, setProperties] = useState<Record<string, string>>({});
  const [color, setColor] = useState<string>('');
  const [icon, setIcon] = useState<string>('');

  if (!open) return null;

  return (
    <div className="modal" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.18)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', padding: 28, borderRadius: 12, minWidth: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', fontFamily: 'Segoe UI' }}>
        <h3>Массовое редактирование</h3>
        <input
          type="number"
          placeholder="ID типа объекта (оставьте пустым, чтобы не менять)"
          value={objectTypeId}
          onChange={e => setObjectTypeId(e.target.value)}
          style={{ marginBottom: 12, width: '100%' }}
        />
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 14 }}>Цвет объекта:</label><br />
            <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 40, height: 32, border: 'none', background: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 14 }}>Иконка:</label><br />
            <select value={icon} onChange={e => setIcon(e.target.value)} style={{ fontSize: 20, height: 32 }}>
              {iconList.map(i => <option key={i} value={i}>{i || '—'}</option>)}
            </select>
          </div>
        </div>
        {/* UI для свойств */}
        <textarea
          placeholder="Свойства (JSON)"
          value={JSON.stringify(properties)}
          onChange={e => {
            try {
              setProperties(JSON.parse(e.target.value));
            } catch {}
          }}
          style={{ width: '100%', minHeight: 60, marginBottom: 12 }}
        />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 6, padding: '7px 18px', fontWeight: 500, fontSize: 16, cursor: 'pointer' }}>Отмена</button>
          <button
            onClick={() => onSave({
              ...(objectTypeId ? { objectTypeId: Number(objectTypeId) } : {}),
              ...(Object.keys(properties).length ? { properties } : {}),
              ...(color ? { color } : {}),
              ...(icon ? { icon } : {})
            })}
            style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontWeight: 500, fontSize: 16, cursor: 'pointer' }}
          >Сохранить</button>
        </div>
      </div>
    </div>
  );
};

export default BatchEditModal;
