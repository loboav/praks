import fs from 'fs';

// Mock types
interface GraphObject { id: number; name: string; PositionX?: number; PositionY?: number; }
interface GraphRelation { id: number; source: number; target: number; relationTypeId: number; }

// Dummy grid, circular, radial
function circularLayout(nodes: GraphObject[]) {
  const n = nodes.length;
  if (n === 0) return { nodes: [] };
  const nodeWidth = 200;
  if (n <= 50) {
    const radius = Math.max(250, (n * nodeWidth) / (2 * Math.PI));
    const centerX = radius + 100;
    const centerY = radius + 100;
    const angleStep = (2 * Math.PI) / n;
    return { nodes: nodes.map((node, i) => ({ id: node.id, x: centerX + radius * Math.cos(i * angleStep), y: centerY + radius * Math.sin(i * angleStep) })) };
  }
  const ringGap = 120; const firstRadius = 300; const result: any[] = [];
  const rings: number[][] = []; let remaining = n; let idx = 0; let ringIdx = 0;
  while (remaining > 0) {
    const radius = firstRadius + ringIdx * ringGap;
    const circumference = 2 * Math.PI * radius;
    const capacity = Math.max(1, Math.floor(circumference / nodeWidth));
    const count = Math.min(capacity, remaining);
    const ring: number[] = [];
    for (let i = 0; i < count; i++) { ring.push(idx++); }
    rings.push(ring);
    remaining -= count; ringIdx++;
  }
  const maxRadius = firstRadius + (rings.length - 1) * ringGap;
  const centerX = maxRadius + 200; const centerY = maxRadius + 200;
  rings.forEach((ring, rIdx) => {
    const radius = firstRadius + rIdx * ringGap;
    const angleStep = (2 * Math.PI) / ring.length;
    const angleOffset = rIdx % 2 === 0 ? 0 : angleStep / 2;
    ring.forEach((nodeIdx, i) => {
      const angle = i * angleStep + angleOffset;
      result.push({ id: nodes[nodeIdx].id, x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) });
    });
  });
  return { nodes: result };
}

function radialLayout(nodes: GraphObject[], edges: GraphRelation[]) {
  const centerX = 500; const centerY = 400;
  const findRoots = () => { const hasIncoming = new Set(edges.map(e => e.target)); return nodes.filter(n => !hasIncoming.has(n.id)); };
  const roots = findRoots();
  const centerNode = roots.length > 0 ? roots[0] : nodes[0];
  if (!centerNode) return { nodes: [] };
  const levels = new Map<number, number>(); const visited = new Set<number>();
  const assignLevels = (nodeId: number, level: number) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId); levels.set(nodeId, level);
    edges.filter(e => e.source === nodeId).forEach(e => assignLevels(e.target, level + 1));
  };
  assignLevels(centerNode.id, 0);
  nodes.forEach(node => { if (!levels.has(node.id)) levels.set(node.id, 1); });
  const nodesByLevel = new Map<number, number[]>();
  levels.forEach((level, nodeId) => { if (!nodesByLevel.has(level)) nodesByLevel.set(level, []); nodesByLevel.get(level)!.push(nodeId); });
  const result: any[] = []; let currentRadius = 0; const nodeWidth = 200; const nodeHeight = 100;
  const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);
  sortedLevels.forEach(level => {
    const nodeIds = nodesByLevel.get(level)!;
    if (level === 0) {
      result.push({ id: nodeIds[0], x: centerX, y: centerY });
      currentRadius += nodeHeight * 1.5;
    } else {
      const requiredCircumference = nodeIds.length * nodeWidth;
      const minRadiusForCircumference = requiredCircumference / (2 * Math.PI);
      const radius = Math.max(currentRadius, minRadiusForCircumference);
      currentRadius = radius + nodeHeight * 1.5;
      const angleStep = (2 * Math.PI) / nodeIds.length;
      nodeIds.forEach((nodeId, i) => {
        result.push({ id: nodeId, x: centerX + radius * Math.cos(i * angleStep), y: centerY + radius * Math.sin(i * angleStep) });
      });
    }
  });
  return { nodes: result };
}

function gridLayout(nodes: GraphObject[]) {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const spacing = 150; const startX = 100; const startY = 100;
  return { nodes: nodes.map((node, i) => ({ id: node.id, x: startX + (i % cols) * spacing, y: startY + Math.floor(i / cols) * spacing })) };
}

// create 900 nodes and 1100 edges
const n = 900;
const nodes = Array.from({length: n}).map((_, i) => ({ id: i, name: 'Node' + i }));
const edges = Array.from({length: 1100}).map((_, i) => ({ id: i, source: Math.floor(Math.random() * n), target: Math.floor(Math.random() * n), relationTypeId: 1 }));

try {
  let res = circularLayout(nodes);
  if (res.nodes.some(n => isNaN(n.x) || isNaN(n.y))) console.log("CIRCULAR HAS NAN!");
  else console.log("CIRCULAR OK!");
} catch(e) { console.log('circular error', e); }

try {
  let res = gridLayout(nodes);
  if (res.nodes.some(n => isNaN(n.x) || isNaN(n.y))) console.log("GRID HAS NAN!");
  else console.log("GRID OK!");
} catch(e) { console.log('grid error', e); }

try {
  let res = radialLayout(nodes, edges);
  if (res.nodes.some(n => isNaN(n.x) || isNaN(n.y))) console.log("RADIAL HAS NAN!");
  else console.log("RADIAL OK!");
} catch(e) { console.log('radial error', e); }
