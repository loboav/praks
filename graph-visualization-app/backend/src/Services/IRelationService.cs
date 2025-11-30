using GraphVisualizationApp.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Services
{
    /// <summary>
    /// Сервис для работы со связями графа
    /// </summary>
    public interface IRelationService
    {
        Task<List<GraphRelation>> GetRelationsAsync();
        Task<GraphRelation> GetRelationAsync(int id);
        Task<GraphRelation> CreateRelationAsync(GraphRelation rel);
        Task<GraphRelation> UpdateRelationAsync(GraphRelation rel);
        Task<bool> DeleteRelationAsync(int id);
        Task<int> UpdateRelationsBatchAsync(List<int> ids, Dictionary<string, object> fields);

        Task<List<RelationProperty>> GetRelationPropertiesAsync(int relationId);
        Task<RelationProperty> AddRelationPropertyAsync(RelationProperty prop);
    }
}
