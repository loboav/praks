namespace GraphVisualizationApp.Models
{
    public class ObjectType
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string? Description { get; set; }
        public string? Color { get; set; }
        public string? Icon { get; set; }
        public string? Shape { get; set; }
        public string? ImageUrl { get; set; }
        public ICollection<RelationType> RelationTypes { get; set; } = new List<RelationType>();
        public ICollection<GraphObject> Objects { get; set; } = new List<GraphObject>();
    }

    public class RelationType
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string? Description { get; set; }
        public int ObjectTypeId { get; set; }
        public ObjectType? ObjectType { get; set; }
        public string? Color { get; set; }
        public ICollection<GraphRelation> Relations { get; set; } = new List<GraphRelation>();
    }

    public class GraphObject
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public int ObjectTypeId { get; set; }
        public ObjectType? ObjectType { get; set; }
        public double? PositionX { get; set; }
        public double? PositionY { get; set; }
        public ICollection<ObjectProperty> Properties { get; set; } = new List<ObjectProperty>();
        public ICollection<GraphRelation> OutgoingRelations { get; set; } = new List<GraphRelation>();
        public ICollection<GraphRelation> IncomingRelations { get; set; } = new List<GraphRelation>();
    }

    public class ObjectProperty
    {
        public int Id { get; set; }
        public int ObjectId { get; set; }
        public GraphObject? Object { get; set; }
        public string? Key { get; set; }
        public string? Value { get; set; }
    }

    public class GraphRelation
    {
        public int Id { get; set; }
        public int Source { get; set; }
        public GraphObject? SourceObject { get; set; }
        public int Target { get; set; }
        public GraphObject? TargetObject { get; set; }
        public int RelationTypeId { get; set; }
        public RelationType? RelationType { get; set; }
        public ICollection<RelationProperty> Properties { get; set; } = new List<RelationProperty>();
    }

    public class RelationProperty
    {
        public int Id { get; set; }
        public int RelationId { get; set; }
        public GraphRelation? Relation { get; set; }
        public string? Key { get; set; }
        public string? Value { get; set; }
    }
}
