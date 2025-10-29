using System.Collections.Generic;
using System.Linq;
using GraphVisualizationApp.Models;

namespace GraphVisualizationApp.Algorithms
{
    public class DijkstraPathFinder
    {
        public class PathResult
        {
            public List<int> NodeIds { get; set; } = new();
            public List<int> EdgeIds { get; set; } = new();
            public int TotalWeight { get; set; }
        }

        
        public PathResult FindShortestPath(List<GraphObject> nodes, List<GraphRelation> edges, int fromId, int toId)
        {
            var dist = new Dictionary<int, int>();
            var prev = new Dictionary<int, int?>();
            var edgePrev = new Dictionary<int, int?>();
            var queue = new HashSet<int>(nodes.Select(n => n.Id));

            foreach (var node in nodes)
                dist[node.Id] = int.MaxValue;
            dist[fromId] = 0;

            while (queue.Count > 0)
            {
                int u = queue.OrderBy(id => dist[id]).First();
                queue.Remove(u);

                if (u == toId || dist[u] == int.MaxValue)
                    break;

                // Обрабатываем рёбра в обоих направлениях (граф как неориентированный для поиска пути)
                foreach (var edge in edges.Where(e => e.Source == u || e.Target == u))
                {
                    // Определяем соседнюю вершину
                    int v = (edge.Source == u) ? edge.Target : edge.Source;
                    
                    int weight = 1;
                    if (edge.Properties != null)
                    {
                        var weightProp = edge.Properties.FirstOrDefault(p => (p.Key == "weight" || p.Key == "Weight") && !string.IsNullOrEmpty(p.Value));
                        if (weightProp != null && int.TryParse(weightProp.Value, out var w))
                            weight = w;
                    }
                    int alt = dist[u] + weight;
                    if (alt < dist[v])
                    {
                        dist[v] = alt;
                        prev[v] = u;
                        edgePrev[v] = edge.Id;
                    }
                }
            }

            var path = new List<int>();
            var edgePath = new List<int>();
           
            int? current = toId;
            if (!dist.ContainsKey(toId) || dist[toId] == int.MaxValue)
            {
                
                return new PathResult { NodeIds = new List<int>(), EdgeIds = new List<int>(), TotalWeight = -1 };
            }
            while (current != null)
            {
                
                path.Insert(0, current.Value);
              
                if (edgePrev.ContainsKey(current.Value) && edgePrev[current.Value].HasValue)
                {
                    edgePath.Insert(0, edgePrev[current.Value]!.Value);
                }
               
                if (prev.ContainsKey(current.Value) && prev[current.Value].HasValue)
                {
                    current = prev[current.Value];
                }
                else
                {
                    break;
                }
            }
            
            if (path.Count == 0 || path[0] != fromId)
            {
                return new PathResult { NodeIds = new List<int>(), EdgeIds = new List<int>(), TotalWeight = -1 };
            }

            return new PathResult
            {
                NodeIds = path,
                EdgeIds = edgePath,
                TotalWeight = dist.ContainsKey(toId) ? dist[toId] : -1
            };
        }
    }
}
