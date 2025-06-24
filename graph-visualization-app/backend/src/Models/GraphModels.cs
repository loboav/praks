namespace GraphVisualizationApp.Models
{
    public class ObjectType
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public ICollection<RelationType> RelationTypes { get; set; }
        public ICollection<GraphObject> Objects { get; set; }
    }

    public class RelationType
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public int ObjectTypeId { get; set; }
        public ObjectType ObjectType { get; set; }
        public ICollection<GraphRelation> Relations { get; set; }
    }

    public class GraphObject
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int ObjectTypeId { get; set; }
        public ObjectType ObjectType { get; set; }
        public ICollection<ObjectProperty> Properties { get; set; }
        public ICollection<GraphRelation> OutgoingRelations { get; set; }
        public ICollection<GraphRelation> IncomingRelations { get; set; }
    }

    public class ObjectProperty
    {
        public int Id { get; set; }
        public int ObjectId { get; set; }
        public GraphObject Object { get; set; }
        public string Key { get; set; }
        public string Value { get; set; }
    }

    public class GraphRelation
    {
        public int Id { get; set; }
        public int Source { get; set; }
        public GraphObject SourceObject { get; set; }
        public int Target { get; set; }
        public GraphObject TargetObject { get; set; }
        public int RelationTypeId { get; set; }
        public RelationType RelationType { get; set; }
        public ICollection<RelationProperty> Properties { get; set; }
    }

    public class RelationProperty
    {
        public int Id { get; set; }
        public int RelationId { get; set; }
        public GraphRelation Relation { get; set; }
        public string Key { get; set; }
        public string Value { get; set; }
    }
}
