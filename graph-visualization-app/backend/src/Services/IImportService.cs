using GraphVisualizationApp.Models;

namespace GraphVisualizationApp.Services
{
    public interface IImportService
    {
        Task<ImportResult> ImportFromJsonAsync(string json);
        Task<ImportResult> ImportFromGraphMLAsync(string xml);
    }

    public class ImportResult
    {
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
        public int ObjectsImported { get; set; }
        public int RelationsImported { get; set; }
        public int ObjectTypesImported { get; set; }
        public int RelationTypesImported { get; set; }
    }
}
