using GraphVisualizationApp.Models;
using GraphVisualizationApp.Algorithms;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Services
{
    /// <summary>
    /// Сервис для алгоритмов поиска пути
    /// </summary>
    public interface IPathfindingService
    {
        // Новые алгоритмы
        Task<DijkstraPathFinder.PathResult> FindShortestPathDijkstraAsync(int fromId, int toId);
        Task<AStarPathFinder.PathResult> FindPathAStarAsync(int fromId, int toId, string heuristic = "euclidean");
        Task<YenKShortestPaths.KPathsResult> FindKShortestPathsAsync(int fromId, int toId, int k = 3);
        
        // Legacy методы (для обратной совместимости)
        Task<List<GraphObject>> FindPathAsync(int startId, int endId);
        Task<List<List<int>>> FindPathsAsync(int fromId, int toId);
    }
}
