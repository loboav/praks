using System.Collections.Generic;

namespace GraphVisualizationApp.Models
{
    public class ObjectTypeDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
    }

    public class RelationTypeDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public int ObjectTypeId { get; set; }
    }

    public class GraphObjectDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int ObjectTypeId { get; set; }
        public Dictionary<string, string> Properties { get; set; }
    }

    public class GraphRelationDto
    {
        public int Id { get; set; }
        public int Source { get; set; }
        public int Target { get; set; }
        public int RelationTypeId { get; set; }
        public Dictionary<string, string> Properties { get; set; }
    }
}
