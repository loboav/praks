using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using graph_visualization_app.Models;
using graph_visualization_app.Services;

namespace graph_visualization_app.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GraphController : ControllerBase
    {
        private readonly GraphService _graphService;

        public GraphController(GraphService graphService)
        {
            _graphService = graphService;
        }

        [HttpPost("create-object")]
        public async Task<IActionResult> CreateObject([FromBody] GraphObject graphObject)
        {
            await _graphService.CreateObjectAsync(graphObject);
            return CreatedAtAction(nameof(GetObject), new { id = graphObject.Id }, graphObject);
        }

        [HttpPost("create-relation")]
        public async Task<IActionResult> CreateRelation([FromBody] GraphRelation graphRelation)
        {
            await _graphService.CreateRelationAsync(graphRelation);
            return CreatedAtAction(nameof(GetRelation), new { id = graphRelation.Id }, graphRelation);
        }

        [HttpGet("get-object/{id}")]
        public async Task<ActionResult<GraphObject>> GetObject(int id)
        {
            var graphObject = await _graphService.GetObjectAsync(id);
            if (graphObject == null)
            {
                return NotFound();
            }
            return Ok(graphObject);
        }

        [HttpGet("get-relation/{id}")]
        public async Task<ActionResult<GraphRelation>> GetRelation(int id)
        {
            var graphRelation = await _graphService.GetRelationAsync(id);
            if (graphRelation == null)
            {
                return NotFound();
            }
            return Ok(graphRelation);
        }

        [HttpGet("find-path")]
        public async Task<ActionResult<IEnumerable<GraphObject>>> FindPath(int startId, int endId)
        {
            var path = await _graphService.FindPathAsync(startId, endId);
            if (path == null || path.Count == 0)
            {
                return NotFound();
            }
            return Ok(path);
        }
    }
}