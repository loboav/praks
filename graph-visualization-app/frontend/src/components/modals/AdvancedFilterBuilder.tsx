import React from 'react';
import { FilterGroup, PropertyRule, FilterOperator } from '../../hooks/useGraphFilters';
import { PropertyMetadata } from '../../utils/propertyAggregations';

interface AdvancedFilterBuilderProps {
  filterGroup: FilterGroup | undefined;
  onChange: (group: FilterGroup | undefined) => void;
  availableProperties: string[];
  propertyMetadata: PropertyMetadata[];
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const operatorLabels: Record<FilterOperator, string> = {
  eq: '=',
  neq: '≠',
  gt: '>',
  lt: '<',
  gte: '>=',
  lte: '<=',
  contains: 'содержит',
  not_contains: 'не содержит',
};

const defaultGroup: FilterGroup = {
  id: generateId(),
  type: 'group',
  logicalOperator: 'AND',
  children: [],
};

const AdvancedFilterBuilder: React.FC<AdvancedFilterBuilderProps> = ({ filterGroup, onChange, availableProperties, propertyMetadata }) => {
  if (!filterGroup) {
    return (
      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => onChange(defaultGroup)}
          style={{
            background: '#ebf5ff',
            color: '#2196f3',
            border: '1px dashed #2196f3',
            padding: '8px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            width: '100%',
          }}
        >
          + Добавить продвинутый фильтр (Свойства)
        </button>
      </div>
    );
  }

  const updateNode = (
    current: FilterGroup | PropertyRule,
    targetId: string,
    updater: (node: FilterGroup | PropertyRule) => FilterGroup | PropertyRule | null
  ): FilterGroup | PropertyRule | null => {
    if (current.id === targetId) {
      return updater(current);
    }
    if (current.type === 'group') {
      const newChildren = current.children
        .map(child => updateNode(child, targetId, updater))
        .filter(Boolean) as Array<FilterGroup | PropertyRule>;
      return { ...current, children: newChildren };
    }
    return current;
  };

  const handleUpdate = (targetId: string, updater: (node: FilterGroup | PropertyRule) => FilterGroup | PropertyRule | null) => {
    const newGroup = updateNode(filterGroup, targetId, updater) as FilterGroup | null;
    onChange(newGroup && newGroup.children.length > 0 ? newGroup : undefined);
  };

