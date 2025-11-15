import { useState, useCallback } from 'react';
import { GraphObject, GraphRelation } from '../types/graph';
import { toast } from 'react-toastify';
import { apiClient } from '../utils/apiClient';
import {
  circularLayout,
  gridLayout,
  hierarchicalLayout,
  radialLayout
} from '../utils/layoutAlgorithms';

export type LayoutType = 'force' | 'circular' | 'hierarchical' | 'radial' | 'grid' | 'manual';

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
  onAddHistoryAction
}: UseLayoutManagerProps) => {
  const [currentLayoutType, setCurrentLayoutType] = useState<LayoutType>('manual');
  const [isApplyingLayout, setIsApplyingLayout] = useState(false);
  const [layout, setLayout] = useState<any>(null);

  const applyLayout = useCallback(() => {
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

    setTimeout(() => {
      let layoutResult;

      switch (currentLayoutType) {
        case 'hierarchical':
          toast.info('Применяется иерархический layout...');
          layoutResult = hierarchicalLayout(nodes, edges);
          break;
        case 'radial':
          toast.info('Применяется радиальный layout...');
          layoutResult = radialLayout(nodes, edges);
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

      const updatedNodes = nodes.map(node => {
        const newPos = layoutResult.nodes.find((n: any) => n.id === node.id);
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
            const restoredNodes = nodes.map(node => {
              const oldPos = oldPositions.find(p => p.id === node.id);
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
    }, 100);
  }, [nodes, edges, currentLayoutType, onNodesUpdate, onAddHistoryAction]);

  const saveLayout = useCallback(async () => {
    const layoutObj = {
      nodes: nodes.map((n) => ({
        id: n.id,
        x: n.PositionX ?? 0,
        y: n.PositionY ?? 0,
      }))
    };
    
    const res = await apiClient.post("/api/layout", { layoutJson: JSON.stringify(layoutObj) });
    
    if (res.ok) {
      toast.success("Сетка успешно сохранена!");
    } else {
      toast.error("Ошибка сохранения layout");
    }
  }, [nodes]);

  const loadLayout = useCallback(async () => {
    try {
      const response = await apiClient.get("/api/layout");
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
