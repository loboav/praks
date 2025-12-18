import React from 'react';
import { GraphObject, ObjectType } from '../types/graph';

interface GroupInfoPanelProps {
    groupNode: GraphObject;
    nodesInGroup: GraphObject[];
    objectTypes: ObjectType[];
    onNodeClick: (node: GraphObject) => void;
    onExpandGroup: () => void;
    onClose: () => void;
}

/**
 * Панель информации о свёрнутой группе узлов
 * Показывает список узлов внутри группы
 */
export default function GroupInfoPanel({
    groupNode,
    nodesInGroup,
    objectTypes,
    onNodeClick,
    onExpandGroup,
    onClose,
}: GroupInfoPanelProps) {
    const getTypeName = (typeId: number) => {
        const type = objectTypes.find(t => t.id === typeId);
        return type?.name || `Тип ${typeId}`;
    };

    // Группировка по типам для статистики
    const typeStats = nodesInGroup.reduce((acc, node) => {
        const typeName = getTypeName(node.objectTypeId);
        acc[typeName] = (acc[typeName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div style={panelStyle}>
            {/* Заголовок */}
            <div style={headerStyle}>
                <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                        📦 {groupNode._groupPropertyValue || 'Группа'}
                    </div>
                    <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                        {nodesInGroup.length} узлов
                    </div>
                </div>
                <button onClick={onClose} style={closeBtnStyle}>✕</button>
            </div>

            {/* Статистика по типам */}
            <div style={statsStyle}>
                {Object.entries(typeStats).map(([typeName, count]) => (
                    <div key={typeName} style={statItemStyle}>
                        <span>{typeName}</span>
                        <span style={{ fontWeight: 600 }}>×{count}</span>
                    </div>
                ))}
            </div>

            {/* Кнопка развернуть */}
            <button onClick={onExpandGroup} style={expandBtnStyle}>
                🔓 Развернуть группу
            </button>

            {/* Список узлов */}
            <div style={listHeaderStyle}>Узлы в группе:</div>
            <div style={listStyle}>
                {nodesInGroup.map(node => (
                    <div
                        key={node.id}
                        onClick={() => onNodeClick(node)}
                        style={nodeItemStyle}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {node.icon && <span>{node.icon}</span>}
                            <div>
                                <div style={{ fontWeight: 500, fontSize: 14 }}>{node.name}</div>
                                <div style={{ fontSize: 12, color: '#888' }}>
                                    {getTypeName(node.objectTypeId)}
                                </div>
                            </div>
                        </div>
                        <span style={{ color: node.color || '#2196f3', fontSize: 20 }}>●</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Стили
const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 80,
    right: 16,
    width: 300,
    maxHeight: 'calc(100vh - 160px)',
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    overflow: 'hidden',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
};

const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottom: '1px solid #eee',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
};

const closeBtnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: '#fff',
    width: 28,
    height: 28,
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: 14,
};

const statsStyle: React.CSSProperties = {
    padding: 12,
    background: '#fafafa',
    borderBottom: '1px solid #eee',
};

const statItemStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    padding: '4px 0',
};

const expandBtnStyle: React.CSSProperties = {
    margin: 12,
    padding: '10px 16px',
    background: '#4caf50',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
};

const listHeaderStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: 12,
    color: '#666',
    fontWeight: 600,
    background: '#f5f5f5',
    borderBottom: '1px solid #eee',
};

const listStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    maxHeight: 300,
};

const nodeItemStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'background 0.15s',
};
