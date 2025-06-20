using System.Collections.Generic;

namespace GraphVisualizationApp.Models
{
    public class ObjectType
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
    }

    public class RelationType
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
    }

    public class GraphObject
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public ObjectType Type { get; set; }
        public Dictionary<string, string> Properties { get; set; }
    }

    public class GraphRelation
    {
        public int Id { get; set; }
        public GraphObject Source { get; set; }
        public GraphObject Target { get; set; }
        public RelationType RelationType { get; set; }
        public Dictionary<string, string> Properties { get; set; }
    }
}