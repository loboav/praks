using GraphVisualizationApp.Models;

namespace GraphVisualizationApp.Services
{
    public interface IExportService
    {
        Task<string> ExportToJsonAsync();
        Task<string> ExportToGraphMLAsync();
        Task<(string nodesCsv, string edgesCsv)> ExportToCsvAsync();
    }
}
