using System;
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

        /// <summary>
        /// Поиск кратчайшего пути с использованием стандартного алгоритма Дейкстры с PriorityQueue и списком смежности.
        /// Сложность: O(E + V log V)
        /// </summary>
        public PathResult FindShortestPath(IEnumerable<int> nodeIds, Dictionary<int, List<GraphRelation>> adjacencyList, int fromId, int toId)
        {
            var dist = new Dictionary<int, int>();
            var prev = new Dictionary<int, int>();
            var edgePrev = new Dictionary<int, int>();
            var pq = new PriorityQueue<int, int>();
            var visited = new HashSet<int>();

            // Инициализация расстояний
            foreach (var nodeId in nodeIds)
            {
                dist[nodeId] = int.MaxValue;
            }

            if (!dist.ContainsKey(fromId))
            {
                 // Обработка случая, когда fromId отсутствует в nodeIds
                 return new PathResult { TotalWeight = -1 };
            }

            dist[fromId] = 0;
            pq.Enqueue(fromId, 0);

            while (pq.Count > 0)
            {
                // Эффективно получаем узел с минимальным расстоянием
                if (!pq.TryDequeue(out int u, out int currentDist))
                    break;
                
                // Если мы нашли более короткий путь к u до обработки, пропускаем устаревшие записи
                if (currentDist > dist[u])
                    continue;
                
                if (u == toId)
                    break;
                
                visited.Add(u);

                if (adjacencyList.TryGetValue(u, out var edges))
                {
                    foreach (var edge in edges)
                    {
                        var v = (edge.Source == u) ? edge.Target : edge.Source;
                        
                        // Оптимизация: Не посещать закрытые узлы
                        // (стандартная оптимизация Дейкстры, хотя строго проверяется вычислением dist)
                        
                        int weight = 1;
                        if (edge.Properties != null)
                        {
                            var weightProp = edge.Properties.FirstOrDefault(p => (p.Key == "weight" || p.Key == "Weight") && !string.IsNullOrEmpty(p.Value));
                            if (weightProp != null && int.TryParse(weightProp.Value, out var w))
                                weight = w;
                        }

                        int newDist = dist[u] + weight;
                        
                        // Если найден более короткий путь к v
                        if (dist.ContainsKey(v) && newDist < dist[v])
                        {
                            dist[v] = newDist;
                            prev[v] = u;
                            edgePrev[v] = edge.Id;
                            pq.Enqueue(v, newDist);
                        }
                    }
                }
            }

            // Восстановление пути
            return ReconstructPath(prev, edgePrev, fromId, toId, dist);
        }

        // Backward compatibility overload
        public PathResult FindShortestPath(List<GraphObject> nodes, List<GraphRelation> edges, int fromId, int toId)
        {
            var adjacencyList = GraphUtils.BuildAdjacencyList(edges);
            var nodeIds = nodes.Select(n => n.Id);
            return FindShortestPath(nodeIds, adjacencyList, fromId, toId);
        }

        private PathResult ReconstructPath(Dictionary<int, int> prev, Dictionary<int, int> edgePrev, int fromId, int toId, Dictionary<int, int> dist)
        {
            if (!dist.ContainsKey(toId) || dist[toId] == int.MaxValue)
            {
                return new PathResult { TotalWeight = -1 };
            }

            var path = new List<int>();
            var edgePath = new List<int>();
            int current = toId;

            while (current != fromId)
            {
                path.Insert(0, current);

                if (edgePrev.TryGetValue(current, out int edgeId))
                {
                    edgePath.Insert(0, edgeId);
                }

                if (prev.TryGetValue(current, out int p))
                {
                    current = p;
                }
                else
                {
                    // Should not happen if reachable
                    return new PathResult { TotalWeight = -1 };
                }
            }
            path.Insert(0, fromId);

            return new PathResult
            {
                NodeIds = path,
                EdgeIds = edgePath,
                TotalWeight = dist[toId]
            };
        }
    }
}
