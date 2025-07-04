
using GraphVisualizationApp.Models;
using GraphVisualizationApp.Services;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Controllers
{
    [ApiController]
    [Route("api")]
    public class GraphController : ControllerBase
    {
        private readonly IGraphService _service;
        public GraphController(IGraphService service) { _service = service; }

        // --- Batch update объектов ---
        public class BatchUpdateRequest
        {
        public required List<int> Ids { get; set; }
        public required Dictionary<string, object> Fields { get; set; }
        }

        [HttpPost("objects/batch-update")]
        public async Task<IActionResult> BatchUpdateObjects([FromBody] BatchUpdateRequest req)
        {
            if (req == null || req.Ids == null || req.Ids.Count == 0 || req.Fields == null)
                return BadRequest();
            var updated = await _service.UpdateObjectsBatchAsync(req.Ids, req.Fields);
            return Ok(new { updated });
        }

        [HttpPost("relations/batch-update")]
        public async Task<IActionResult> BatchUpdateRelations([FromBody] BatchUpdateRequest req)
        {
            if (req == null || req.Ids == null || req.Ids.Count == 0 || req.Fields == null)
                return BadRequest();
            var updated = await _service.UpdateRelationsBatchAsync(req.Ids, req.Fields);
            return Ok(new { updated });
        }

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
        public async Task<IActionResult> GetObjectTypes()
        {
            var types = await _service.GetObjectTypesAsync();
            var dtos = types.Select(GraphService.ToDto).ToList();
            return Ok(dtos);
        }

        [HttpPost("object-types")]
        public async Task<IActionResult> CreateObjectType([FromBody] ObjectType type)
        {
            var created = await _service.CreateObjectTypeAsync(type);
            return Ok(GraphService.ToDto(created));
        }

        [HttpGet("relation-types")]
        public async Task<IActionResult> GetRelationTypes()
        {
            var types = await _service.GetRelationTypesAsync();
            var dtos = types.Select(GraphService.ToDto).ToList();
            return Ok(dtos);
        }

        [HttpPost("relation-types")]
        public async Task<IActionResult> CreateRelationType([FromBody] RelationType type)
        {
            var created = await _service.CreateRelationTypeAsync(type);
            return Ok(GraphService.ToDto(created));
        }

        [HttpGet("objects")]
        public async Task<IActionResult> GetObjects()
        {
            var objects = await _service.GetObjectsAsync();
            var dtos = objects.Select(GraphService.ToDto).ToList();
            return Ok(dtos);
        }

        [HttpPost("objects")]
        public async Task<IActionResult> CreateObject([FromBody] GraphObject obj)
        {
            var created = await _service.CreateObjectAsync(obj);
            return Ok(GraphService.ToDto(created));
        }

        [HttpPut("objects/{id}")]
        public async Task<IActionResult> UpdateObject(int id, [FromBody] GraphObject obj)
        {
            if (obj == null || obj.Id != id)
                return BadRequest();
            var updated = await _service.UpdateObjectAsync(obj);
            if (updated == null)
                return NotFound();
            return Ok(GraphService.ToDto(updated));
        }

        [HttpGet("relations")]
        public async Task<IActionResult> GetRelations()
        {
            var rels = await _service.GetRelationsAsync();
            var dtos = rels.Select(GraphService.ToDto).ToList();
            return Ok(dtos);
        }

        [HttpPost("relations")]
        public async Task<IActionResult> CreateRelation([FromBody] GraphRelation rel)
        {
            var created = await _service.CreateRelationAsync(rel);
            return Ok(GraphService.ToDto(created));
        }

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