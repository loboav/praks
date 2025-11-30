using GraphVisualizationApp.Models;
using GraphVisualizationApp.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Editor,Admin")]
    public class RelationTypeController : ControllerBase
    {
        private readonly ITypeService _service;
        public RelationTypeController(ITypeService service) { _service = service; }

        [HttpGet]
        public async Task<ActionResult<List<RelationType>>> GetAll()
        {
            var types = await _service.GetRelationTypesAsync();
            return Ok(types);
        }

        [HttpPost]
        public async Task<ActionResult<RelationType>> Create(RelationType type)
        {
            var created = await _service.CreateRelationTypeAsync(type);
            return CreatedAtAction(nameof(GetAll), new { id = created.Id }, created);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteRelationTypeAsync(id);
            if (!result) return NotFound();
            return NoContent();
        }
    }
}
