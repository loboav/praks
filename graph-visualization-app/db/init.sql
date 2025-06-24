-- Типы объектов
CREATE TABLE object_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- Типы связей
CREATE TABLE relation_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    object_type_id INT NOT NULL REFERENCES object_types(id)
);

-- Объекты графа
CREATE TABLE graph_objects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    object_type_id INT NOT NULL REFERENCES object_types(id)
);

-- Свойства объектов
CREATE TABLE object_properties (
    id SERIAL PRIMARY KEY,
    object_id INT NOT NULL REFERENCES graph_objects(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value TEXT
);

-- Связи графа
CREATE TABLE graph_relations (
    id SERIAL PRIMARY KEY,
    source INT NOT NULL REFERENCES graph_objects(id) ON DELETE CASCADE,
    target INT NOT NULL REFERENCES graph_objects(id) ON DELETE CASCADE,
    relation_type_id INT NOT NULL REFERENCES relation_types(id)
);

-- Свойства связей
CREATE TABLE relation_properties (
    id SERIAL PRIMARY KEY,
    relation_id INT NOT NULL REFERENCES graph_relations(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value TEXT
);