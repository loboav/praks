using GraphVisualizationApp.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Services
{
    /// <summary>
    /// Сервис для работы с типами объектов и типами связей
    /// </summary>
    public interface ITypeService
    {
        // Object Types
        Task<List<ObjectType>> GetObjectTypesAsync();
        Task<ObjectType> CreateObjectTypeAsync(ObjectType type);
        Task<bool> DeleteObjectTypeAsync(int id);

        // Relation Types
        Task<List<RelationType>> GetRelationTypesAsync();
        Task<RelationType> CreateRelationTypeAsync(RelationType type);
        Task<bool> DeleteRelationTypeAsync(int id);
    }
}
