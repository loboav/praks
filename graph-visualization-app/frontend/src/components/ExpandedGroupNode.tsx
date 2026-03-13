import React, { memo } from 'react';
import { NodeProps } from 'reactflow';

/**
 * Визуальный контейнер для раскрытой группы узлов.
 * Используется как parent-узел (ReactFlow Sub Flow).
 * Дочерние узлы позиционируются внутри и двигаются вместе с ним.
 */
const ExpandedGroupNode = memo(({ data }: NodeProps) => {
    const label = data.label || 'Группа';
    const count = data.count || 0;

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                borderRadius: 24,
                border: '2px solid rgba(158,158,158,0.35)',
                background: 'rgba(200,200,200,0.10)',
                position: 'relative',
                pointerEvents: 'all',
            }}
        >
            {/* Подпись группы сверху */}
            <div
                style={{
                    position: 'absolute',
                    top: -28,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(97,97,97,0.85)',
                    color: '#fff',
                    padding: '4px 14px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    userSelect: 'none',
                }}
            >
                {label} ({count})
            </div>
        </div>
    );
});

ExpandedGroupNode.displayName = 'ExpandedGroupNode';

export default ExpandedGroupNode;
