using System.Collections.Generic;

namespace GraphVisualizationApp.Models
{
    public class AnalyticsSummaryDto
    {
        public int NodeCount { get; set; }
        public int EdgeCount { get; set; }
        public double Density { get; set; }
        public int Diameter { get; set; }
        public int Components { get; set; }
        public List<int> ComponentSizes { get; set; } = new();
    }

    public class NodeMetricsDto
    {
        public int NodeId { get; set; }
        public int InDegree { get; set; }
        public int OutDegree { get; set; }
        public int Degree { get; set; }
        public double DegreeCentrality { get; set; }
        public double? ClosenessCentrality { get; set; }
        public double? BetweennessCentrality { get; set; }
    }

    public class PageRankEntryDto
    {
        public int NodeId { get; set; }
        public double Score { get; set; }
    }

    public class CommunitiesDto
    {
        public double Modularity { get; set; }
        public List<List<int>> Communities { get; set; } = new();
    }
}
