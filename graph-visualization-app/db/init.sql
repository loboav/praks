CREATE TABLE "ObjectTypes" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(100) NOT NULL,
    "Description" TEXT
);

CREATE TABLE "RelationTypes" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(100) NOT NULL,
    "Description" TEXT,
    "ObjectTypeId" INT NOT NULL REFERENCES "ObjectTypes"("Id")
);

CREATE TABLE "GraphObjects" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(100) NOT NULL,
    "ObjectTypeId" INT NOT NULL REFERENCES "ObjectTypes"("Id")
);

CREATE TABLE "ObjectProperties" (
    "Id" SERIAL PRIMARY KEY,
    "ObjectId" INT NOT NULL REFERENCES "GraphObjects"("Id") ON DELETE CASCADE,
    "Key" VARCHAR(100) NOT NULL,
    "Value" TEXT
);

CREATE TABLE "GraphRelations" (
    "Id" SERIAL PRIMARY KEY,
    "Source" INT NOT NULL REFERENCES "GraphObjects"("Id") ON DELETE CASCADE,
    "Target" INT NOT NULL REFERENCES "GraphObjects"("Id") ON DELETE CASCADE,
    "RelationTypeId" INT NOT NULL REFERENCES "RelationTypes"("Id")
);

CREATE TABLE "RelationProperties" (
    "Id" SERIAL PRIMARY KEY,
    "RelationId" INT NOT NULL REFERENCES "GraphRelations"("Id") ON DELETE CASCADE,
    "Key" VARCHAR(100) NOT NULL,
    "Value" TEXT
);