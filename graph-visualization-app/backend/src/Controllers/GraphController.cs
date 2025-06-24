using GraphVisualizationApp.Models;
using GraphVisualizationApp.Services;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GraphController : ControllerBase
    {
        private readonly IGraphService _service;
        public GraphController(IGraphService service) { _service = service; }

        [HttpGet("graph")]
        public async Task<IActionResult> GetGraph()
        {
            var graph = await _service.GetGraphAsync();
            return Ok(graph);
        }

        [HttpGet("get-object/{id}")]
        public async Task<ActionResult<GraphObject>> GetObject(int id)
        {
            var graphObject = await _service.GetObjectAsync(id);
            if (graphObject == null)
            {
                return NotFound();
            }
            return Ok(graphObject);
        }

        [HttpGet("get-relation/{id}")]
        public async Task<ActionResult<GraphRelation>> GetRelation(int id)
        {
            var graphRelation = await _service.GetRelationAsync(id);
            if (graphRelation == null)
            {
                return NotFound();
            }
            return Ok(graphRelation);
        }

        [HttpGet("find-path")]
        public async Task<ActionResult<IEnumerable<GraphObject>>> FindPath(int startId, int endId)
        {
            var path = await _service.FindPathAsync(startId, endId);
            if (path == null || path.Count == 0)
            {
                return NotFound();
            }
            return Ok(path);
        }

        [HttpGet("object-types")]
        public async Task<IActionResult> GetObjectTypes() => Ok(await _service.GetObjectTypesAsync());

        [HttpPost("object-types")]
        public async Task<IActionResult> CreateObjectType([FromBody] ObjectType type) => Ok(await _service.CreateObjectTypeAsync(type));

        [HttpGet("relation-types")]
        public async Task<IActionResult> GetRelationTypes() => Ok(await _service.GetRelationTypesAsync());

        [HttpPost("relation-types")]
        public async Task<IActionResult> CreateRelationType([FromBody] RelationType type) => Ok(await _service.CreateRelationTypeAsync(type));

        [HttpGet("objects")]
        public async Task<IActionResult> GetObjects() => Ok(await _service.GetObjectsAsync());

        [HttpPost("objects")]
        public async Task<IActionResult> CreateObject([FromBody] GraphObject obj) => Ok(await _service.CreateObjectAsync(obj));

        [HttpGet("relations")]
        public async Task<IActionResult> GetRelations() => Ok(await _service.GetRelationsAsync());

        [HttpPost("relations")]
        public async Task<IActionResult> CreateRelation([FromBody] GraphRelation rel) => Ok(await _service.CreateRelationAsync(rel));

        [HttpGet("object-properties/{objectId}")]
        public async Task<IActionResult> GetObjectProperties(int objectId) => Ok(await _service.GetObjectPropertiesAsync(objectId));

        [HttpPost("object-properties")]
        public async Task<IActionResult> AddObjectProperty([FromBody] ObjectProperty prop) => Ok(await _service.AddObjectPropertyAsync(prop));

        [HttpGet("relation-properties/{relationId}")]
        public async Task<IActionResult> GetRelationProperties(int relationId) => Ok(await _service.GetRelationPropertiesAsync(relationId));

        [HttpPost("relation-properties")]
        public async Task<IActionResult> AddRelationProperty([FromBody] RelationProperty prop) => Ok(await _service.AddRelationPropertyAsync(prop));

        [HttpGet("paths")]
        public async Task<IActionResult> FindPaths([FromQuery] int fromId, [FromQuery] int toId) => Ok(await _service.FindPathsAsync(fromId, toId));
    }
}