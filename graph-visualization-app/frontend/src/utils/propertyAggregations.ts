import { GraphObject } from '../types/graph';

export interface PropertyStats {
  property: string;
  type: 'number' | 'string' | 'date';
  count: number;
  min?: number;
  max?: number;
  avg?: number;
  sum?: number;
  firstDate?: string;
  lastDate?: string;
}

export interface PropertyMetadata {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  uniqueValues: any[];
}

export function extractPropertyMetadata(nodes: GraphObject[]): PropertyMetadata[] {
  const propValues: Record<string, Set<any>> = {};

  nodes.forEach(node => {
    if (node.properties) {
      Object.entries(node.properties).forEach(([key, value]) => {
        if (!propValues[key]) propValues[key] = new Set();
        if (value !== null && value !== undefined && value !== '') {
          propValues[key].add(value);
        }
      });
    }
  });

  return Object.entries(propValues).map(([key, valueSet]) => {
    const values = Array.from(valueSet);
    const isBoolean = values.length > 0 && values.every(v => typeof v === 'boolean' || v === 'true' || v === 'false' || v === true || v === false);
    const isNumber = !isBoolean && values.length > 0 && values.every(v => !isNaN(Number(v)) && typeof v !== 'boolean');
    const isDate = !isBoolean && !isNumber && values.length > 0 && values.every(v => 
      typeof v === 'string' && !isNaN(Date.parse(v)) && v.includes('-') && v.length >= 8
    );

    let type: 'string' | 'number' | 'date' | 'boolean' = 'string';
    if (isBoolean) type = 'boolean';
    else if (isNumber) type = 'number';
    else if (isDate) type = 'date';

    if (type === 'number') {
      values.sort((a, b) => Number(a) - Number(b));
    } else {
      values.sort();
    }

    return {
      name: key,
      type,
      uniqueValues: values
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export function computeSelectedNodesStats(nodes: GraphObject[]): PropertyStats[] {
  if (!nodes || nodes.length === 0) return [];

  const propertyValues: Record<string, any[]> = {};

  nodes.forEach(node => {
    if (node.properties) {
      Object.entries(node.properties).forEach(([key, value]) => {
        if (!propertyValues[key]) propertyValues[key] = [];
        propertyValues[key].push(value);
      });
    }
  });

  const stats: PropertyStats[] = [];

  Object.entries(propertyValues).forEach(([key, values]) => {
    const validValues = values.filter(v => v !== null && v !== undefined && v !== '');
    if (validValues.length === 0) return;

    const isNumber = validValues.every(v => !isNaN(Number(v)) && typeof v !== 'boolean');
    const isDate = validValues.every(v => typeof v === 'string' && !isNaN(Date.parse(v)) && v.includes('-') && v.length >= 8);

    if (isNumber) {
      const nums = validValues.map(Number);
      stats.push({
        property: key,
        type: 'number',
        count: validValues.length,
        min: Math.min(...nums),
        max: Math.max(...nums),
        sum: nums.reduce((a, b) => a + b, 0),
        avg: +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)
      });
    } else if (isDate) {
      const dates = validValues.map(v => new Date(v).getTime()).filter(t => !isNaN(t));
      if (dates.length > 0) {
        stats.push({
          property: key,
          type: 'date',
          count: validValues.length,
          firstDate: new Date(Math.min(...dates)).toLocaleDateString(),
          lastDate: new Date(Math.max(...dates)).toLocaleDateString()
        });
      } else {
        stats.push({ property: key, type: 'string', count: validValues.length });
      }
    } else {
      stats.push({
        property: key,
        type: 'string',
        count: validValues.length
      });
    }
  });

  return stats;
}
