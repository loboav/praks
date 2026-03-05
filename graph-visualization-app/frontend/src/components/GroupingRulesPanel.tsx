import React, { useState, useEffect } from 'react';
import { GroupingRule } from '../hooks/useNodeGrouping';
import { ObjectType } from '../types/graph';

interface GroupingRulesPanelProps {
  rules: GroupingRule[];
  activeRule: GroupingRule | null;
  availableProperties: string[];
  objectTypes: ObjectType[];
  onCreateRule: (title: string, propertyKey: string, categoryIds?: number[]) => void;
  onCreateManualGroup: (title: string, nodeIds: number[], color?: string, icon?: string) => void;
  onDeleteRule: (ruleId: string) => void;
  onToggleRule: (ruleId: string) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  // Selected node IDs for manual grouping
  selectedNodeIds?: number[];
}

const MANUAL_COLORS = [
  '#607d8b',
  '#e53935',
  '#8e24aa',
  '#1e88e5',
  '#00897b',
  '#f4511e',
  '#43a047',
  '#fb8c00',
];

const MANUAL_ICONS = ['📦', '👥', '🏢', '🌐', '⭐', '🔗', '🎯', '🛡️'];

const propertyLabels: Record<string, string> = {
  objectTypeId: 'Тип объекта',
  city: 'Город',
  country: 'Страна',
  status: 'Статус',
  category: 'Категория',
};

