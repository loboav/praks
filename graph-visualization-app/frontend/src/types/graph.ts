export interface PropertySchema {
  id: number;
  key: string;
  propertyType: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  required: boolean;
  defaultValue?: string;
  options?: string; // JSON массив для enum: '["Да","Нет"]'
}

export interface ObjectType {
  id: number;
  name: string;
  description?: string;
  propertySchemas?: PropertySchema[];
}

export interface RelationType {
  id: number;
  name: string;
  description?: string;
  objectTypeId: number;
  objectType?: ObjectType;
  propertySchemas?: PropertySchema[];
}

export interface GraphObject {
  id: number;
  name: string;
  objectTypeId: number;
  type?: ObjectType;
  properties: Record<string, string>;
  PositionX?: number;
  PositionY?: number;
  color?: string; // HEX или CSS-цвет
  icon?: string; // имя иконки или emoji
  // Свойства для свёрнутых групп (мета-узлов)
  isCollapsedGroup?: boolean; // Это мета-узел?
  _collapsedNodeIds?: number[]; // Узлы внутри группы
  _collapsedCount?: number; // Количество узлов
  _collapsedGroupId?: string; // ID группы для разворачивания
  _groupPropertyValue?: string; // Значение свойства группировки (напр. "Москва")
  _groupNodeNames?: string[]; // Имена первых N узлов для tooltip
}

export interface GraphRelation {
  id: number;
  source: number;
  target: number;
  relationTypeId: number;
  relationType?: RelationType;
  properties: Record<string, string>;
  color?: string; // HEX или CSS-цвет
  // Свойства для агрегированных рёбер (при группировке)
  _aggregatedEdgeCount?: number; // Количество оригинальных рёбер в группе
}

// Типы алгоритмов поиска пути
export type PathAlgorithm =
  | 'dijkstra' // Кратчайший путь (взвешенный)
  | 'astar' // A* (с эвристикой)
  | 'bfs' // Поиск в ширину
  | 'k-shortest' // K кратчайших путей
  | 'all-paths'; // Все пути (DFS)

export interface AlgorithmOption {
  id: PathAlgorithm;
  name: string;
  description: string;
  icon: string;
  requiresConfig?: boolean;
}
