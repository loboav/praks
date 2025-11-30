using GraphVisualizationApp.Models;
using GraphVisualizationApp.Algorithms;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Services
{
    /// <summary>
    /// Сервис для алгоритмов поиска пути
    /// </summary>
    public class PathfindingService : IPathfindingService
    {
        private readonly IObjectService _objectService;
        private readonly IRelationService _relationService;

        public PathfindingService(
            IObjectService objectService,
            IRelationService relationService)
        {
            _objectService = objectService;
            _relationService = relationService;
        }

        // Поиск кратчайшего пути по Дейкстре (оптимизировано с использованием кэша)
        public async Task<DijkstraPathFinder.PathResult> FindShortestPathDijkstraAsync(int fromId, int toId)
        {
            // Используем кэшированные данные вместо прямых запросов к БД
            var nodes = await _objectService.GetObjectsAsync();
            var edges = await _relationService.GetRelationsAsync();
            
            // Преобразуем свойства связей
            var edgeList = edges.Select(e => new GraphRelation
            {
                Id = e.Id,
                Source = e.Source,
                Target = e.Target,
                RelationTypeId = e.RelationTypeId,
                Color = e.Color,
                Properties = e.Properties?.ToList() ?? new List<RelationProperty>()
            }).ToList();
            
            var nodeList = nodes.Select(n => new GraphObject
            {
                Id = n.Id,
                Name = n.Name,
                ObjectTypeId = n.ObjectTypeId,
                Color = n.Color,
                Icon = n.Icon,
                Properties = n.Properties?.ToList() ?? new List<ObjectProperty>()
            }).ToList();
            
            var finder = new DijkstraPathFinder();
            return finder.FindShortestPath(nodeList, edgeList, fromId, toId);
        }

        // Legacy BFS метод (для обратной совместимости)
        public async Task<List<GraphObject>> FindPathAsync(int startId, int endId)
        {
            var nodes = await _objectService.GetObjectsAsync();
            var edges = await _relationService.GetRelationsAsync();
            
            var visited = new HashSet<int>();
            var queue = new Queue<int>();
            var prev = new Dictionary<int, int>();

            queue.Enqueue(startId);
            visited.Add(startId);

            while (queue.Count > 0)
            {
                var current = queue.Dequeue();
                if (current == endId)
                {
                    var path = new List<int>();
                    var node = endId;
                    while (node != startId)
                    {
                        path.Insert(0, node);
                        node = prev[node];
                    }
                    path.Insert(0, startId);
                    return nodes.Where(n => path.Contains(n.Id)).OrderBy(n => path.IndexOf(n.Id)).ToList();
                }

                var neighbors = edges.Where(e => e.Source == current || e.Target == current)
                    .Select(e => e.Source == current ? e.Target : e.Source);

                foreach (var neighbor in neighbors)
                {
                    if (!visited.Contains(neighbor))
                    {
                        visited.Add(neighbor);
                        prev[neighbor] = current;
                        queue.Enqueue(neighbor);
                    }
                }
            }

            return new List<GraphObject>();
        }

        // Legacy DFS метод (для обратной совместимости)
        public async Task<List<List<int>>> FindPathsAsync(int fromId, int toId)
        {
            var nodes = await _objectService.GetObjectsAsync();
            var edges = await _relationService.GetRelationsAsync();
            
            var result = new List<List<int>>();
            var currentPath = new List<int> { fromId };
            var visited = new HashSet<int> { fromId };

            DfsAllPaths(fromId, toId, edges.ToList(), currentPath, visited, result, maxPaths: 10);
            return result;
        }

        private void DfsAllPaths(
            int current,
            int target,
            List<GraphRelation> edges,
            List<int> currentPath,
            HashSet<int> visited,
            List<List<int>> result,
            int maxPaths)
        {
            if (result.Count >= maxPaths) return;

            if (current == target)
            {
                result.Add(new List<int>(currentPath));
                return;
            }

            var neighbors = edges.Where(e => e.Source == current || e.Target == current)
                .Select(e => e.Source == current ? e.Target : e.Source);

            foreach (var neighbor in neighbors)
            {
                if (!visited.Contains(neighbor))
                {
                    currentPath.Add(neighbor);
                    visited.Add(neighbor);
                    DfsAllPaths(neighbor, target, edges, currentPath, visited, result, maxPaths);
                    currentPath.RemoveAt(currentPath.Count - 1);
                    visited.Remove(neighbor);
                }
            }
        }
    }
}
