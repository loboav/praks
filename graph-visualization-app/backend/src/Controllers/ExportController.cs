using GraphVisualizationApp.Services;
using Microsoft.AspNetCore.Mvc;
using System.IO.Compression;
using System.Text;

namespace GraphVisualizationApp.Controllers
{
    [ApiController]
    [Route("api/export")]
    public class ExportController : ControllerBase
    {
        private readonly IExportService _exportService;

        public ExportController(IExportService exportService)
        {
            _exportService = exportService;
        }

        [HttpGet("json")]
        public async Task<IActionResult> ExportJson()
        {
            var json = await _exportService.ExportToJsonAsync();
            var bytes = Encoding.UTF8.GetBytes(json);
            var fileName = $"graph_{DateTime.Now:yyyyMMdd_HHmmss}.json";
            
            return File(bytes, "application/json", fileName);
        }

        [HttpGet("graphml")]
        public async Task<IActionResult> ExportGraphML()
        {
            var xml = await _exportService.ExportToGraphMLAsync();
            var bytes = Encoding.UTF8.GetBytes(xml);
            var fileName = $"graph_{DateTime.Now:yyyyMMdd_HHmmss}.graphml";
            
            return File(bytes, "application/xml", fileName);
        }

        [HttpGet("csv")]
        public async Task<IActionResult> ExportCsv()
        {
            var (nodesCsv, edgesCsv) = await _exportService.ExportToCsvAsync();
            
            // Создаем ZIP архив с двумя файлами
            using var memoryStream = new MemoryStream();
            using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
            {
                // Windows-1251 для корректного отображения кириллицы в русском Excel
                Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
                var windows1251 = Encoding.GetEncoding("windows-1251");
                
                // Добавляем nodes.csv
                var nodesEntry = archive.CreateEntry("nodes.csv");
                using (var entryStream = nodesEntry.Open())
                using (var writer = new StreamWriter(entryStream, windows1251))
                {
                    await writer.WriteAsync(nodesCsv);
                }

                // Добавляем edges.csv
                var edgesEntry = archive.CreateEntry("edges.csv");
                using (var entryStream = edgesEntry.Open())
                using (var writer = new StreamWriter(entryStream, windows1251))
                {
                    await writer.WriteAsync(edgesCsv);
                }
            }

            memoryStream.Position = 0;
            var fileName = $"graph_{DateTime.Now:yyyyMMdd_HHmmss}.zip";
            
            return File(memoryStream.ToArray(), "application/zip", fileName);
        }

        [HttpGet("csv/nodes")]
        public async Task<IActionResult> ExportNodesOnly()
        {
            var (nodesCsv, _) = await _exportService.ExportToCsvAsync();
            var utf8WithBom = new UTF8Encoding(true);
            var bytes = utf8WithBom.GetBytes(nodesCsv);
            var fileName = $"nodes_{DateTime.Now:yyyyMMdd_HHmmss}.csv";
            
            return File(bytes, "text/csv", fileName);
        }

        [HttpGet("csv/edges")]
        public async Task<IActionResult> ExportEdgesOnly()
        {
            var (_, edgesCsv) = await _exportService.ExportToCsvAsync();
            var utf8WithBom = new UTF8Encoding(true);
            var bytes = utf8WithBom.GetBytes(edgesCsv);
            var fileName = $"edges_{DateTime.Now:yyyyMMdd_HHmmss}.csv";
            
            return File(bytes, "text/csv", fileName);
        }
    }
}
