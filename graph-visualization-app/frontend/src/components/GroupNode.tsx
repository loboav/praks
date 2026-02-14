import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

// Компонент для отображения сгруппированного узла (мета-узла)
// Стиль Linkurious: серый пунктирный круг + бейдж с количеством + иконка категории
const GroupNode = memo(({ data, selected }: NodeProps) => {
    // data: { label, count, color, icon, orig }
    const count = data.count || 1;
    const color = data.color || '#9e9e9e';
    const icon = data.icon || '📦';
    const label = data.label || 'Group';

    return (
        <div style={{ position: 'relative' }}>
            {/* Handles для соединений (невидимые, но нужны для ReactFlow) */}
            <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
            <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
            <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
            <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />

            {/* Основной контейнер группы */}
            <div style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                // Внешняя граница: пунктирная серая (как в Linkurious) или сплошная синяя при выборе
                border: selected ? '3px solid #1976d2' : '2px dashed #9e9e9e',
                background: '#fafafa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: selected ? '0 0 0 4px rgba(25,118,210,0.1)' : '0 4px 8px rgba(0,0,0,0.08)',
                transition: 'all 0.2s ease',
                position: 'relative',
            }}>

                {/* Внутренний круг с цветом категории */}
                <div style={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background: color, // Цвет категории
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    color: '#fff', // Иконка белая
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                }}>
                    {icon}
                </div>

                {/* Бейдж с количеством (справа сверху) */}
                {count > 1 && (
                    <div style={{
                        position: 'absolute',
                        top: -5,
                        right: -5,
                        background: '#ff5722', // Оранжевый/красный для внимания
                        color: 'white',
                        borderRadius: 12,
                        padding: '2px 8px',
                        fontSize: 12,
                        fontWeight: 700,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        border: '2px solid white',
                        zIndex: 10,
                    }}>
                        ×{count}
                    </div>
                )}
            </div>

            {/* Подпись снизу */}
            <div style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: 6,
                fontSize: 12,
                fontWeight: 500,
                color: '#333',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                background: 'rgba(255,255,255,0.85)',
                padding: '2px 6px',
                borderRadius: 4,
                pointerEvents: 'none', // Чтобы не мешало кликам
            }}>
                {label}
            </div>
        </div>
    );
});

export default GroupNode;
