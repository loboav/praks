import { GraphObject, GraphRelation } from '../types/graph';

export interface LayoutResult {
  nodes: Array<{ id: number; x: number; y: number }>;
}

export interface ForceDirectedOptions {
  iterations?: number;
  repulsion?: number;
  attraction?: number;
  damping?: number;
  centerGravity?: number;
  minDistance?: number;
}

export function forceDirectedLayout(
  nodes: GraphObject[],
  edges: GraphRelation[],
  options: ForceDirectedOptions = {}
): LayoutResult {
  const {
    iterations = 300,
    repulsion = 15000,
    attraction = 0.005,
    damping = 0.85,
    centerGravity = 0.05,
    minDistance = 150
  } = options;

  const positions = new Map<number, { x: number; y: number; vx: number; vy: number }>();
  
  nodes.forEach(node => {
    const existingX = node.PositionX ?? Math.random() * 800 + 100;
    const existingY = node.PositionY ?? Math.random() * 600 + 100;
    positions.set(node.id, {
      x: existingX,
      y: existingY,
      vx: 0,
      vy: 0
    });
  });

  const centerX = 500;
  const centerY = 400;

  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<number, { fx: number; fy: number }>();
    
    nodes.forEach(node => {
      forces.set(node.id, { fx: 0, fy: 0 });
    });

    nodes.forEach((nodeA, i) => {
      const posA = positions.get(nodeA.id)!;
      const forceA = forces.get(nodeA.id)!;

      nodes.forEach((nodeB, j) => {
        if (i >= j) return;
        
        const posB = positions.get(nodeB.id)!;
        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;

        let repulsionForce = repulsion / distSq;
        
        if (dist < minDistance) {
          repulsionForce *= 2;
        }
        
        const fx = (dx / dist) * repulsionForce;
        const fy = (dy / dist) * repulsionForce;

        forceA.fx -= fx;
        forceA.fy -= fy;
        
        const forceB = forces.get(nodeB.id)!;
        forceB.fx += fx;
        forceB.fy += fy;
      });

      const dx = centerX - posA.x;
      const dy = centerY - posA.y;
      forceA.fx += dx * centerGravity;
      forceA.fy += dy * centerGravity;
    });

    edges.forEach(edge => {
      const posA = positions.get(edge.source);
      const posB = positions.get(edge.target);
      
      if (!posA || !posB) return;

      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const attractionForce = attraction * dist;
      const fx = (dx / dist) * attractionForce;
      const fy = (dy / dist) * attractionForce;

      const forceA = forces.get(edge.source)!;
      const forceB = forces.get(edge.target)!;

      forceA.fx += fx;
      forceA.fy += fy;
      forceB.fx -= fx;
      forceB.fy -= fy;
    });

    nodes.forEach(node => {
      const pos = positions.get(node.id)!;
      const force = forces.get(node.id)!;

      pos.vx = (pos.vx + force.fx) * damping;
      pos.vy = (pos.vy + force.fy) * damping;

      pos.x += pos.vx;
      pos.y += pos.vy;
    });
  }

  return {
    nodes: Array.from(positions.entries()).map(([id, pos]) => ({
      id,
      x: pos.x,
      y: pos.y
    }))
  };
}

export function circularLayout(nodes: GraphObject[]): LayoutResult {
  const centerX = 500;
  const centerY = 400;
  const radius = Math.max(250, Math.min(400, 100 + nodes.length * 20));
  const angleStep = (2 * Math.PI) / nodes.length;

  return {
    nodes: nodes.map((node, i) => ({
      id: node.id,
      x: centerX + radius * Math.cos(i * angleStep),
      y: centerY + radius * Math.sin(i * angleStep)
    }))
  };
}

export function gridLayout(nodes: GraphObject[]): LayoutResult {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const spacing = 150;
  const startX = 100;
  const startY = 100;

  return {
    nodes: nodes.map((node, i) => ({
      id: node.id,
      x: startX + (i % cols) * spacing,
      y: startY + Math.floor(i / cols) * spacing
    }))
  };
}

export function hierarchicalLayout(
  nodes: GraphObject[],
  edges: GraphRelation[]
): LayoutResult {
  const levels = new Map<number, number>();
  const visited = new Set<number>();
  
  const findRoots = () => {
    const hasIncoming = new Set(edges.map(e => e.target));
    return nodes.filter(n => !hasIncoming.has(n.id));
  };

  const assignLevels = (nodeId: number, level: number) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    levels.set(nodeId, Math.max(levels.get(nodeId) || 0, level));
    
    edges
      .filter(e => e.source === nodeId)
      .forEach(e => assignLevels(e.target, level + 1));
  };

  const roots = findRoots();
  if (roots.length === 0 && nodes.length > 0) {
    assignLevels(nodes[0].id, 0);
  } else {
    roots.forEach(root => assignLevels(root.id, 0));
  }

  nodes.forEach(node => {
    if (!levels.has(node.id)) {
      levels.set(node.id, 0);
    }
  });

  const nodesByLevel = new Map<number, number[]>();
  levels.forEach((level, nodeId) => {
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(nodeId);
  });

  const levelHeight = 150;
  const startY = 100;
  const centerX = 500;

  const result: Array<{ id: number; x: number; y: number }> = [];

  nodesByLevel.forEach((nodeIds, level) => {
    const count = nodeIds.length;
    const spacing = Math.min(200, 800 / (count + 1));
    const startX = centerX - ((count - 1) * spacing) / 2;

    nodeIds.forEach((nodeId, i) => {
      result.push({
        id: nodeId,
        x: startX + i * spacing,
        y: startY + level * levelHeight
      });
    });
  });

  return { nodes: result };
}

export function radialLayout(
  nodes: GraphObject[],
  edges: GraphRelation[]
): LayoutResult {
  const centerX = 500;
  const centerY = 400;
  
  const findRoots = () => {
    const hasIncoming = new Set(edges.map(e => e.target));
    return nodes.filter(n => !hasIncoming.has(n.id));
  };

  const roots = findRoots();
  const centerNode = roots.length > 0 ? roots[0] : nodes[0];
  
  if (!centerNode) return { nodes: [] };

  const levels = new Map<number, number>();
  const visited = new Set<number>();

  const assignLevels = (nodeId: number, level: number) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    levels.set(nodeId, level);
    
    edges
      .filter(e => e.source === nodeId)
      .forEach(e => assignLevels(e.target, level + 1));
  };

  assignLevels(centerNode.id, 0);
  
  nodes.forEach(node => {
    if (!levels.has(node.id)) {
      levels.set(node.id, 1);
    }
  });

  const nodesByLevel = new Map<number, number[]>();
  levels.forEach((level, nodeId) => {
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(nodeId);
  });

  const result: Array<{ id: number; x: number; y: number }> = [];

  nodesByLevel.forEach((nodeIds, level) => {
    if (level === 0) {
      result.push({ id: nodeIds[0], x: centerX, y: centerY });
    } else {
      const radius = level * 120;
      const angleStep = (2 * Math.PI) / nodeIds.length;
      
      nodeIds.forEach((nodeId, i) => {
        result.push({
          id: nodeId,
          x: centerX + radius * Math.cos(i * angleStep),
          y: centerY + radius * Math.sin(i * angleStep)
        });
      });
    }
  });

  return { nodes: result };
}
