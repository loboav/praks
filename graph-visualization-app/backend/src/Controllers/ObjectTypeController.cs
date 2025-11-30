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
    public class ObjectTypeController : ControllerBase
    {
        private readonly ITypeService _service;
        public ObjectTypeController(ITypeService service) { _service = service; }

        [HttpGet]
        public async Task<ActionResult<List<ObjectType>>> GetAll()
        {
            var types = await _service.GetObjectTypesAsync();
            return Ok(types);
        }

        [HttpPost]
        public async Task<ActionResult<ObjectType>> Create(ObjectType type)
        {
            var created = await _service.CreateObjectTypeAsync(type);
            return CreatedAtAction(nameof(GetAll), new { id = created.Id }, created);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteObjectTypeAsync(id);
            if (!result)
                return NotFound();
            return NoContent();
        }
    }
}
