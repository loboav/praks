using GraphVisualizationApp.Services;
using Microsoft.AspNetCore.Mvc;

namespace GraphVisualizationApp.Controllers
{
    [ApiController]
    [Route("api/timeline")]
    public class TimelineController : ControllerBase
    {
        private readonly ITimelineService _timelineService;

        public TimelineController(ITimelineService timelineService)
        {
            _timelineService = timelineService;
        }

        /// <summary>
        /// Получить статистику для Timeline (гистограмму событий по датам)
        /// </summary>
        [HttpGet("stats")]
        public async Task<ActionResult<TimelineStatsResponse>> GetTimelineStats()
        {
            var stats = await _timelineService.GetTimelineStatsAsync();
            return Ok(stats);
        }

        /// <summary>
        /// Получить границы временного диапазона (minDate, maxDate)
        /// </summary>
        [HttpGet("boundaries")]
        public async Task<ActionResult<TimelineBoundariesResponse>> GetTimelineBoundaries()
        {
            var boundaries = await _timelineService.GetTimelineBoundariesAsync();
            return Ok(boundaries);
        }
    }
}
