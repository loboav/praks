import React, { useState } from 'react';
import { PropertySchema } from '../../types/graph';
import SchemaFields from '../SchemaFields';

interface AddObjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    objectTypeId: number;
    properties: Record<string, string>;
    color?: string;
    icon?: string;
  }) => void;
  onEdit?: (data: {
    id: number;
    name: string;
    objectTypeId: number;
    properties: Record<string, string>;
    color?: string;
    icon?: string;
  }) => void;
  objectTypes: {
    id: number;
    name: string;
    description?: string;
    propertySchemas?: PropertySchema[];
  }[];
  editData?: {
    id: number;
    name: string;
    objectTypeId: number;
    properties: Record<string, string>;
    color?: string;
    icon?: string;
  };
}

const AddObjectModal: React.FC<AddObjectModalProps> = ({
  open,
  onClose,
  onCreate,
  onEdit,
  objectTypes,
  editData,
}) => {
  const isEdit = !!editData;
  const [name, setName] = useState(editData?.name || '');
  const [objectTypeId, setObjectTypeId] = useState<number>(
    editData?.objectTypeId || objectTypes[0]?.id || 0
  );
  const [properties, setProperties] = useState<{ key: string; value: string }[]>(
    editData && editData.properties
      ? Object.entries(editData.properties).map(([key, value]) => ({ key, value }))
      : []
  );
  const [color, setColor] = useState<string>(editData?.color || '#000000');
  const [icon, setIcon] = useState<string>(editData?.icon || '');

  // Значения для предзаданных полей из схемы (хранятся отдельно, мержатся при сабмите)
  const [schemaValues, setSchemaValues] = useState<Record<string, string>>(() => {
    if (editData?.properties) return { ...editData.properties };
    return {};
  });

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

  const currentSchemas: PropertySchema[] =
    objectTypes.find(t => t.id === objectTypeId)?.propertySchemas ?? [];

  // Ключи, занятые схемой — не показываем их в кастомных свойствах
  const schemaKeys = new Set(currentSchemas.map(s => s.key));

  React.useEffect(() => {
    if (open && objectTypes.length > 0 && !isEdit) {
      setObjectTypeId(objectTypes[0].id);
      setName('');
      setProperties([]);
      setColor('#000000');
      setIcon('');
      setSchemaValues({});
    }
    if (open && isEdit && editData) {
      setName(editData.name);
      setObjectTypeId(editData.objectTypeId);
      setProperties(
        editData.properties
          ? Object.entries(editData.properties)
              .filter(([key]) => {
                const schemas =
                  objectTypes.find(t => t.id === editData.objectTypeId)?.propertySchemas ?? [];
                return !schemas.some(s => s.key === key);
              })
              .map(([key, value]) => ({ key, value }))
          : []
      );
      setColor(editData.color || '#000000');
      setIcon(editData.icon || '');
      setSchemaValues(editData.properties ? { ...editData.properties } : {});
    }
  }, [open, objectTypes, isEdit, editData]);

  // При смене типа объекта проставляем defaultValue из схемы
  React.useEffect(() => {
    if (!isEdit) {
      const schemas = objectTypes.find(t => t.id === objectTypeId)?.propertySchemas ?? [];
      const defaults: Record<string, string> = {};
      schemas.forEach(s => {
        if (s.defaultValue) defaults[s.key] = s.defaultValue;
      });
      setSchemaValues(defaults);
      // Убираем из кастомных свойств ключи, которые теперь в схеме
      setProperties(prev => prev.filter(p => !schemas.some(s => s.key === p.key)));
    }
  }, [objectTypeId, isEdit, objectTypes]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Мержим: сначала значения из схемы, потом кастомные
    const propsObj: Record<string, string> = {};
    currentSchemas.forEach(s => {
      const val = schemaValues[s.key];
      if (val !== undefined && val !== '') {
        propsObj[s.key] = val;
      }
    });
    properties.forEach(p => {
      if (p.key && !schemaKeys.has(p.key)) propsObj[p.key] = p.value;
    });

    const extra: any = {};
    if (color && color.trim() !== '' && color !== '#000000') extra.color = color;
    if (icon && icon.trim() !== '') extra.icon = icon;

    if (isEdit && onEdit && editData) {
      onEdit({ id: editData.id, name, objectTypeId, properties: propsObj, ...extra });
    } else {
      onCreate({ name, objectTypeId, properties: propsObj, ...extra });
    }
    setName('');
    setObjectTypeId(objectTypes[0]?.id || 0);
    setProperties([]);
    setColor('#000000');
    setIcon('');
    setSchemaValues({});
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
          minWidth: 340,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          fontFamily: 'Segoe UI',
          animation: 'fadeIn .18s',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 18, fontWeight: 600, fontSize: 20 }}>
          {isEdit ? 'Редактировать объект' : 'Добавить объект'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label>Название объекта:</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label>Тип объекта:</label>
            <select
              value={objectTypeId}
              onChange={e => setObjectTypeId(Number(e.target.value))}
              style={{ width: '100%', marginTop: 4 }}
            >
              {objectTypes.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            <div>
              <label style={{ fontSize: 14 }}>Цвет объекта (опционально):</label>
              <br />
              <input
                type="color"
                value={color || '#000000'}
                onChange={e => setColor(e.target.value)}
                style={{ width: 40, height: 32, border: 'none', background: 'none' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 14 }}>Иконка (опционально):</label>
              <br />
              <select
                value={icon || ''}
                onChange={e => setIcon(e.target.value)}
                style={{ fontSize: 20, height: 32 }}
              >
                {iconList.map(i => (
                  <option key={i} value={i}>
                    {i || '—'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Предзаданные поля из схемы типа */}
          <SchemaFields
            schemas={currentSchemas}
            values={schemaValues}
            onChange={(key, value) => setSchemaValues(prev => ({ ...prev, [key]: value }))}
          />

          {/* Кастомные свойства */}
          <div style={{ marginBottom: 18 }}>
            <label>Дополнительные свойства:</label>
            {properties.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <input
                  placeholder="Ключ"
                  value={p.key}
                  onChange={e =>
                    setProperties(props =>
                      props.map((item, idx) =>
                        idx === i ? { ...item, key: e.target.value } : item
                      )
                    )
                  }
                />
                <input
                  placeholder="Значение"
                  value={p.value}
                  onChange={e =>
                    setProperties(props =>
                      props.map((item, idx) =>
                        idx === i ? { ...item, value: e.target.value } : item
                      )
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() => setProperties(props => props.filter((_, idx) => idx !== i))}
                  style={{
                    background: '#eee',
                    border: 'none',
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontWeight: 500,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setProperties(props => [...props, { key: '', value: '' }])}
              style={{
                marginTop: 6,
                background: '#2196f3',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '4px 12px',
                fontWeight: 500,
              }}
            >
              Добавить свойство
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
              }}
            >
              {isEdit ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddObjectModal;
