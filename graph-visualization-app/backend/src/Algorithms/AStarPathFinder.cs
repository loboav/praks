
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
            Dictionary<int, GraphObject> nodeMap,
            Dictionary<int, List<GraphRelation>> adjacencyList,
            int fromId,
            int toId,
            string heuristic = "euclidean")
        {
            // Проверка существования узлов
            if (!nodeMap.ContainsKey(fromId) || !nodeMap.ContainsKey(toId))
            {
                return new PathResult { NodeIds = new List<int>(), EdgeIds = new List<int>(), TotalWeight = -1 };
            }

            // Проверка наличия координат для эвристики
            bool hasCoordinates = nodeMap[fromId].PositionX.HasValue && 
                                  nodeMap[fromId].PositionY.HasValue &&
                                  nodeMap[toId].PositionX.HasValue && 
                                  nodeMap[toId].PositionY.HasValue;

            if (!hasCoordinates)
            {
                // Откат к алгоритму Дейкстры, если нет координат
                // Повторно используем DijkstraPathFinder, но нужно передать все параметры корректно
                var dijkstra = new DijkstraPathFinder();
                // Создаем перечисление ID узлов, так как Дейкстре нужны ключи для инициализации (или проверки существования)
                var dijkstraResult = dijkstra.FindShortestPath(nodeMap.Keys, adjacencyList, fromId, toId);
                return new PathResult
                {
                    NodeIds = dijkstraResult.NodeIds,
                    EdgeIds = dijkstraResult.EdgeIds,
                    TotalWeight = dijkstraResult.TotalWeight,
                    NodesVisited = 0 
                };
            }

            var gScore = new Dictionary<int, double>();
            var cameFrom = new Dictionary<int, int>();
            var edgeFrom = new Dictionary<int, int>();
            
            // PriorityQueue хранит (nodeId, fScore)
            var pq = new PriorityQueue<int, double>();
            var visited = new HashSet<int>();

            foreach (var nodeId in nodeMap.Keys)
            {
                gScore[nodeId] = double.MaxValue;
            }

            gScore[fromId] = 0;
            double startFScore = Heuristic(nodeMap[fromId], nodeMap[toId], heuristic);
            pq.Enqueue(fromId, startFScore);

            int nodesVisited = 0;

            while (pq.Count > 0)
            {
                if (!pq.TryDequeue(out int current, out double currentFScore))
                    break;
                
                // Ленивая проверка удаления: если мы уже нашли лучший путь, пропускаем
                // Примечание: fScore может измениться, но для A* строгая монотонность обрабатывает это. 
                // Однако, стандартная PQ не поддерживает DecreaseKey, поэтому могут быть дубликаты.
                // Мы проверяем visited для закрытого множества.
                // A* с последовательной эвристикой не нуждается в повторном открытии узлов.
                
                if (current == toId)
                {
                    return ReconstructPath(cameFrom, edgeFrom, current, gScore, nodesVisited);
                }
                
                // Реализация закрытого множества (Closed Set)
                if (visited.Contains(current))
                    continue;

                visited.Add(current);
                nodesVisited++;

                if (adjacencyList.TryGetValue(current, out var edges))
                {
                     foreach (var edge in edges)
                     {
                        int neighbor = edge.Source == current ? edge.Target : edge.Source;
                        if (visited.Contains(neighbor)) continue;

                        int weight = GetEdgeWeight(edge);
                        double tentativeGScore = gScore[current] + weight;

                        if (tentativeGScore < gScore[neighbor])
                        {
                            cameFrom[neighbor] = current;
                            edgeFrom[neighbor] = edge.Id;
                            gScore[neighbor] = tentativeGScore;
                            double fScore = tentativeGScore + Heuristic(nodeMap[neighbor], nodeMap[toId], heuristic);
                            
                            pq.Enqueue(neighbor, fScore);
                        }
                     }
                }
            }

            // Путь не найден
            return new PathResult { NodeIds = new List<int>(), EdgeIds = new List<int>(), TotalWeight = -1 };
        }

        // Backward compatibility overload
        public PathResult FindPath(
            List<GraphObject> nodes,
            List<GraphRelation> edges,
            int fromId,
            int toId,
            string heuristic = "euclidean")
        {
            var nodeMap = nodes.ToDictionary(n => n.Id);
            var adjList = GraphUtils.BuildAdjacencyList(edges);
            return FindPath(nodeMap, adjList, fromId, toId, heuristic);
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
