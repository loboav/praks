import { Position, Node } from '@xyflow/react';

// Вычисляет пересечение линии "от центра до центра" с границей узла
function getIntersection(source: Node, target: Node) {
  const sourceWidth = source.measured?.width ?? source.width ?? 120;
  const sourceHeight = source.measured?.height ?? source.height ?? 120;
  
  const targetWidth = target.measured?.width ?? target.width ?? 120;
  const targetHeight = target.measured?.height ?? target.height ?? 120;

  // Абсолютная позиция
  const sx = (source as any).positionAbsolute?.x ?? source.position.x;
  const sy = (source as any).positionAbsolute?.y ?? source.position.y;
  
  const tx = (target as any).positionAbsolute?.x ?? target.position.x;
  const ty = (target as any).positionAbsolute?.y ?? target.position.y;

  // Центры
  const cx = sx + sourceWidth / 2;
  const cy = sy + sourceHeight / 2;
  const ctx = tx + targetWidth / 2;
  const cty = ty + targetHeight / 2;

  const dx = ctx - cx;
  const dy = cty - cy;

  // Проверка на круглый узел (предполагаем, что круги, если width == height и <= 150)
  const isCircle = sourceWidth === sourceHeight && sourceWidth <= 150;

  if (isCircle) {
      const radius = sourceWidth / 2;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) return { x: cx, y: cy };
      return { x: cx + (dx / length) * radius, y: cy + (dy / length) * radius };
  }

  // Пересечение прямоугольника
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx === 0 && absDy === 0) return { x: cx, y: cy };

  let x = cx;
  let y = cy;

  if (absDx * sourceHeight > absDy * sourceWidth) {
    // Пересечение с левой или правой границей
    const signX = Math.sign(dx);
    x = cx + (signX * sourceWidth) / 2;
    y = cy + (signX * sourceWidth / 2) * (dy / dx);
  } else {
    // Пересечение с верхней или нижней границей
    const signY = Math.sign(dy);
    y = cy + (signY * sourceHeight) / 2;
    x = cx + (signY * sourceHeight / 2) * (dx / dy);
  }

  return { x, y };
}

// Определяет с какой стороны выходит/заходит связь для SmoothStep маршрутизатора
function getEdgePosition(node: Node, intersectionPoint: { x: number; y: number }) {
  const width = node.measured?.width ?? node.width ?? 120;
  const height = node.measured?.height ?? node.height ?? 120;
  
  const nx = (node as any).positionAbsolute?.x ?? node.position.x;
  const ny = (node as any).positionAbsolute?.y ?? node.position.y;
  
  const px = intersectionPoint.x;
  const py = intersectionPoint.y;

  const dxLeft = Math.abs(px - nx);
  const dxRight = Math.abs(px - (nx + width));
  const dyTop = Math.abs(py - ny);
  const dyBottom = Math.abs(py - (ny + height));

  // Выбираем минимальную дистанцию чтобы понять на какой мы грани
  const min = Math.min(dxLeft, dxRight, dyTop, dyBottom);

  if (min === dxLeft) return Position.Left;
  if (min === dxRight) return Position.Right;
  if (min === dyTop) return Position.Top;
  return Position.Bottom;
}

// Возвращает параметры для Floating Edge (динамические координаты)
export function getEdgeParams(sourceNode: Node, targetNode: Node) {
  const sourceIntersectionPoint = getIntersection(sourceNode, targetNode);
  const targetIntersectionPoint = getIntersection(targetNode, sourceNode);

  const sourcePos = getEdgePosition(sourceNode, sourceIntersectionPoint);
  const targetPos = getEdgePosition(targetNode, targetIntersectionPoint);

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos,
    targetPos,
  };
}
