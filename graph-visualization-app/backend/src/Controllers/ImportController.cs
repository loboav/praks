using GraphVisualizationApp.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text;

namespace GraphVisualizationApp.Controllers
{
    [ApiController]
    [Route("api/import")]
    [Authorize(Roles = "Editor,Admin")]
    public class ImportController : ControllerBase
    {
        private readonly IImportService _importService;

        public ImportController(IImportService importService)
        {
            _importService = importService;
        }

        [HttpPost("json")]
        public async Task<IActionResult> ImportJson([FromBody] ImportRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Data))
            {
                return BadRequest(new { error = "Данные для импорта не предоставлены" });
            }

            var result = await _importService.ImportFromJsonAsync(request.Data);

            if (result.Success)
            {
                return Ok(new
                {
                    success = true,
                    message = $"Импорт завершён успешно",
                    objectsImported = result.ObjectsImported,
                    relationsImported = result.RelationsImported,
                    objectTypesImported = result.ObjectTypesImported,
                    relationTypesImported = result.RelationTypesImported
                });
            }
            else
            {
                return BadRequest(new
                {
                    success = false,
                    error = result.ErrorMessage
                });
            }
        }

        [HttpPost("graphml")]
        public async Task<IActionResult> ImportGraphML([FromBody] ImportRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Data))
            {
                return BadRequest(new { error = "Данные для импорта не предоставлены" });
            }

            var result = await _importService.ImportFromGraphMLAsync(request.Data);

            if (result.Success)
            {
                return Ok(new
                {
                    success = true,
                    message = $"Импорт завершён успешно",
                    objectsImported = result.ObjectsImported,
                    relationsImported = result.RelationsImported,
                    objectTypesImported = result.ObjectTypesImported,
                    relationTypesImported = result.RelationTypesImported
                });
            }
            else
            {
                return BadRequest(new
                {
                    success = false,
                    error = result.ErrorMessage
                });
            }
        }
    }

    public class ImportRequest
    {
        public string Data { get; set; } = string.Empty;
    }
}
