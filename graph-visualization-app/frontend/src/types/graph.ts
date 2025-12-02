export interface ObjectType {
    id: number;
    name: string;
    description?: string;
}

export interface RelationType {
    id: number;
    name: string;
    description?: string;
    objectTypeId: number;
    objectType?: ObjectType;
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
    icon?: string;  // имя иконки или emoji
}

export interface GraphRelation {
    id: number;
    source: number;
    target: number;
    relationTypeId: number;
    relationType?: RelationType;
    properties: Record<string, string>;
    color?: string; // HEX или CSS-цвет
}

// Типы алгоритмов поиска пути
export type PathAlgorithm =
    | 'dijkstra'      // Кратчайший путь (взвешенный)
    | 'astar'         // A* (с эвристикой)
    | 'bfs'           // Поиск в ширину
    | 'k-shortest'    // K кратчайших путей
    | 'all-paths';    // Все пути (DFS)

export interface AlgorithmOption {
    id: PathAlgorithm;
    name: string;
    description: string;
    icon: string;
    requiresConfig?: boolean;
}