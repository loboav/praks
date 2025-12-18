import React, { useState, useEffect } from 'react';
import { GroupingRule } from '../hooks/useNodeGrouping';
import { ObjectType } from '../types/graph';

interface GroupingRulesPanelProps {
    rules: GroupingRule[];
    activeRule: GroupingRule | null;
    availableProperties: string[];
    objectTypes: ObjectType[];
    onCreateRule: (title: string, propertyKey: string, categoryIds?: number[]) => void;
    onDeleteRule: (ruleId: string) => void;
    onToggleRule: (ruleId: string) => void;
    onCollapseAll: () => void;
    onExpandAll: () => void;
}

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
    onDeleteRule,
    onToggleRule,
    onCollapseAll,
    onExpandAll,
}: GroupingRulesPanelProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newPropertyKey, setNewPropertyKey] = useState('objectTypeId');
    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

    // Сворачиваемость панели (как у других секций)
    const [isExpanded, setIsExpanded] = useState(() => {
        const saved = localStorage.getItem('sidebar_grouping_expanded');
        return saved !== null ? saved === 'true' : false;
    });

    useEffect(() => {
        localStorage.setItem('sidebar_grouping_expanded', String(isExpanded));
    }, [isExpanded]);

    const handleCreate = () => {
        if (!newTitle.trim()) return;
        onCreateRule(
            newTitle.trim(),
            newPropertyKey,
            selectedCategories.length > 0 ? selectedCategories : undefined
        );
        setNewTitle('');
        setNewPropertyKey('objectTypeId');
        setSelectedCategories([]);
        setIsCreating(false);
    };

    const getPropertyLabel = (key: string) => propertyLabels[key] || key;

    return (
        <div>
            {/* Заголовок секции (сворачиваемый) */}
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
                onMouseEnter={(e) => {
                    if (!isExpanded) e.currentTarget.style.background = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                    if (!isExpanded) e.currentTarget.style.background = '#fff';
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                        fontSize: 16,
                        fontWeight: 600,
                        transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.2s ease',
                    }}>
                        ▼
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>Группировка узлов</span>
                </div>
                <span style={{
                    fontSize: 13,
                    background: isExpanded ? 'rgba(255,255,255,0.2)' : '#e0e0e0',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontWeight: 500,
                }}>
                    {rules.length}
                </span>
            </div>

            {/* Содержимое (сворачиваемое) */}
            <div style={{
                maxHeight: isExpanded ? '600px' : '0',
                overflow: 'hidden',
                transition: 'max-height 0.3s ease',
            }}>
                <div style={containerStyle}>
                    {/* Активное правило */}
                    {activeRule && (
                        <div style={activeRuleStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: '#4caf50', fontSize: 18 }}>●</span>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{activeRule.title}</div>
                                    <div style={{ fontSize: 12, color: '#666' }}>
                                        По: {getPropertyLabel(activeRule.propertyKey)}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <button onClick={onCollapseAll} style={smallBtnStyle}>
                                    Свернуть все
                                </button>
                                <button onClick={onExpandAll} style={smallBtnStyle}>
                                    Развернуть все
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Список правил */}
                    <div style={rulesListStyle}>
                        {rules.length === 0 ? (
                            <div style={{ color: '#999', fontSize: 13, textAlign: 'center', padding: 16 }}>
                                Нет правил группировки
                            </div>
                        ) : (
                            rules.map(rule => (
                                <div
                                    key={rule.id}
                                    style={{
                                        ...ruleItemStyle,
                                        background: rule.isActive ? '#e3f2fd' : '#fff',
                                        borderColor: rule.isActive ? '#2196f3' : '#eee',
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 500, fontSize: 14 }}>{rule.title}</div>
                                        <div style={{ fontSize: 12, color: '#666' }}>
                                            {getPropertyLabel(rule.propertyKey)}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 4 }}>
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

                    {/* Форма создания */}
                    {isCreating ? (
                        <div style={createFormStyle}>
                            <input
                                type="text"
                                placeholder="Название правила"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                style={inputStyle}
                                autoFocus
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

                            {/* Фильтр по категориям */}
                            <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                                Применить к типам:
                            </div>
                            <div style={{ maxHeight: 100, overflowY: 'auto', marginTop: 4 }}>
                                {objectTypes.map(type => (
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

                            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                <button onClick={handleCreate} style={createBtnStyle}>
                                    Создать
                                </button>
                                <button onClick={() => setIsCreating(false)} style={cancelBtnStyle}>
                                    Отмена
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setIsCreating(true)} style={addRuleBtnStyle}>
                            + Создать правило
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Стили
const containerStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginTop: 16,
    overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid #eee',
    background: '#fafafa',
};

const activeRuleStyle: React.CSSProperties = {
    padding: 12,
    background: '#e8f5e9',
    borderBottom: '1px solid #c8e6c9',
};

const rulesListStyle: React.CSSProperties = {
    maxHeight: 200,
    overflowY: 'auto',
};

const ruleItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid #eee',
    gap: 8,
    transition: 'background 0.2s',
};

const toggleBtnStyle: React.CSSProperties = {
    padding: '4px 10px',
    border: 'none',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
};

const deleteBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: '#999',
    cursor: 'pointer',
    fontSize: 14,
    padding: '4px 8px',
};

const smallBtnStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 11,
    cursor: 'pointer',
};

const createFormStyle: React.CSSProperties = {
    padding: 12,
    borderTop: '1px solid #eee',
    background: '#fafafa',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 8,
    border: '1px solid #ddd',
    borderRadius: 4,
    fontSize: 14,
    marginBottom: 8,
};

const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: 8,
    border: '1px solid #ddd',
    borderRadius: 4,
    fontSize: 14,
};

const checkboxLabelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    padding: '2px 0',
    cursor: 'pointer',
};

const createBtnStyle: React.CSSProperties = {
    background: '#2196f3',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
};

const cancelBtnStyle: React.CSSProperties = {
    background: '#e0e0e0',
    color: '#333',
    border: 'none',
    borderRadius: 4,
    padding: '8px 16px',
    fontSize: 13,
    cursor: 'pointer',
};

const addRuleBtnStyle: React.CSSProperties = {
    width: '100%',
    padding: 12,
    background: '#fafafa',
    border: 'none',
    borderTop: '1px solid #eee',
    color: '#2196f3',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'center',
};
