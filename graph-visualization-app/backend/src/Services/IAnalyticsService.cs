using System.Collections.Generic;
using System.Threading.Tasks;
using GraphVisualizationApp.Models;

namespace GraphVisualizationApp.Services
{
    public interface IAnalyticsService
    {
        Task<AnalyticsSummaryDto> GetSummaryAsync();
        Task<List<NodeMetricsDto>> GetNodeMetricsAsync(bool includeCloseness = false, bool includeBetweenness = false);
        Task<List<PageRankEntryDto>> GetPageRankAsync(int iterations = 50, double damping = 0.85);
        Task<CommunitiesDto> DetectCommunitiesAsync(int maxPasses = 10);
    }
}
