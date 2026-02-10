import React from 'react';
import { PropertySchema } from '../types/graph';

interface SchemaFieldsProps {
  schemas: PropertySchema[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 14,
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: '#444',
  marginBottom: 2,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

const tagStyle: React.CSSProperties = {
  fontSize: 10,
  padding: '1px 5px',
  borderRadius: 4,
  fontWeight: 600,
  textTransform: 'uppercase',
};

const typeColors: Record<string, string> = {
  number: '#e3f2fd',
  date: '#fff3e0',
  boolean: '#f3e5f5',
  enum: '#e8f5e9',
  string: '#f5f5f5',
};

function parseEnumOptions(options?: string): string[] {
  if (!options) return [];
  try {
    const parsed = JSON.parse(options);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const SchemaFields: React.FC<SchemaFieldsProps> = ({ schemas, values, onChange }) => {
  if (!schemas || schemas.length === 0) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, display: 'block' }}>
        Предзаданные свойства:
      </label>
      {schemas.map((schema) => {
        const val = values[schema.key] ?? schema.defaultValue ?? '';
        const typeColor = typeColors[schema.propertyType] || typeColors.string;

        return (
          <div key={schema.key} style={{ marginBottom: 8 }}>
            <div style={labelStyle}>
              <span>{schema.key}</span>
              {schema.required && (
                <span style={{ color: '#d32f2f', fontSize: 14, fontWeight: 700 }}>*</span>
              )}
              <span style={{ ...tagStyle, background: typeColor }}>
                {schema.propertyType}
              </span>
            </div>

            {schema.propertyType === 'boolean' ? (
              <select
                value={val}
                onChange={(e) => onChange(schema.key, e.target.value)}
                style={fieldStyle}
              >
                <option value="">— не указано —</option>
                <option value="true">Да</option>
                <option value="false">Нет</option>
              </select>
            ) : schema.propertyType === 'enum' ? (
              <select
                value={val}
                onChange={(e) => onChange(schema.key, e.target.value)}
                style={fieldStyle}
              >
                <option value="">— выбрать —</option>
                {parseEnumOptions(schema.options).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : schema.propertyType === 'date' ? (
              <input
                type="date"
                value={val}
                onChange={(e) => onChange(schema.key, e.target.value)}
                style={fieldStyle}
                required={schema.required}
              />
            ) : schema.propertyType === 'number' ? (
              <input
                type="number"
                value={val}
                onChange={(e) => onChange(schema.key, e.target.value)}
                style={fieldStyle}
                placeholder={`Введите число`}
                required={schema.required}
              />
            ) : (
              <input
                type="text"
                value={val}
                onChange={(e) => onChange(schema.key, e.target.value)}
                style={fieldStyle}
                placeholder={`Введите ${schema.key}`}
                required={schema.required}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SchemaFields;
