using System;
using System.Collections.Generic;
using System.Linq;
using GraphVisualizationApp.Models;

namespace GraphVisualizationApp.Algorithms
{
    /// <summary>
    /// A* алгоритм поиска кратчайшего пути с использованием эвристики
    /// </summary>
    public class AStarPathFinder
    {
        public class PathResult
        {
            public List<int> NodeIds { get; set; } = new();
            public List<int> EdgeIds { get; set; } = new();
            public int TotalWeight { get; set; }
            public int NodesVisited { get; set; }
        }

        public PathResult FindPath(
            List<GraphObject> nodes,
            List<GraphRelation> edges,
            int fromId,
            int toId,
            string heuristic = "euclidean")
        {
            var nodeDict = nodes.ToDictionary(n => n.Id);
            
            // Проверка существования узлов
            if (!nodeDict.ContainsKey(fromId) || !nodeDict.ContainsKey(toId))
            {
                return new PathResult { NodeIds = new List<int>(), EdgeIds = new List<int>(), TotalWeight = -1 };
            }

            // Проверка наличия координат для эвристики
            bool hasCoordinates = nodeDict[fromId].PositionX.HasValue && 
                                  nodeDict[fromId].PositionY.HasValue &&
                                  nodeDict[toId].PositionX.HasValue && 
                                  nodeDict[toId].PositionY.HasValue;

            if (!hasCoordinates)
            {
                // Fallback to Dijkstra если нет координат
                var dijkstra = new DijkstraPathFinder();
                var dijkstraResult = dijkstra.FindShortestPath(nodes, edges, fromId, toId);
                return new PathResult
                {
                    NodeIds = dijkstraResult.NodeIds,
                    EdgeIds = dijkstraResult.EdgeIds,
                    TotalWeight = dijkstraResult.TotalWeight,
                    NodesVisited = 0
                };
            }

            var openSet = new HashSet<int> { fromId };
            var cameFrom = new Dictionary<int, int>();
            var edgeFrom = new Dictionary<int, int>();
            var gScore = new Dictionary<int, double>();
            var fScore = new Dictionary<int, double>();

            foreach (var node in nodes)
            {
                gScore[node.Id] = double.MaxValue;
                fScore[node.Id] = double.MaxValue;
            }

            gScore[fromId] = 0;
            fScore[fromId] = Heuristic(nodeDict[fromId], nodeDict[toId], heuristic);

            int nodesVisited = 0;

            while (openSet.Count > 0)
            {
                // Найти узел с минимальным fScore
                var current = openSet.OrderBy(id => fScore[id]).First();
                nodesVisited++;

                if (current == toId)
                {
                    return ReconstructPath(cameFrom, edgeFrom, current, gScore, nodesVisited);
                }

                openSet.Remove(current);

                // Обработка соседей
                foreach (var edge in edges.Where(e => e.Source == current || e.Target == current))
                {
                    int neighbor = edge.Source == current ? edge.Target : edge.Source;
                    
                    int weight = GetEdgeWeight(edge);
                    double tentativeGScore = gScore[current] + weight;

                    if (tentativeGScore < gScore[neighbor])
                    {
                        cameFrom[neighbor] = current;
                        edgeFrom[neighbor] = edge.Id;
                        gScore[neighbor] = tentativeGScore;
                        fScore[neighbor] = gScore[neighbor] + Heuristic(nodeDict[neighbor], nodeDict[toId], heuristic);

                        if (!openSet.Contains(neighbor))
                            openSet.Add(neighbor);
                    }
                }
            }

            // Путь не найден
            return new PathResult { NodeIds = new List<int>(), EdgeIds = new List<int>(), TotalWeight = -1 };
        }

        private double Heuristic(GraphObject from, GraphObject to, string type)
        {
            double dx = (to.PositionX ?? 0) - (from.PositionX ?? 0);
            double dy = (to.PositionY ?? 0) - (from.PositionY ?? 0);

            return type switch
            {
                "manhattan" => Math.Abs(dx) + Math.Abs(dy),
                "euclidean" => Math.Sqrt(dx * dx + dy * dy),
                _ => Math.Sqrt(dx * dx + dy * dy)
            };
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

        private PathResult ReconstructPath(
            Dictionary<int, int> cameFrom,
            Dictionary<int, int> edgeFrom,
            int current,
            Dictionary<int, double> gScore,
            int nodesVisited)
        {
            var path = new List<int> { current };
            var edgePath = new List<int>();

            while (cameFrom.ContainsKey(current))
            {
                if (edgeFrom.ContainsKey(current))
                    edgePath.Insert(0, edgeFrom[current]);
                
                current = cameFrom[current];
                path.Insert(0, current);
            }

            return new PathResult
            {
                NodeIds = path,
                EdgeIds = edgePath,
                TotalWeight = (int)gScore[path.Last()],
                NodesVisited = nodesVisited
            };
        }
    }
}
