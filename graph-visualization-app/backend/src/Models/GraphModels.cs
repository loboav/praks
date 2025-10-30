using System.Text.Json.Serialization;

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
        
        [JsonIgnore]
        public ICollection<RelationType> RelationTypes { get; set; } = new List<RelationType>();
        
        [JsonIgnore]
        public ICollection<GraphObject> Objects { get; set; } = new List<GraphObject>();
    }

    public class GraphLayout
    {
        public int Id { get; set; }
        public string? LayoutJson { get; set; } // JSON-строка с layout
        public int? GraphId { get; set; } // если есть несколько графов
        public string? UserId { get; set; } // если нужна поддержка пользователей
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class RelationType
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string? Description { get; set; }
        public int ObjectTypeId { get; set; }
        
        [JsonIgnore]
        public ObjectType? ObjectType { get; set; }
        
        public string? Color { get; set; }
        
        [JsonIgnore]
        public ICollection<GraphRelation> Relations { get; set; } = new List<GraphRelation>();
    }

    public class GraphObject
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public int ObjectTypeId { get; set; }
        
        [JsonIgnore]
        public ObjectType? ObjectType { get; set; }
        
        public double? PositionX { get; set; }
        public double? PositionY { get; set; }
        public ICollection<ObjectProperty> Properties { get; set; } = new List<ObjectProperty>();
        
        [JsonIgnore]
        public ICollection<GraphRelation> OutgoingRelations { get; set; } = new List<GraphRelation>();
        
        [JsonIgnore]
        public ICollection<GraphRelation> IncomingRelations { get; set; } = new List<GraphRelation>();
        
        public string? Color { get; set; }
        public string? Icon { get; set; }
    }

    public class ObjectProperty
    {
        public int Id { get; set; }
        public int ObjectId { get; set; }
        
        [JsonIgnore]
        public GraphObject? Object { get; set; }
        
        public string? Key { get; set; }
        public string? Value { get; set; }
    }

    public class GraphRelation
    {
        public int Id { get; set; }
        public int Source { get; set; }
        
        [JsonIgnore]
        public GraphObject? SourceObject { get; set; }
        
        public int Target { get; set; }
        
        [JsonIgnore]
        public GraphObject? TargetObject { get; set; }
        
        public int RelationTypeId { get; set; }
        
        [JsonIgnore]
        public RelationType? RelationType { get; set; }
        
        public ICollection<RelationProperty> Properties { get; set; } = new List<RelationProperty>();
        public string? Color { get; set; }
    }

    public class RelationProperty
    {
        public int Id { get; set; }
        public int RelationId { get; set; }
        
        [JsonIgnore]
        public GraphRelation? Relation { get; set; }
        
        public string? Key { get; set; }
        public string? Value { get; set; }
    }
}
