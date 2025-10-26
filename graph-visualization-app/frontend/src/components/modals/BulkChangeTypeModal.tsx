import React, { useState } from 'react';
import { ObjectType } from '../../types/graph';

interface BulkChangeTypeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newTypeId: number) => void;
  objectTypes: ObjectType[];
  selectedCount: number;
}

export default function BulkChangeTypeModal({
  open,
  onClose,
  onConfirm,
  objectTypes,
  selectedCount,
}: BulkChangeTypeModalProps) {
  const [selectedTypeId, setSelectedTypeId] = useState<number>(objectTypes[0]?.id || 0);

  if (!open) return null;

  const handleConfirm = () => {
    if (selectedTypeId) {
      onConfirm(selectedTypeId);
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600 }}>
          Изменить тип объектов
        </h2>

        <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '14px' }}>
          Будет изменён тип для <strong>{selectedCount}</strong> объект(ов)
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>
            Новый тип объекта:
          </label>
          <select
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '14px',
            }}
          >
            {objectTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              color: '#666',
            }}
          >
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            style={{
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
