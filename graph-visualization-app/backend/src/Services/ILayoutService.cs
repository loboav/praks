using GraphVisualizationApp.Models;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Services
{
    /// <summary>
    /// Сервис для работы с layouts (сохранение позиций узлов)
    /// </summary>
    public interface ILayoutService
    {
        Task<GraphLayout?> GetLayoutAsync(int? graphId = null, string? userId = null);
        Task<GraphLayout> SaveLayoutAsync(GraphLayout layout);
    }
}
