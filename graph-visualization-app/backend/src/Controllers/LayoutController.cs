using GraphVisualizationApp.Models;
using GraphVisualizationApp.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Controllers
{
    [ApiController]
    [Route("api/layout")]
    [Authorize]
    public class LayoutController : ControllerBase
    {
        private readonly IGraphService _service;
        public LayoutController(IGraphService service) { _service = service; }

        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<GraphLayout?>> Get([FromQuery] int? graphId = null, [FromQuery] string? userId = null)
        {
            var layout = await _service.GetLayoutAsync(graphId, userId);
            if (layout == null) return NotFound();
            return Ok(layout);
        }

        [HttpPost]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<ActionResult<GraphLayout>> Save([FromBody] GraphLayout layout)
        {
            var saved = await _service.SaveLayoutAsync(layout);
            return Ok(saved);
        }
    }
}
