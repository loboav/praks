import React, { memo } from 'react';
import { useInternalNode, getStraightPath, BaseEdge, EdgeProps, EdgeLabelRenderer } from '@xyflow/react';
import { getEdgeParams } from '../../utils/edgeRouting';

const FloatingEdge: React.FC<EdgeProps> = ({
  id,
  source,
  target,
  markerEnd,
  style,
  label,
  labelStyle,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
}) => {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode
  );

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
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

export default memo(FloatingEdge);
