import { circularLayout, gridLayout, radialLayout, hierarchicalLayout } from './src/utils/layoutAlgorithms';

const nodes = [
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
  { id: 3, name: 'C' }
] as any;

const edges = [
  { source: 1, target: 2 },
  { source: 2, target: 3 }
] as any;

console.log('circular:', circularLayout(nodes));
console.log('grid:', gridLayout(nodes));
console.log('radial:', radialLayout(nodes, edges));
console.log('hierarchical:', hierarchicalLayout(nodes, edges));
