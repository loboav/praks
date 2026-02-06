using System.Collections.Generic;
using GraphVisualizationApp.Models;

namespace GraphVisualizationApp.Algorithms
{
    public static class GraphUtils
    {
        /// <summary>
        /// Строит список смежности для неориентированного графа из списка ребер.
        /// Каждое ребро добавляется и к Source, и к Target.
        /// </summary>
        public static Dictionary<int, List<GraphRelation>> BuildAdjacencyList(IEnumerable<GraphRelation> edges)
        {
            var adj = new Dictionary<int, List<GraphRelation>>();

            foreach (var edge in edges)
            {
                if (!adj.ContainsKey(edge.Source)) adj[edge.Source] = new List<GraphRelation>();
                if (!adj.ContainsKey(edge.Target)) adj[edge.Target] = new List<GraphRelation>();

                adj[edge.Source].Add(edge);
                
                // Избегаем дублирования петель, если source == target
                if (edge.Source != edge.Target)
                {
                    adj[edge.Target].Add(edge);
                }
            }
            return adj;
        }
    }
}
