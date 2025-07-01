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
}

export interface GraphRelation {
    id: number;
    source: number;
    target: number;
    relationTypeId: number;
    relationType?: RelationType;
    properties: Record<string, string>;
}