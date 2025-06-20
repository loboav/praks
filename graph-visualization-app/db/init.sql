CREATE TABLE GraphObject (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Properties JSONB
);

CREATE TABLE GraphRelation (
    Id SERIAL PRIMARY KEY,
    SourceId INT REFERENCES GraphObject(Id) ON DELETE CASCADE,
    TargetId INT REFERENCES GraphObject(Id) ON DELETE CASCADE,
    RelationType VARCHAR(255) NOT NULL,
    Properties JSONB
);