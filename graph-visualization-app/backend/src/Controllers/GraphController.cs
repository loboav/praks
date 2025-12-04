
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
        private readonly IObjectService _objectService;
        private readonly IRelationService _relationService;
        private readonly ITypeService _typeService;
        private readonly IPathfindingService _pathfindingService;

        public GraphController(
            IObjectService objectService,
            IRelationService relationService,
            ITypeService typeService,
            IPathfindingService pathfindingService)
        {
            _objectService = objectService;
            _relationService = relationService;
            _typeService = typeService;
            _pathfindingService = pathfindingService;
        }

        [HttpGet("dijkstra-path")]
        public async Task<IActionResult> FindShortestPathDijkstra([FromQuery] int fromId, [FromQuery] int toId)
        {
            var allObjects = await _objectService.GetObjectsAsync();
            var hasFrom = allObjects.Any(o => o.Id == fromId);
            var hasTo = allObjects.Any(o => o.Id == toId);
            if (!hasFrom || !hasTo)
            {
                var missing = new List<string>();
                if (!hasFrom) missing.Add("fromId");
                if (!hasTo) missing.Add("toId");
                return NotFound(new { reason = "missing_node", missing });
            }

            var result = await _pathfindingService.FindShortestPathDijkstraAsync(fromId, toId);
            if (result == null || result.NodeIds == null || result.NodeIds.Count == 0)
            {
                var rels = await _relationService.GetRelationsAsync();
                return NotFound(new { reason = "no_path", fromId, toId, nodes = allObjects.Count, relations = rels.Count });
            }
            return Ok(new {
                nodeIds = result.NodeIds,
                edgeIds = result.EdgeIds,
                totalWeight = result.TotalWeight
            });
        }

        [HttpGet("astar-path")]
        public async Task<IActionResult> FindPathAStar(
            [FromQuery] int fromId, 
            [FromQuery] int toId,
            [FromQuery] string heuristic = "euclidean")
        {
            var allObjects = await _objectService.GetObjectsAsync();
            var hasFrom = allObjects.Any(o => o.Id == fromId);
            var hasTo = allObjects.Any(o => o.Id == toId);
            if (!hasFrom || !hasTo)
            {
                var missing = new List<string>();
                if (!hasFrom) missing.Add("fromId");
                if (!hasTo) missing.Add("toId");
                return NotFound(new { reason = "missing_node", missing });
            }

            var result = await _pathfindingService.FindPathAStarAsync(fromId, toId, heuristic);
            if (result == null || result.NodeIds == null || result.NodeIds.Count == 0)
            {
                var rels = await _relationService.GetRelationsAsync();
                return NotFound(new { reason = "no_path", fromId, toId, nodes = allObjects.Count, relations = rels.Count });
            }
            
            return Ok(new
            {
                nodeIds = result.NodeIds,
                edgeIds = result.EdgeIds,
                totalWeight = result.TotalWeight,
                nodesVisited = result.NodesVisited,
                algorithm = "astar",
                heuristic
            });
        }

        [HttpGet("k-shortest-paths")]
        public async Task<IActionResult> FindKShortestPaths(
            [FromQuery] int fromId,
            [FromQuery] int toId,
            [FromQuery] int k = 3)
        {
            if (k < 1 || k > 10)
                return BadRequest(new { error = "k must be between 1 and 10" });

            var allObjects = await _objectService.GetObjectsAsync();
            var hasFrom = allObjects.Any(o => o.Id == fromId);
            var hasTo = allObjects.Any(o => o.Id == toId);
            if (!hasFrom || !hasTo)
            {
                var missing = new List<string>();
                if (!hasFrom) missing.Add("fromId");
                if (!hasTo) missing.Add("toId");
                return NotFound(new { reason = "missing_node", missing });
            }

            var result = await _pathfindingService.FindKShortestPathsAsync(fromId, toId, k);
            if (result == null || result.Paths.Count == 0)
            {
                var rels = await _relationService.GetRelationsAsync();
                return NotFound(new { reason = "no_path", fromId, toId, nodes = allObjects.Count, relations = rels.Count });
            }
            
            return Ok(new
            {
                paths = result.Paths,
                requestedK = result.RequestedK,
                foundK = result.FoundK,
                algorithm = "k-shortest"
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
            var updated = await _objectService.UpdateObjectsBatchAsync(req.Ids, req.Fields);
            return Ok(new { updated });
        }

        [HttpPost("relations/batch-update")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> BatchUpdateRelations([FromBody] BatchUpdateRequest req)
        {
            if (req == null || req.Ids == null || req.Ids.Count == 0 || req.Fields == null)
                return BadRequest();
            var updated = await _relationService.UpdateRelationsBatchAsync(req.Ids, req.Fields);
            return Ok(new { updated });
        }

        [HttpGet("graph")]
        [AllowAnonymous]
        public async Task<IActionResult> GetGraph()
        {
            // Re-implemented GetGraphAsync logic here
            var objects = await _objectService.GetObjectsAsync();
            var relations = await _relationService.GetRelationsAsync();
            return Ok(new { Objects = objects, Relations = relations });
        }

        [HttpGet("get-object/{id}")]
        public async Task<ActionResult<GraphObject>> GetObject(int id)
        {
            var graphObject = await _objectService.GetObjectAsync(id);
            if (graphObject == null)
            {
                return NotFound();
            }
            return Ok(graphObject);
        }

        [HttpGet("get-relation/{id}")]
        public async Task<ActionResult<GraphRelation>> GetRelation(int id)
        {
            var graphRelation = await _relationService.GetRelationAsync(id);
            if (graphRelation == null)
            {
                return NotFound();
            }
            return Ok(graphRelation);
        }

        [HttpGet("find-path")]
        public async Task<ActionResult<IEnumerable<GraphObject>>> FindPath(int startId, int endId)
        {
            var path = await _pathfindingService.FindPathAsync(startId, endId);
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
            var types = await _typeService.GetObjectTypesAsync();
            var dtos = types.Select(DtoMapper.ToDto).ToList();
            return Ok(dtos);
        }

        [HttpPost("object-types")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> CreateObjectType([FromBody] ObjectType type)
        {
            var created = await _typeService.CreateObjectTypeAsync(type);
            return Ok(DtoMapper.ToDto(created));
        }

        [HttpDelete("object-types/{id}")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> DeleteObjectType(int id)
        {
            var ok = await _typeService.DeleteObjectTypeAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }

        [HttpGet("relation-types")]
        [AllowAnonymous]
        public async Task<IActionResult> GetRelationTypes()
        {
            var types = await _typeService.GetRelationTypesAsync();
            var dtos = types.Select(DtoMapper.ToDto).ToList();
            return Ok(dtos);
        }

        [HttpPost("relation-types")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> CreateRelationType([FromBody] RelationType type)
        {
            var created = await _typeService.CreateRelationTypeAsync(type);
            return Ok(DtoMapper.ToDto(created));
        }

        [HttpDelete("relation-types/{id}")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> DeleteRelationType(int id)
        {
            var ok = await _typeService.DeleteRelationTypeAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }

        [HttpGet("objects")]
        [AllowAnonymous]
        public async Task<IActionResult> GetObjects()
        {
            var objects = await _objectService.GetObjectsAsync();
            var dtos = objects.Select(DtoMapper.ToDto).ToList();
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
            
            var created = await _objectService.CreateObjectAsync(obj);
            return Ok(DtoMapper.ToDto(created));
        }

        [HttpPut("objects/{id}")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> UpdateObject(int id, [FromBody] GraphObject obj)
        {
            if (obj == null || obj.Id != id)
                return BadRequest();
            var updated = await _objectService.UpdateObjectAsync(obj);
            if (updated == null)
                return NotFound();
            return Ok(DtoMapper.ToDto(updated));
        }

        [HttpGet("relations")]
        [AllowAnonymous]
        public async Task<IActionResult> GetRelations()
        {
            var rels = await _relationService.GetRelationsAsync();
            var dtos = rels.Select(DtoMapper.ToDto).ToList();
            return Ok(dtos);
        }

        [HttpPost("relations")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> CreateRelation([FromBody] GraphRelation rel)
        {
            var created = await _relationService.CreateRelationAsync(rel);
            return Ok(DtoMapper.ToDto(created));
        }

        [HttpPut("relations/{id}")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> UpdateRelation(int id, [FromBody] GraphRelation rel)
        {
            if (rel == null || rel.Id != id)
                return BadRequest();
            var existing = await _relationService.GetRelationAsync(id);
            if (existing == null) return NotFound();
            rel.Source = existing.Source;
            rel.Target = existing.Target;
            var updated = await _relationService.UpdateRelationAsync(rel);
            if (updated == null)
                return NotFound();
            return Ok(DtoMapper.ToDto(updated));
        }

        [HttpDelete("objects/{id}")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> DeleteObject(int id)
        {
            var ok = await _objectService.DeleteObjectAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }

        [HttpDelete("relations/{id}")]
        [Authorize(Roles = "Editor,Admin")]
        public async Task<IActionResult> DeleteRelation(int id)
        {
            var ok = await _relationService.DeleteRelationAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }

        [HttpGet("object-properties/{objectId}")]
        public async Task<IActionResult> GetObjectProperties(int objectId) => Ok(await _objectService.GetObjectPropertiesAsync(objectId));

        [HttpPost("object-properties")]
        public async Task<IActionResult> AddObjectProperty([FromBody] ObjectProperty prop) => Ok(await _objectService.AddObjectPropertyAsync(prop));

        [HttpGet("relation-properties/{relationId}")]
        public async Task<IActionResult> GetRelationProperties(int relationId) => Ok(await _relationService.GetRelationPropertiesAsync(relationId));

        [HttpPost("relation-properties")]
        public async Task<IActionResult> AddRelationProperty([FromBody] RelationProperty prop) => Ok(await _relationService.AddRelationPropertyAsync(prop));

        [HttpGet("paths")]
        public async Task<IActionResult> FindPaths([FromQuery] int fromId, [FromQuery] int toId) => Ok(await _pathfindingService.FindPathsAsync(fromId, toId));
    }
}