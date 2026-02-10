import React, { useState } from 'react';

interface SchemaEntry {
  key: string;
  propertyType: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  required: boolean;
  defaultValue: string;
  options: string; // comma-separated для enum
}

export interface AddObjectTypeModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description?: string; schemas?: SchemaEntry[] }) => void;
}

const PROPERTY_TYPES = [
  { value: 'string', label: 'Строка' },
  { value: 'number', label: 'Число' },
  { value: 'date', label: 'Дата' },
  { value: 'boolean', label: 'Да/Нет' },
  { value: 'enum', label: 'Список' },
] as const;

const emptySchema = (): SchemaEntry => ({
  key: '',
  propertyType: 'string',
  required: false,
  defaultValue: '',
  options: '',
});

const AddObjectTypeModal: React.FC<AddObjectTypeModalProps> = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [schemas, setSchemas] = useState<SchemaEntry[]>([]);

  if (!open) return null;

  const updateSchema = (idx: number, patch: Partial<SchemaEntry>) => {
    setSchemas(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validSchemas = schemas.filter(s => s.key.trim() !== '');
    onCreate({
      name,
      description,
      schemas: validSchemas.length > 0 ? validSchemas : undefined,
    });
    setName('');
    setDescription('');
    setSchemas([]);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.25)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: 32,
          borderRadius: 12,
          minWidth: 420,
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          fontFamily: 'Segoe UI',
          animation: 'fadeIn .18s',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 18, fontWeight: 600, fontSize: 20 }}>
          Добавить тип объекта
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label>Название типа:</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label>Описание:</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>

          {/* Схема свойств */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8 }}>
              Схема свойств{' '}
              <span style={{ fontWeight: 400, color: '#888', fontSize: 12 }}>
                (предзаданные поля)
              </span>
            </label>

            {schemas.map((s, i) => (
              <div
                key={i}
                style={{
                  background: '#f9f9f9',
                  border: '1px solid #eee',
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <input
                    placeholder="Ключ (напр. weight)"
                    value={s.key}
                    onChange={e => updateSchema(i, { key: e.target.value })}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '1px solid #ddd',
                    }}
                  />
                  <select
                    value={s.propertyType}
                    onChange={e =>
                      updateSchema(i, {
                        propertyType: e.target.value as SchemaEntry['propertyType'],
                      })
                    }
                    style={{ padding: '4px 6px', borderRadius: 4, border: '1px solid #ddd' }}
                  >
                    {PROPERTY_TYPES.map(pt => (
                      <option key={pt.value} value={pt.value}>
                        {pt.label}
                      </option>
                    ))}
                  </select>
                  <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <input
                      type="checkbox"
                      checked={s.required}
                      onChange={e => updateSchema(i, { required: e.target.checked })}
                    />
                    Обяз.
                  </label>
                  <button
                    type="button"
                    onClick={() => setSchemas(prev => prev.filter((_, idx) => idx !== i))}
                    style={{
                      background: '#eee',
                      border: 'none',
                      borderRadius: 6,
                      padding: '2px 8px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  {s.propertyType === 'enum' ? (
                    <input
                      placeholder="Варианты через запятую"
                      value={s.options}
                      onChange={e => updateSchema(i, { options: e.target.value })}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: '1px solid #ddd',
                        fontSize: 12,
                      }}
                    />
                  ) : (
                    <input
                      placeholder="Значение по умолчанию"
                      value={s.defaultValue}
                      onChange={e => updateSchema(i, { defaultValue: e.target.value })}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: '1px solid #ddd',
                        fontSize: 12,
                      }}
                    />
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setSchemas(prev => [...prev, emptySchema()])}
              style={{
                marginTop: 4,
                background: '#e3f2fd',
                color: '#1565c0',
                border: 'none',
                borderRadius: 6,
                padding: '5px 14px',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              + Добавить поле
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#eee',
                border: 'none',
                borderRadius: 6,
                padding: '7px 18px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Отмена
            </button>
            <button
              type="submit"
              style={{
                background: '#2196f3',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '7px 18px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddObjectTypeModal;
