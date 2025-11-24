
using GraphVisualizationApp.Models;
using GraphVisualizationApp.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Controllers
{
    [ApiController]
    [Route("api")]
    [Authorize]
    public class GraphController : ControllerBase
    {
        private readonly IGraphService _service;
        public GraphController(IGraphService service) { _service = service; }

        [HttpGet("dijkstra-path")]
        public async Task<IActionResult> FindShortestPathDijkstra([FromQuery] int fromId, [FromQuery] int toId)
        {
          
            var allObjects = await _service.GetObjectsAsync();
            var hasFrom = allObjects.Any(o => o.Id == fromId);
            var hasTo = allObjects.Any(o => o.Id == toId);
            if (!hasFrom || !hasTo)
            {
                var missing = new List<string>();
                if (!hasFrom) missing.Add("fromId");
                if (!hasTo) missing.Add("toId");
                return NotFound(new { reason = "missing_node", missing });
            }

            var result = await _service.FindShortestPathDijkstraAsync(fromId, toId);
            if (result == null || result.NodeIds == null || result.NodeIds.Count == 0)
            {
                
                var rels = await _service.GetRelationsAsync();
                return NotFound(new { reason = "no_path", fromId, toId, nodes = allObjects.Count, relations = rels.Count });
            }
            return Ok(new {
                nodeIds = result.NodeIds,
                edgeIds = result.EdgeIds,
                totalWeight = result.TotalWeight
            });
        }

        
        public class BatchUpdateRequest
        {
        public required List<int> Ids { get; set; }
        public required Dictionary<string, object> Fields { get; set; }
        }

        [HttpPost("objects/batch-update")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> BatchUpdateObjects([FromBody] BatchUpdateRequest req)
        {
            if (req == null || req.Ids == null || req.Ids.Count == 0 || req.Fields == null)
                return BadRequest();
            var updated = await _service.UpdateObjectsBatchAsync(req.Ids, req.Fields);
            return Ok(new { updated });
        }

        [HttpPost("relations/batch-update")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> BatchUpdateRelations([FromBody] BatchUpdateRequest req)
        {
            if (req == null || req.Ids == null || req.Ids.Count == 0 || req.Fields == null)
                return BadRequest();
            var updated = await _service.UpdateRelationsBatchAsync(req.Ids, req.Fields);
            return Ok(new { updated });
        }

        [HttpGet("graph")]
        [AllowAnonymous]
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
        [AllowAnonymous]
        public async Task<IActionResult> GetObjectTypes()
        {
            var types = await _service.GetObjectTypesAsync();
            var dtos = types.Select(GraphService.ToDto).ToList();
            return Ok(dtos);
        }

        [HttpPost("object-types")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> CreateObjectType([FromBody] ObjectType type)
        {
            var created = await _service.CreateObjectTypeAsync(type);
            return Ok(GraphService.ToDto(created));
        }

        [HttpDelete("object-types/{id}")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> DeleteObjectType(int id)
        {
            var ok = await _service.DeleteObjectTypeAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }

        [HttpGet("relation-types")]
        [AllowAnonymous]
        public async Task<IActionResult> GetRelationTypes()
        {
            var types = await _service.GetRelationTypesAsync();
            var dtos = types.Select(GraphService.ToDto).ToList();
            return Ok(dtos);
        }

        [HttpPost("relation-types")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> CreateRelationType([FromBody] RelationType type)
        {
            var created = await _service.CreateRelationTypeAsync(type);
            return Ok(GraphService.ToDto(created));
        }

        [HttpDelete("relation-types/{id}")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> DeleteRelationType(int id)
        {
            var ok = await _service.DeleteRelationTypeAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }

        [HttpGet("objects")]
        [AllowAnonymous]
        public async Task<IActionResult> GetObjects()
        {
            var objects = await _service.GetObjectsAsync();
            var dtos = objects.Select(GraphService.ToDto).ToList();
            return Ok(dtos);
        }

        [HttpPost("objects")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> CreateObject([FromBody] CreateObjectDto dto)
        {
            // Преобразуем DTO в GraphObject
            var obj = new GraphObject
            {
                Name = dto.Name,
                ObjectTypeId = dto.ObjectTypeId,
                Color = dto.Color,
                Icon = dto.Icon,
                Properties = dto.Properties?.Select(p => new ObjectProperty
                {
                    Key = p.Key,
                    Value = p.Value
                }).ToList() ?? new List<ObjectProperty>()
            };
            
            var created = await _service.CreateObjectAsync(obj);
            return Ok(GraphService.ToDto(created));
        }

        [HttpPut("objects/{id}")]
        [Authorize(Roles = "Editor,Admin")]
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
        [AllowAnonymous]
        public async Task<IActionResult> GetRelations()
        {
            var rels = await _service.GetRelationsAsync();
            var dtos = rels.Select(GraphService.ToDto).ToList();
            return Ok(dtos);
        }

        [HttpPost("relations")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> CreateRelation([FromBody] GraphRelation rel)
        {
            var created = await _service.CreateRelationAsync(rel);
            return Ok(GraphService.ToDto(created));
        }

        [HttpPut("relations/{id}")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> UpdateRelation(int id, [FromBody] GraphRelation rel)
        {
            if (rel == null || rel.Id != id)
                return BadRequest();
            var updated = await _service.UpdateRelationAsync(rel);
            if (updated == null)
                return NotFound();
            return Ok(GraphService.ToDto(updated));
        }

        [HttpDelete("objects/{id}")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> DeleteObject(int id)
        {
            var ok = await _service.DeleteObjectAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }

        [HttpDelete("relations/{id}")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> DeleteRelation(int id)
        {
            var ok = await _service.DeleteRelationAsync(id);
            if (!ok) return NotFound();
            return NoContent();
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