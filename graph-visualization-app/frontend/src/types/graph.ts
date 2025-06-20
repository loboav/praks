export interface GraphObject {
    id: string;
    label: string;
    properties?: Record<string, any>;
}

export interface GraphRelation {
    id: string;
    source: string;
    target: string;
    type: string;
    properties?: Record<string, any>;
}

export interface Graph {
    objects: GraphObject[];
    relations: GraphRelation[];
}