  const renderGroup = (group: FilterGroup, depth: number) => {
    return (
      <div key={group.id} style={{ 
        marginLeft: depth > 0 ? 16 : 0, 
        paddingLeft: depth > 0 ? 12 : 0, 
        borderLeft: depth > 0 ? '2px solid #e0e0e0' : 'none',
        marginTop: 8,
        opacity: group.isEnabled === false && depth > 0 ? 0.5 : 1,
        transition: 'opacity 0.2s'
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          {depth > 0 && (
            <input
              type="checkbox"
              checked={group.isEnabled !== false}
              onChange={e => handleUpdate(group.id, n => ({ ...n, isEnabled: e.target.checked }))}
              style={{ cursor: 'pointer', transform: 'scale(1.1)', margin: 0 }}
              title="Включить/выключить группу фильтров"
            />
          )}
          <select
            value={group.logicalOperator}
            onChange={e => handleUpdate(group.id, n => ({ ...n, logicalOperator: e.target.value as 'AND' | 'OR' }))}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid #ccc',
              background: group.logicalOperator === 'AND' ? '#e3f2fd' : '#fff3e0',
              fontWeight: 600,
              fontSize: 12,
              color: '#333',
            }}
          >
            <option value="AND">И (AND)</option>
            <option value="OR">ИЛИ (OR)</option>
          </select>
          
          <button
            onClick={() => handleUpdate(group.id, (n) => {
              if (n.type !== 'group') return n;
              return {
                ...n,
                children: [...n.children, { id: generateId(), type: 'rule', property: availableProperties[0] || '', operator: 'eq', value: '' }]
              };
            })}
            style={{ ...btnStyle, color: '#2196f3' }}
          >
            + Условие
          </button>
          
          <button
            onClick={() => handleUpdate(group.id, (n) => {
              if (n.type !== 'group') return n;
              return {
                ...n,
                children: [...n.children, { id: generateId(), type: 'group', logicalOperator: 'AND', children: [] }]
              };
            })}
            style={{ ...btnStyle, color: '#4caf50' }}
          >
            + Группа
          </button>

          {depth > 0 && (
            <button
              onClick={() => handleUpdate(group.id, () => null)}
              style={{ ...btnStyle, color: '#f44336', marginLeft: 'auto' }}
            >
              Удалить
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {group.children.map(child => 
            child.type === 'rule' ? renderRule(child, depth + 1) : renderGroup(child, depth + 1)
          )}
          {group.children.length === 0 && (
            <div style={{ fontSize: 12, color: '#999', fontStyle: 'italic', paddingLeft: 8 }}>
              Пустая группа
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRule = (rule: PropertyRule, depth: number) => {
    return (
      <div key={rule.id} style={{
        display: 'flex', gap: 8, alignItems: 'center',
        background: '#f9f9f9', padding: '6px 12px', borderRadius: 6,
        border: '1px solid #eee',
        marginLeft: depth > 0 ? 16 : 0,
        opacity: rule.isEnabled === false ? 0.5 : 1,
        transition: 'opacity 0.2s'
      }}>
        <input
          type="checkbox"
          checked={rule.isEnabled !== false}
          onChange={e => handleUpdate(rule.id, n => ({ ...n, isEnabled: e.target.checked }))}
          style={{ cursor: 'pointer', transform: 'scale(1.1)', margin: 0 }}
          title="Включить/выключить это условие"
        />

        {availableProperties.length > 0 ? (
          <select
            value={rule.property}
            onChange={e => handleUpdate(rule.id, n => ({ ...n, property: e.target.value }))}
            style={inputStyle}
          >
            {availableProperties.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        ) : (
          <input
            type="text"
            placeholder="Свойство"
            value={rule.property}
            onChange={e => handleUpdate(rule.id, n => ({ ...n, property: e.target.value }))}
            style={{ ...inputStyle, width: 120 }}
          />
        )}

        <select
          value={rule.operator}
          onChange={e => handleUpdate(rule.id, n => ({ ...n, operator: e.target.value as FilterOperator }))}
          style={{ ...inputStyle, width: 100 }}
        >
          {Object.entries(operatorLabels).map(([op, label]) => (
            <option key={op} value={op}>{label}</option>
          ))}
        </select>

        {(() => {
          const meta = propertyMetadata.find(m => m.name === rule.property);
          
          if (meta) {
            if (meta.type === 'date') {
              return (
                <input
                  type="date"
                  value={rule.value}
                  onChange={e => handleUpdate(rule.id, n => ({ ...n, value: e.target.value }))}
                  style={{ ...inputStyle, flex: 1 }}
                />
              );
            }
            if (meta.type === 'boolean') {
              return (
                <select
                  value={rule.value}
                  onChange={e => handleUpdate(rule.id, n => ({ ...n, value: e.target.value }))}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  <option value="">Выберите...</option>
                  <option value="true">Да (True)</option>
                  <option value="false">Нет (False)</option>
                </select>
              );
            }
            if (meta.uniqueValues.length <= 50) {
              return (
                <select
                  value={rule.value}
                  onChange={e => handleUpdate(rule.id, n => ({ ...n, value: e.target.value }))}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  <option value="">Выберите значение...</option>
                  {meta.uniqueValues.map(v => (
                    <option key={String(v)} value={String(v)}>{String(v)}</option>
                  ))}
                </select>
              );
            }
            if (meta.type === 'number') {
              return (
                <input
                  type="number"
                  placeholder="Число..."
                  value={rule.value}
                  onChange={e => handleUpdate(rule.id, n => ({ ...n, value: e.target.value }))}
                  style={{ ...inputStyle, flex: 1 }}
                />
              );
            }
          }

          // По умолчанию (строка без списка или >50 значений)
          return (
            <input
              type="text"
              placeholder="Значение"
              value={rule.value}
              onChange={e => handleUpdate(rule.id, n => ({ ...n, value: e.target.value }))}
              style={{ ...inputStyle, flex: 1 }}
            />
          );
        })()}

        <button
          onClick={() => handleUpdate(rule.id, () => null)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 16, padding: '0 4px' }}
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#333' }}>
          🧠 Продвинутый фильтр (Свойства)
        </h3>
        <button
          onClick={() => onChange(undefined)}
          style={{ ...btnStyle, color: '#f44336' }}
        >
          Очистить всё
        </button>
      </div>
      
      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 12, marginTop: 8 }}>
        {renderGroup(filterGroup, 0)}
      </div>
    </div>
  );
};

const btnStyle = {
  background: 'none',
  border: 'none',
  fontSize: 12,
  cursor: 'pointer',
  fontWeight: 500,
  padding: '4px 8px',
  borderRadius: 4,
};

const inputStyle = {
  padding: '4px 8px',
  border: '1px solid #ddd',
  borderRadius: 4,
  fontSize: 13,
  outline: 'none',
};

export default AdvancedFilterBuilder;