export default function GroupingRulesPanel({
  rules,
  activeRule,
  availableProperties,
  objectTypes,
  onCreateRule,
  onCreateManualGroup,
  onDeleteRule,
  onToggleRule,
  onCollapseAll,
  onExpandAll,
  selectedNodeIds = [],
}: GroupingRulesPanelProps) {
  // ── Expand/collapse panel ──────────────────────────────────────────────
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebar_grouping_expanded');
    return saved !== null ? saved === 'true' : false;
  });
  useEffect(() => {
    localStorage.setItem('sidebar_grouping_expanded', String(isExpanded));
  }, [isExpanded]);

  // ── Create property rule form ──────────────────────────────────────────
  const [creatingProperty, setCreatingProperty] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPropertyKey, setNewPropertyKey] = useState('objectTypeId');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  // ── Create manual group form ───────────────────────────────────────────
  const [creatingManual, setCreatingManual] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualColor, setManualColor] = useState(MANUAL_COLORS[0]);
  const [manualIcon, setManualIcon] = useState(MANUAL_ICONS[0]);

  // Auto-select categories when property changes
  useEffect(() => {
    if (newPropertyKey === 'objectTypeId') {
      setSelectedCategories(objectTypes.map(t => t.id));
    } else {
      const matching = objectTypes.filter(t => {
        if (!t.propertySchemas || t.propertySchemas.length === 0) return true;
        return t.propertySchemas.some(s => s.key === newPropertyKey);
      });
      setSelectedCategories(matching.map(t => t.id));
    }
  }, [newPropertyKey, objectTypes]);

  const handleCreateProperty = () => {
    if (!newTitle.trim()) return;
    onCreateRule(
      newTitle.trim(),
      newPropertyKey,
      selectedCategories.length > 0 ? selectedCategories : undefined
    );
    setNewTitle('');
    setCreatingProperty(false);
  };

  const handleCreateManual = () => {
    if (!manualTitle.trim()) return;
    if (selectedNodeIds.length < 2) return;
    onCreateManualGroup(manualTitle.trim(), selectedNodeIds, manualColor, manualIcon);
    setManualTitle('');
    setCreatingManual(false);
  };

  const getPropertyLabel = (key: string) => propertyLabels[key] || key;

  // Split rules
  const propertyRules = rules.filter(r => r.mode === 'property');
  const manualGroups = rules.filter(r => r.mode === 'manual');

  return (
    <div>
      {/* ── Section header ──────────────────────────────────────── */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          background: isExpanded ? '#2196f3' : '#fff',
          color: isExpanded ? '#fff' : '#333',
          borderRadius: 6,
          cursor: 'pointer',
          marginBottom: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease',
          userSelect: 'none',
        }}
        onMouseEnter={e => {
          if (!isExpanded) e.currentTarget.style.background = '#f0f0f0';
        }}
        onMouseLeave={e => {
          if (!isExpanded) e.currentTarget.style.background = '#fff';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.2s ease',
              display: 'inline-block',
            }}
          >
            ▼
          </span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Группировка узлов</span>
        </div>
        <span
          style={{
            fontSize: 13,
            background: isExpanded ? 'rgba(255,255,255,0.2)' : '#e0e0e0',
            padding: '2px 8px',
            borderRadius: 12,
            fontWeight: 500,
          }}
        >
          {rules.length}
        </span>
      </div>

      {/* ── Collapsible body ────────────────────────────────────── */}
      <div
        style={{
          maxHeight: isExpanded ? '800px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <div style={containerStyle}>
          {/* ── Active property rule controls ───────────────── */}
          {activeRule && (
            <div style={activeRuleStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#4caf50', fontSize: 18 }}>●</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{activeRule.title}</div>
                  <div style={{ fontSize: 12, color: '#555' }}>
                    По: {getPropertyLabel(activeRule.propertyKey)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={onCollapseAll} style={smallBtnStyle}>
                  🔒 Свернуть
                </button>
                <button onClick={onExpandAll} style={smallBtnStyle}>
                  🔓 Развернуть
                </button>
              </div>
            </div>
          )}

          {/* ── SECTION: Property-based rules ───────────────── */}
          <div style={sectionLabelStyle}>По свойству</div>

          <div style={rulesListStyle}>
            {propertyRules.length === 0 ? (
              <div style={emptyHintStyle}>Нет правил</div>
            ) : (
              propertyRules.map(rule => (
                <div
                  key={rule.id}
                  style={{
                    ...ruleItemStyle,
                    background: rule.isActive ? '#e3f2fd' : '#fff',
                    borderColor: rule.isActive ? '#2196f3' : '#eee',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: 13,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {rule.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                      {getPropertyLabel(rule.propertyKey)}
                      {rule.categoryIds && rule.categoryIds.length > 0 && (
                        <span style={{ marginLeft: 4, color: '#aaa' }}>
                          · {rule.categoryIds.length} тип(ов)
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => onToggleRule(rule.id)}
                      style={{
                        ...toggleBtnStyle,
                        background: rule.isActive ? '#4caf50' : '#e0e0e0',
                        color: rule.isActive ? '#fff' : '#666',
                      }}
                    >
                      {rule.isActive ? 'ВКЛ' : 'ВЫКЛ'}
                    </button>
                    <button
                      onClick={() => onDeleteRule(rule.id)}
                      style={deleteBtnStyle}
                      title="Удалить правило"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Create property rule form */}
          {creatingProperty ? (
            <div style={createFormStyle}>
              <input
                type="text"
                placeholder="Название правила"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                style={inputStyle}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateProperty();
                  if (e.key === 'Escape') setCreatingProperty(false);
                }}
              />
              <select
                value={newPropertyKey}
                onChange={e => setNewPropertyKey(e.target.value)}
                style={selectStyle}
              >
                {availableProperties.map(prop => (
                  <option key={prop} value={prop}>
                    {getPropertyLabel(prop)}
                  </option>
                ))}
              </select>

              <div style={{ fontSize: 11, color: '#888', marginTop: 8, marginBottom: 4 }}>
                Применить к типам объектов:
              </div>
              <div style={{ maxHeight: 90, overflowY: 'auto', marginBottom: 8 }}>
                {objectTypes
                  .filter(t => {
                    if (newPropertyKey === 'objectTypeId') return true;
                    if (!t.propertySchemas || t.propertySchemas.length === 0) return true;
                    return t.propertySchemas.some(s => s.key === newPropertyKey);
                  })
                  .map(type => (
                    <label key={type.id} style={checkboxLabelStyle}>
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(type.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedCategories([...selectedCategories, type.id]);
                          } else {
                            setSelectedCategories(selectedCategories.filter(id => id !== type.id));
                          }
                        }}
                      />
                      {type.name}
                    </label>
                  ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCreateProperty} style={createBtnStyle}>
                  Создать
                </button>
                <button onClick={() => setCreatingProperty(false)} style={cancelBtnStyle}>
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setCreatingProperty(true);
                setCreatingManual(false);
              }}
              style={addBtnStyle}
            >
              + Правило по свойству
            </button>
          )}

          {/* ── SECTION: Manual groups ───────────────────────── */}
          <div style={{ ...sectionLabelStyle, marginTop: 8 }}>Произвольные группы</div>

          <div style={rulesListStyle}>
            {manualGroups.length === 0 ? (
              <div style={emptyHintStyle}>Нет ручных групп</div>
            ) : (
              manualGroups.map(rule => (
                <div
                  key={rule.id}
                  style={{ ...ruleItemStyle, background: '#fafafa', borderColor: '#eee' }}
                >
                  {/* Color dot + icon */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: rule.color ?? '#607d8b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      flexShrink: 0,
                      border: '2px dashed rgba(0,0,0,0.15)',
                    }}
                  >
                    {rule.icon ?? '📦'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: 13,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {rule.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                      {rule.manualNodeIds?.length ?? 0} узлов
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteRule(rule.id)}
                    style={deleteBtnStyle}
                    title="Удалить группу"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Create manual group form */}
          {creatingManual ? (
            <div style={createFormStyle}>
              {selectedNodeIds.length < 2 ? (
                <div
                  style={{
                    fontSize: 12,
                    color: '#e53935',
                    background: '#ffebee',
                    padding: '8px 10px',
                    borderRadius: 6,
                    marginBottom: 8,
                  }}
                >
                  ⚠ Выберите минимум 2 узла на графе для создания группы
                </div>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    color: '#2e7d32',
                    background: '#e8f5e9',
                    padding: '8px 10px',
                    borderRadius: 6,
                    marginBottom: 8,
                  }}
                >
                  ✓ Выбрано {selectedNodeIds.length} узлов
                </div>
              )}

              <input
                type="text"
                placeholder="Название группы"
                value={manualTitle}
                onChange={e => setManualTitle(e.target.value)}
                style={inputStyle}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateManual();
                  if (e.key === 'Escape') setCreatingManual(false);
                }}
              />

              {/* Color picker */}
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Цвет:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {MANUAL_COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => setManualColor(c)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: c,
                      cursor: 'pointer',
                      border: manualColor === c ? '3px solid #333' : '2px solid transparent',
                      boxSizing: 'border-box',
                      transition: 'transform 0.1s',
                      transform: manualColor === c ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>

              {/* Icon picker */}
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Иконка:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {MANUAL_ICONS.map(ic => (
                  <div
                    key={ic}
                    onClick={() => setManualIcon(ic)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: manualIcon === ic ? '#e3f2fd' : '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      cursor: 'pointer',
                      border: manualIcon === ic ? '2px solid #2196f3' : '2px solid transparent',
                    }}
                  >
                    {ic}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleCreateManual}
                  style={{ ...createBtnStyle, opacity: selectedNodeIds.length < 2 ? 0.5 : 1 }}
                  disabled={selectedNodeIds.length < 2}
                >
                  Создать
                </button>
                <button onClick={() => setCreatingManual(false)} style={cancelBtnStyle}>
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setCreatingManual(true);
                setCreatingProperty(false);
              }}
              style={{
                ...addBtnStyle,
                color: selectedNodeIds.length >= 2 ? '#e65100' : '#9e9e9e',
                borderTop: '1px solid #eee',
              }}
              title={
                selectedNodeIds.length < 2
                  ? 'Выберите 2+ узла на графе'
                  : `Сгруппировать ${selectedNodeIds.length} выбранных узлов`
              }
            >
              {selectedNodeIds.length >= 2
                ? `+ Сгруппировать выбранные (${selectedNodeIds.length})`
                : '+ Произвольная группа'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  overflow: 'hidden',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#aaa',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  padding: '8px 12px 4px',
  background: '#f9f9f9',
};

const activeRuleStyle: React.CSSProperties = {
  padding: 12,
  background: '#e8f5e9',
  borderBottom: '1px solid #c8e6c9',
};

const rulesListStyle: React.CSSProperties = {
  maxHeight: 180,
  overflowY: 'auto',
};

const emptyHintStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#bbb',
  padding: '8px 12px',
  fontStyle: 'italic',
};

const ruleItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 10px',
  borderBottom: '1px solid',
  gap: 8,
  transition: 'background 0.15s',
};

const toggleBtnStyle: React.CSSProperties = {
  padding: '3px 8px',
  border: 'none',
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const deleteBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#bbb',
  cursor: 'pointer',
  fontSize: 13,
  padding: '2px 4px',
  lineHeight: 1,
  flexShrink: 0,
};

const createFormStyle: React.CSSProperties = {
  padding: 12,
  borderTop: '1px solid #eee',
  background: '#fafafa',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  border: '1px solid #ddd',
  borderRadius: 5,
  fontSize: 13,
  marginBottom: 8,
  boxSizing: 'border-box',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  border: '1px solid #ddd',
  borderRadius: 5,
  fontSize: 13,
  boxSizing: 'border-box',
};

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  padding: '2px 0',
  cursor: 'pointer',
};

const createBtnStyle: React.CSSProperties = {
  background: '#2196f3',
  color: '#fff',
  border: 'none',
  borderRadius: 5,
  padding: '7px 14px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

const cancelBtnStyle: React.CSSProperties = {
  background: '#eee',
  color: '#555',
  border: 'none',
  borderRadius: 5,
  padding: '7px 12px',
  fontSize: 12,
  cursor: 'pointer',
};

const addBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: '#fafafa',
  border: 'none',
  color: '#2196f3',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  textAlign: 'left',
};

const smallBtnStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #ccc',
  borderRadius: 4,
  padding: '4px 8px',
  fontSize: 11,
  cursor: 'pointer',
  color: '#333',
};
