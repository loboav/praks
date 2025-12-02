using System.Collections.Generic;
using System.Linq;
using GraphVisualizationApp.Models;

namespace GraphVisualizationApp.Algorithms
{
    /// <summary>
    /// Алгоритм Yen для поиска K кратчайших путей
    /// </summary>
    public class YenKShortestPaths
    {
        public class KPathsResult
        {
            public List<PathInfo> Paths { get; set; } = new();
            public int RequestedK { get; set; }
            public int FoundK { get; set; }
        }

        public class PathInfo
        {
            public List<int> NodeIds { get; set; } = new();
            public List<int> EdgeIds { get; set; } = new();
            public int TotalWeight { get; set; }
        }

        public KPathsResult FindKShortestPaths(
            List<GraphObject> nodes,
            List<GraphRelation> edges,
            int fromId,
            int toId,
            int k = 3)
        {
            var result = new KPathsResult { RequestedK = k };
            var dijkstra = new DijkstraPathFinder();

            // Найти первый кратчайший путь
            var firstPath = dijkstra.FindShortestPath(nodes, edges, fromId, toId);
            if (firstPath.NodeIds.Count == 0)
                return result;

            result.Paths.Add(new PathInfo
            {
                NodeIds = firstPath.NodeIds,
                EdgeIds = firstPath.EdgeIds,
                TotalWeight = firstPath.TotalWeight
            });

            var candidates = new List<PathInfo>();

            for (int i = 1; i < k; i++)
            {
                var previousPath = result.Paths[i - 1];

                for (int j = 0; j < previousPath.NodeIds.Count - 1; j++)
                {
                    var spurNode = previousPath.NodeIds[j];
                    var rootPath = previousPath.NodeIds.Take(j + 1).ToList();

                    // Удалить рёбра, которые используются в предыдущих путях с таким же корнем
                    var removedEdges = new List<GraphRelation>();
                    foreach (var path in result.Paths)
                    {
                        if (path.NodeIds.Count > j + 1 && 
                            path.NodeIds.Take(j + 1).SequenceEqual(rootPath))
                        {
                            var edgeToRemove = edges.FirstOrDefault(e =>
                                (e.Source == path.NodeIds[j] && e.Target == path.NodeIds[j + 1]) ||
                                (e.Target == path.NodeIds[j] && e.Source == path.NodeIds[j + 1]));
                            if (edgeToRemove != null && !removedEdges.Contains(edgeToRemove))
                                removedEdges.Add(edgeToRemove);
                        }
                    }

                    // Также удалить узлы из rootPath (кроме spurNode)
                    var removedNodes = rootPath.Take(rootPath.Count - 1).ToList();

                    // Временно удалить рёбра и узлы
                    var tempEdges = edges.Where(e => 
                        !removedEdges.Contains(e) &&
                        !removedNodes.Contains(e.Source) &&
                        !removedNodes.Contains(e.Target)
                    ).ToList();

                    var tempNodes = nodes.Where(n => !removedNodes.Contains(n.Id)).ToList();

                    // Найти путь от spurNode до toId
                    var spurPath = dijkstra.FindShortestPath(tempNodes, tempEdges, spurNode, toId);

                    if (spurPath.NodeIds.Count > 0)
                    {
                        // Объединить rootPath и spurPath
                        var totalPath = rootPath.Take(rootPath.Count - 1)
                            .Concat(spurPath.NodeIds)
                            .ToList();

                        var totalEdges = new List<int>();
                        
                        // Добавить рёбра из rootPath
                        for (int idx = 0; idx < rootPath.Count - 1; idx++)
                        {
                            var edge = edges.FirstOrDefault(e =>
                                (e.Source == rootPath[idx] && e.Target == rootPath[idx + 1]) ||
                                (e.Target == rootPath[idx] && e.Source == rootPath[idx + 1]));
                            if (edge != null)
                                totalEdges.Add(edge.Id);
                        }
                        
                        // Добавить рёбра из spurPath
                        totalEdges.AddRange(spurPath.EdgeIds);

                        // Вычислить общий вес
                        int totalWeight = 0;
                        foreach (var edgeId in totalEdges)
                        {
                            var edge = edges.FirstOrDefault(e => e.Id == edgeId);
                            if (edge != null)
                            {
                                totalWeight += GetEdgeWeight(edge);
                            }
                        }

                        var candidatePath = new PathInfo
                        {
                            NodeIds = totalPath,
                            EdgeIds = totalEdges,
                            TotalWeight = totalWeight
                        };

                        // Проверить, что такого пути ещё нет
                        if (!candidates.Any(c => c.NodeIds.SequenceEqual(candidatePath.NodeIds)) &&
                            !result.Paths.Any(p => p.NodeIds.SequenceEqual(candidatePath.NodeIds)))
                        {
                            candidates.Add(candidatePath);
                        }
                    }
                }

                if (candidates.Count == 0)
                    break;

                // Выбрать кратчайший из кандидатов
                var nextPath = candidates.OrderBy(p => p.TotalWeight).First();
                result.Paths.Add(nextPath);
                candidates.Remove(nextPath);
            }

            result.FoundK = result.Paths.Count;
            return result;
        }

        private int GetEdgeWeight(GraphRelation edge)
        {
            if (edge.Properties != null)
            {
                var weightProp = edge.Properties.FirstOrDefault(p => 
                    (p.Key == "weight" || p.Key == "Weight") && !string.IsNullOrEmpty(p.Value));
                if (weightProp != null && int.TryParse(weightProp.Value, out var w))
                    return w;
            }
            return 1;
        }
    }
}
