import React, { useState } from 'react';

interface AddObjectTypeModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description?: string }) => void;
}

const AddObjectTypeModal: React.FC<AddObjectTypeModalProps> = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.25)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', padding: 32, borderRadius: 12, minWidth: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', fontFamily: 'Segoe UI', animation: 'fadeIn .18s' }}>
        <h2 style={{ marginTop: 0, marginBottom: 18, fontWeight: 600, fontSize: 20 }}>Добавить тип объекта</h2>
        <form onSubmit={e => {
          e.preventDefault();
          onCreate({ name, description });
          setName('');
          setDescription('');
          onClose();
        }}>
          <div style={{ marginBottom: 14 }}>
            <label>Название типа:</label>
            <input required value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', marginTop: 4 }} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label>Описание:</label>
            <input value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', marginTop: 4 }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ background: '#eee', border: 'none', borderRadius: 6, padding: '7px 18px', fontWeight: 500 }}>Отмена</button>
            <button type="submit" style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontWeight: 500 }}>Создать</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddObjectTypeModal;
