import { useState, useCallback } from 'react';
import { GraphObject, GraphRelation } from '../types/graph';
import { toast } from 'react-toastify';
import { apiClient } from '../utils/apiClient';
import { elkLayout } from '../utils/elkLayout';

export type LayoutType =
  | 'manual'
  | 'elk-layered'
  | 'elk-disjoint'
  | 'elk-random'
  | 'elk-rectpacking'
  | 'elk-mrtree'
  | 'elk-box';

interface LayoutPosition {
  id: number;
  x: number;
  y: number;
}

interface UseLayoutManagerProps {
  rawNodes: GraphObject[];
  layoutNodes: GraphObject[];
  layoutEdges: GraphRelation[];
  onNodesUpdate: (updater: (prev: GraphObject[]) => GraphObject[]) => void;
  onAddHistoryAction?: (action: any) => void;
}

export const useLayoutManager = ({
  rawNodes,
  layoutNodes,
  layoutEdges,
  onNodesUpdate,
  onAddHistoryAction,
}: UseLayoutManagerProps) => {
  const [currentLayoutType, setCurrentLayoutType] = useState<LayoutType>('manual');
  const [isApplyingLayout, setIsApplyingLayout] = useState(false);
  const [layout, setLayout] = useState<any>(null);
  const [layoutVersion, setLayoutVersion] = useState(0);

  const applyLayout = useCallback(async () => {
    if (layoutNodes.length === 0) {
      toast.warning('Нет узлов для расположения');
      return;
    }

    const oldPositions: LayoutPosition[] = rawNodes.map(n => ({
      id: n.id,
      x: n.PositionX ?? 0,
      y: n.PositionY ?? 0,
    }));

    setIsApplyingLayout(true);

    try {
      let layoutResult;

      switch (currentLayoutType) {
        case 'elk-layered':
          toast.info('Применяется иерархический layout...');
          layoutResult = {
            nodes: await elkLayout(layoutNodes, layoutEdges, {
              algorithm: 'layered',
              layerSpacing: 400,
              nodeSpacing: 250,
            }),
          };
          break;
        case 'elk-disjoint':
          toast.info('Применяется DDG (разбиение)...');
          layoutResult = { nodes: await elkLayout(layoutNodes, layoutEdges, { algorithm: 'disjoint-directed' }) };
          break;
        case 'elk-random':
          toast.info('Применяется случайное расположение...');
          layoutResult = { nodes: await elkLayout(layoutNodes, layoutEdges, { algorithm: 'random' }) };
          break;
        case 'elk-rectpacking':
          toast.info('Применяется упаковка узлов...');
          layoutResult = { nodes: await elkLayout(layoutNodes, layoutEdges, { algorithm: 'rectpacking' }) };
          break;
        case 'elk-mrtree':
          toast.info('Применяется древовидный layout...');
          layoutResult = { nodes: await elkLayout(layoutNodes, layoutEdges, { algorithm: 'mrtree' }) };
          break;
        case 'elk-box':
          toast.info('Применяется сеточная упаковка...');
          layoutResult = { nodes: await elkLayout(layoutNodes, layoutEdges, { algorithm: 'box' }) };
          break;
        default:
          setIsApplyingLayout(false);
          return;
      }

      const newPosMap = new Map<number, { x: number; y: number }>();
      layoutResult.nodes.forEach((n: any) => newPosMap.set(n.id, { x: n.x, y: n.y }));

      const updatedNodes = rawNodes.map(node => {
        const newPos = newPosMap.get(node.id);
        if (newPos) {
          return { ...node, PositionX: newPos.x, PositionY: newPos.y };
        }
        return node;
      });

      // Use finally to guarantee isApplyingLayout resets even if onNodesUpdate throws
      try {
        onNodesUpdate(() => updatedNodes);
        setLayoutVersion(v => v + 1);
      } finally {
        setIsApplyingLayout(false);
      }

      if (onAddHistoryAction) {
        onAddHistoryAction({
          type: 'layout',
          description: `Применён layout "${currentLayoutType}"`,
          undo: async () => {
            // O(1) Map lookup вместо O(n²) .find() в цикле
            const oldPosMap = new Map<number, { x: number; y: number }>();
            oldPositions.forEach(p => oldPosMap.set(p.id, { x: p.x, y: p.y }));

            const restoredNodes = rawNodes.map(node => {
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
  }, [layoutNodes, layoutEdges, rawNodes, currentLayoutType, onNodesUpdate, onAddHistoryAction]);

  const saveLayout = useCallback(async () => {
    const layoutObj = {
      nodes: rawNodes.map(n => ({
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
  }, [rawNodes]);

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
    layoutVersion,
  };
};
