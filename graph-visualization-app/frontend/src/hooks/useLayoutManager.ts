import { useState, useCallback } from 'react';
import { GraphObject, GraphRelation } from '../types/graph';
import { toast } from 'react-toastify';
import { apiClient } from '../utils/apiClient';
import {
  circularLayout,
  gridLayout,
  hierarchicalLayout,
  radialLayout,
} from '../utils/layoutAlgorithms';
import { elkLayout } from '../utils/elkLayout';

export type LayoutType =
  | 'force'
  | 'circular'
  | 'hierarchical'
  | 'radial'
  | 'grid'
  | 'manual'
  | 'elk-layered'
  | 'elk-radial'
  | 'elk-force';

interface LayoutPosition {
  id: number;
  x: number;
  y: number;
}

interface UseLayoutManagerProps {
  nodes: GraphObject[];
  edges: GraphRelation[];
  onNodesUpdate: (updater: (prev: GraphObject[]) => GraphObject[]) => void;
  onAddHistoryAction?: (action: any) => void;
}

export const useLayoutManager = ({
  nodes,
  edges,
  onNodesUpdate,
  onAddHistoryAction,
}: UseLayoutManagerProps) => {
  const [currentLayoutType, setCurrentLayoutType] = useState<LayoutType>('manual');
  const [isApplyingLayout, setIsApplyingLayout] = useState(false);
  const [layout, setLayout] = useState<any>(null);

  const applyLayout = useCallback(async () => {
    if (nodes.length === 0) {
      toast.warning('Нет узлов для расположения');
      return;
    }

    const oldPositions: LayoutPosition[] = nodes.map(n => ({
      id: n.id,
      x: n.PositionX ?? 0,
      y: n.PositionY ?? 0,
    }));

    setIsApplyingLayout(true);

    try {
      let layoutResult;

      switch (currentLayoutType) {
        case 'hierarchical':
          toast.info('Применяется иерархический layout...');
          layoutResult = hierarchicalLayout(nodes, edges);
          break;
        case 'elk-layered':
          toast.info('Применяется расширенная иерархия...');
          layoutResult = {
            nodes: await elkLayout(nodes, edges, {
              algorithm: 'layered',
              layerSpacing: 150,
              nodeSpacing: 100,
            }),
          };
          break;
        case 'elk-radial':
          toast.info('Применяется радиальный layout...');
          // Using improved custom radial layout
          layoutResult = radialLayout(nodes, edges);
          break;
        case 'elk-force':
          toast.info('Применяется силовой layout...');
          layoutResult = { nodes: await elkLayout(nodes, edges, { algorithm: 'stress' }) };
          break;
        case 'circular':
          toast.info('Применяется круговой layout...');
          layoutResult = circularLayout(nodes);
          break;
        case 'grid':
          toast.info('Применяется сеточный layout...');
          layoutResult = gridLayout(nodes);
          break;
        default:
          setIsApplyingLayout(false);
          return;
      }

      // O(1) Map lookup вместо O(n²) .find() в цикле
      const newPosMap = new Map<number, { x: number; y: number }>();
      layoutResult.nodes.forEach((n: any) => newPosMap.set(n.id, { x: n.x, y: n.y }));

      const updatedNodes = nodes.map(node => {
        const newPos = newPosMap.get(node.id);
        if (newPos) {
          return { ...node, PositionX: newPos.x, PositionY: newPos.y };
        }
        return node;
      });

      onNodesUpdate(() => updatedNodes);
      setIsApplyingLayout(false);

      if (onAddHistoryAction) {
        onAddHistoryAction({
          type: 'layout',
          description: `Применён layout "${currentLayoutType}"`,
          undo: async () => {
            // O(1) Map lookup вместо O(n²) .find() в цикле
            const oldPosMap = new Map<number, { x: number; y: number }>();
            oldPositions.forEach(p => oldPosMap.set(p.id, { x: p.x, y: p.y }));

            const restoredNodes = nodes.map(node => {
              const oldPos = oldPosMap.get(node.id);
              if (oldPos) {
                return { ...node, PositionX: oldPos.x, PositionY: oldPos.y };
              }
              return node;
            });
            onNodesUpdate(() => restoredNodes);
          },
          redo: async () => {
            onNodesUpdate(() => updatedNodes);
          },
        });
      }
    } catch (error) {
      console.error('Layout error:', error);
      toast.error('Ошибка применения layout');
      setIsApplyingLayout(false);
    }
  }, [nodes, edges, currentLayoutType, onNodesUpdate, onAddHistoryAction]);

  const saveLayout = useCallback(async () => {
    const layoutObj = {
      nodes: nodes.map(n => ({
        id: n.id,
        x: n.PositionX ?? 0,
        y: n.PositionY ?? 0,
      })),
    };

    const res = await apiClient.post('/api/layout', { layoutJson: JSON.stringify(layoutObj) });

    if (res.ok) {
      toast.success('Сетка успешно сохранена!');
    } else {
      toast.error('Ошибка сохранения layout');
    }
  }, [nodes]);

  const loadLayout = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/layout');
      if (!response.ok) return null;

      const layoutData = await response.json();
      if (layoutData && layoutData.layoutJson) {
        const layoutObj = JSON.parse(layoutData.layoutJson);
        setLayout(layoutObj);
        return layoutObj;
      }
    } catch (error) {
      console.error('Error loading layout:', error);
    }
    return null;
  }, []);

  return {
    currentLayoutType,
    setCurrentLayoutType,
    isApplyingLayout,
    layout,
    setLayout,
    applyLayout,
    saveLayout,
    loadLayout,
  };
};
