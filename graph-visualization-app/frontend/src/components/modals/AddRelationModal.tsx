import React, { useState } from 'react';
import { RelationType, PropertySchema } from '../../types/graph';
import SchemaFields from '../SchemaFields';

interface AddRelationModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    source: number;
    target: number;
    relationTypeId: number;
    properties: Record<string, string>;
  }) => void;
  onEdit?: (data: {
    id: number;
    source: number;
    target: number;
    relationTypeId: number;
    properties: Record<string, string>;
  }) => void;
  relationTypes: (RelationType & { propertySchemas?: PropertySchema[] })[];
  sourceId: number;
  targetId: number;
  editData?: { id: number; relationTypeId: number; properties: Record<string, string> };
}

const AddRelationModal: React.FC<AddRelationModalProps> = ({
  open,
  onClose,
  onCreate,
  onEdit,
  relationTypes,
  sourceId,
  targetId,
  editData,
}) => {
  const isEdit = !!editData;
  const [relationTypeId, setRelationTypeId] = useState<number>(
    editData?.relationTypeId || relationTypes[0]?.id || 0
  );
  const [properties, setProperties] = useState<{ key: string; value: string }[]>(
    editData && editData.properties
      ? Object.entries(editData.properties).map(([key, value]) => ({ key, value }))
      : []
  );
  const [schemaValues, setSchemaValues] = useState<Record<string, string>>(() => {
    if (editData?.properties) return { ...editData.properties };
    return {};
  });

  const currentSchemas: PropertySchema[] =
    relationTypes.find(t => t.id === relationTypeId)?.propertySchemas ?? [];

  const schemaKeys = new Set(currentSchemas.map(s => s.key));

  React.useEffect(() => {
    if (open && !isEdit && relationTypes.length > 0) {
      setRelationTypeId(relationTypes[0].id);
      setProperties([]);
      setSchemaValues({});
    }
    if (open && isEdit && editData) {
      setRelationTypeId(editData.relationTypeId);
      const schemas =
        relationTypes.find(t => t.id === editData.relationTypeId)?.propertySchemas ?? [];
      setProperties(
        editData.properties
          ? Object.entries(editData.properties)
              .filter(([key]) => !schemas.some(s => s.key === key))
              .map(([key, value]) => ({ key, value }))
          : []
      );
      setSchemaValues(editData.properties ? { ...editData.properties } : {});
    }
  }, [open, isEdit, editData, relationTypes]);

  // При смене типа связи проставляем defaultValue из схемы
  React.useEffect(() => {
    if (!isEdit) {
      const schemas = relationTypes.find(t => t.id === relationTypeId)?.propertySchemas ?? [];
      const defaults: Record<string, string> = {};
      schemas.forEach(s => {
        if (s.defaultValue) defaults[s.key] = s.defaultValue;
      });
      setSchemaValues(defaults);
      setProperties(prev => prev.filter(p => !schemas.some(s => s.key === p.key)));
    }
  }, [relationTypeId, isEdit, relationTypes]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

    if (isEdit && onEdit && editData) {
      onEdit({
        id: editData.id,
        source: sourceId,
        target: targetId,
        relationTypeId,
        properties: propsObj,
      });
    } else {
      onCreate({
        source: sourceId,
        target: targetId,
        relationTypeId,
        properties: propsObj,
      });
    }
    setRelationTypeId(relationTypes[0]?.id || 0);
    setProperties([]);
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
        background: 'rgba(0,0,0,0.2)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: 24,
          borderRadius: 8,
          minWidth: 350,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <h3>{isEdit ? 'Редактировать связь' : 'Создать связь'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label>Тип связи:</label>
            <select
              value={relationTypeId}
              onChange={e => setRelationTypeId(Number(e.target.value))}
              style={{ width: '100%', marginTop: 4 }}
            >
              {relationTypes.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Предзаданные поля из схемы типа связи */}
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
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
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
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRelationModal;
