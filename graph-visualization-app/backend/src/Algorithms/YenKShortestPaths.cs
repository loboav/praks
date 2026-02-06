
using System;
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

            // Построение начального списка смежности
            var adjacencyList = GraphUtils.BuildAdjacencyList(edges);
            var nodeIds = nodes.Select(n => n.Id).ToHashSet();

            // Найти первый кратчайший путь
            var firstPath = dijkstra.FindShortestPath(nodeIds, adjacencyList, fromId, toId);
            if (firstPath.NodeIds.Count == 0)
                return result;

            result.Paths.Add(new PathInfo
            {
                NodeIds = firstPath.NodeIds,
                EdgeIds = firstPath.EdgeIds,
                TotalWeight = firstPath.TotalWeight
            });

            var candidates = new PriorityQueue<PathInfo, int>();
            // Также поддерживаем набор хешей для проверки уникальности
            var candidateHashes = new HashSet<string>();

            for (int i = 1; i < k; i++)
            {
                var previousPath = result.Paths[i - 1];

                // Узел ответвления (spur node) проходит от первого узла до предпоследнего в предыдущем k-кратчайшем пути.
                for (int j = 0; j < previousPath.NodeIds.Count - 1; j++)
                {
                    var spurNode = previousPath.NodeIds[j];
                    var rootPath = previousPath.NodeIds.Take(j + 1).ToList();
                    
                    // Ребра и узлы для временного удаления
                    var removedEdges = new List<GraphRelation>();
                    var removedNodes = new List<int>();

                    // 1. Удалить ребра, которые являются частью предыдущих кратчайших путей, имеющих тот же корневой путь
                    foreach (var path in result.Paths)
                    {
                        if (path.NodeIds.Count > j + 1 && 
                            path.NodeIds.Take(j + 1).SequenceEqual(rootPath))
                        {
                            int u = path.NodeIds[j];
                            int v = path.NodeIds[j + 1];

                            // Найти и удалить ребро (u, v) и (v, u) из списка смежности
                            if (adjacencyList.ContainsKey(u))
                            {
                                // Нам нужно найти конкретное используемое ребро. 
                                // В идеале мы должны использовать EdgeIds, но здесь ищем по связности
                                var edgeToObject = adjacencyList[u].FirstOrDefault(e => 
                                    (e.Source == u && e.Target == v) || (e.Target == u && e.Source == v));
                                
                                if (edgeToObject != null)
                                {
                                    RemoveEdgeFromAdjacencyList(adjacencyList, edgeToObject);
                                    removedEdges.Add(edgeToObject);
                                }
                            }
                        }
                    }

                    // 2. Удалить узлы из rootPath (кроме spurNode), чтобы не зациклиться обратно
                    // "Удалить" означает просто гарантировать, что Дейкстра их не посетит.
                    // Наша реализация Дейкстры принимает 'nodeIds'. 
                    // Мы можем изменить набор nodeIds, передаваемый в Дейкстру.
                    var currentStepNodeIds = new HashSet<int>(nodeIds);
                    foreach (var rootNode in rootPath.Take(rootPath.Count - 1))
                    {
                        currentStepNodeIds.Remove(rootNode);
                    }

                    // 3. Вычислить путь от spurNode до toId (путь ответвления)
                    var spurPathResult = dijkstra.FindShortestPath(currentStepNodeIds, adjacencyList, spurNode, toId);

                    if (spurPathResult.NodeIds.Count > 0)
                    {
                        // Объединенный путь
                        var totalPath = new List<int>(rootPath.Take(rootPath.Count - 1));
                        totalPath.AddRange(spurPathResult.NodeIds);

                        // Восстановить общий вес и ребра
                        int totalWeight = 0;
                        var totalEdges = new List<int>();

                        // Ребра из корневого пути
                        // Нам нужно снова найти ребра, так как мы не храним их удобно в списке rootPath
                        // Но мы можем просто скопировать ребра из previousPath
                        if (previousPath.EdgeIds.Count >= j)
                        {
                             totalEdges.AddRange(previousPath.EdgeIds.Take(j));
                        }
                        
                        totalEdges.AddRange(spurPathResult.EdgeIds);

                        // Пересчитать вес
                        foreach(var eid in totalEdges)
                        {
                            var e = edges.FirstOrDefault(x => x.Id == eid); 
                            if (e != null) totalWeight += GetEdgeWeight(e);
                        }

                        var candidatePath = new PathInfo
                        {
                            NodeIds = totalPath,
                            EdgeIds = totalEdges,
                            TotalWeight = totalWeight
                        };
                        
                        // Уникальный ключ пути
                        string pathKey = string.Join(",", totalPath);

                        if (!candidateHashes.Contains(pathKey))
                        {
                            candidates.Enqueue(candidatePath, totalWeight);
                            candidateHashes.Add(pathKey);
                        }
                    }

                    // ВОССТАНОВЛЕНИЕ СОСТОЯНИЯ ГРАФА
                    // 1. Восстановить ребра
                    foreach (var edge in removedEdges)
                    {
                         AddEdgeToAdjacencyList(adjacencyList, edge);
                    }
                    // 2. Узлы восстанавливаются просто сбросом currentStepNodeIds
                }

                if (candidates.Count == 0)
                    break;
                
                // Получить лучшего кандидата
                if (candidates.TryDequeue(out var bestCandidate, out _))
                {
                     // Гарантируем, что не добавляем дубликаты путей, если они были сгенерированы несколько раз
                     result.Paths.Add(bestCandidate);
                }
                else
                {
                    break;
                }
            }

            result.FoundK = result.Paths.Count;
            return result;
        }

        private void RemoveEdgeFromAdjacencyList(Dictionary<int, List<GraphRelation>> adj, GraphRelation edge)
        {
            if (adj.ContainsKey(edge.Source)) adj[edge.Source].Remove(edge);
            if (edge.Source != edge.Target && adj.ContainsKey(edge.Target)) adj[edge.Target].Remove(edge);
        }

        private void AddEdgeToAdjacencyList(Dictionary<int, List<GraphRelation>> adj, GraphRelation edge)
        {
            if (!adj.ContainsKey(edge.Source)) adj[edge.Source] = new List<GraphRelation>();
            adj[edge.Source].Add(edge);
            
            if (edge.Source != edge.Target)
            {
                if (!adj.ContainsKey(edge.Target)) adj[edge.Target] = new List<GraphRelation>();
                adj[edge.Target].Add(edge);
            }
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
