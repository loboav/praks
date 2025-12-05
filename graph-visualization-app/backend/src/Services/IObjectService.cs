using GraphVisualizationApp.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Services
{
    /// <summary>
    /// Сервис для работы с объектами графа
    /// </summary>
    public interface IObjectService
    {
        Task<List<GraphObject>> GetObjectsAsync();
        Task<GraphObject?> GetObjectAsync(int id);
        Task<GraphObject> CreateObjectAsync(GraphObject obj);
        Task<GraphObject> UpdateObjectAsync(GraphObject obj);
        Task<bool> DeleteObjectAsync(int id);
        Task<int> UpdateObjectsBatchAsync(List<int> ids, Dictionary<string, object> fields);

        Task<List<ObjectProperty>> GetObjectPropertiesAsync(int objectId);
        Task<ObjectProperty> AddObjectPropertyAsync(ObjectProperty prop);
    }
}
