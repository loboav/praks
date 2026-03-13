import React from 'react';
import { EdgeProps, EdgeLabelRenderer, BaseEdge } from 'reactflow';

const ParallelEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
  data,
  label,
  labelStyle,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
}) => {
  const { index = 0, total = 1 } = data || {};

  // Средняя точка между узлами
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  // Вектор между узлами
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  
  // Перпендикулярный вектор для смещения контрольной точки кривой
  const nx = -dy / len;
  const ny = dx / len;

  // Смещение зависит от индекса ребра в группе параллельных ребер
  const baseOffset = 40;
  const curvature = (index - (total - 1) / 2) * baseOffset;

  // Для того чтобы параллельные ребра в разных направлениях (A->B и B->A) 
  // не накладывались, инвертируем кривизну для "обратных" ребер.
  // Это компенсирует переворот нормали (nx, ny).
  const isReverse = sourceX > targetX || (sourceX === targetX && sourceY > targetY);
  const effectiveCurvature = isReverse ? -curvature : curvature;

  // Контрольная точка для квадратичной кривой Безье
  const controlX = midX + nx * effectiveCurvature;
  const controlY = midY + ny * effectiveCurvature;

  const path = `M ${sourceX},${sourceY} Q ${controlX},${controlY} ${targetX},${targetY}`;

  // Рендерим само ребро и метку (label) отдельно через EdgeLabelRenderer
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${controlX}px,${controlY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div style={{
                background: (labelBgStyle?.fill as string) || '#fff',
                padding: Array.isArray(labelBgPadding) 
                  ? `${labelBgPadding[0]}px ${labelBgPadding[1]}px` 
                  : '4px 8px',
                borderRadius: labelBgBorderRadius || 4,
                border: `${(labelBgStyle?.strokeWidth as number) || 1}px solid ${(labelBgStyle?.stroke as string) || '#ccc'}`,
                color: (labelStyle?.fill as string) || '#000',
                fontSize: labelStyle?.fontSize || 12,
                fontWeight: labelStyle?.fontWeight || 500,
                fontFamily: labelStyle?.fontFamily || 'sans-serif',
                whiteSpace: 'nowrap',
                opacity: (labelBgStyle?.fillOpacity as number) || 1,
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            }}>
                {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default ParallelEdge;
