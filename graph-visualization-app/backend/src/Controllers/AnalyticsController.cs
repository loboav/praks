using System.Collections.Generic;
using System.Threading.Tasks;
using GraphVisualizationApp.Models;
using GraphVisualizationApp.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace GraphVisualizationApp.Controllers
{
    [ApiController]
    [Route("api/analytics")]
    [AllowAnonymous]
    public class AnalyticsController : ControllerBase
    {
        private readonly IAnalyticsService _service;
        public AnalyticsController(IAnalyticsService service) { _service = service; }

        [HttpGet("summary")]
        public async Task<ActionResult<AnalyticsSummaryDto>> GetSummary()
            => Ok(await _service.GetSummaryAsync());

        [HttpGet("node-metrics")]
        public async Task<ActionResult<List<NodeMetricsDto>>> GetNodeMetrics([FromQuery] bool closeness = false)
            => Ok(await _service.GetNodeMetricsAsync(closeness));

        [HttpGet("pagerank")]
        public async Task<ActionResult<List<PageRankEntryDto>>> GetPageRank([FromQuery] int iterations = 50, [FromQuery] double damping = 0.85)
            => Ok(await _service.GetPageRankAsync(iterations, damping));

        [HttpGet("communities")]
        public async Task<ActionResult<CommunitiesDto>> GetCommunities([FromQuery] int passes = 10)
            => Ok(await _service.DetectCommunitiesAsync(passes));
    }
}
