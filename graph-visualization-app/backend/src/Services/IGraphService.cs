using GraphVisualizationApp.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Services
{
    public interface IGraphService
    {
        Task<List<ObjectType>> GetObjectTypesAsync();
        Task<ObjectType> CreateObjectTypeAsync(ObjectType type);
        Task<bool> DeleteObjectTypeAsync(int id);
        Task<List<RelationType>> GetRelationTypesAsync();
        Task<RelationType> CreateRelationTypeAsync(RelationType type);
        Task<List<GraphObject>> GetObjectsAsync();
        Task<GraphObject> CreateObjectAsync(GraphObject obj);
        Task<List<GraphRelation>> GetRelationsAsync();
        Task<GraphRelation> CreateRelationAsync(GraphRelation rel);
        Task<List<ObjectProperty>> GetObjectPropertiesAsync(int objectId);
        Task<ObjectProperty> AddObjectPropertyAsync(ObjectProperty prop);
        Task<List<RelationProperty>> GetRelationPropertiesAsync(int relationId);
        Task<RelationProperty> AddRelationPropertyAsync(RelationProperty prop);
        Task<List<List<int>>> FindPathsAsync(int fromId, int toId);

        Task<object> GetGraphAsync();
        Task<GraphObject> GetObjectAsync(int id);
        Task<GraphRelation> GetRelationAsync(int id);
        Task<List<GraphObject>> FindPathAsync(int startId, int endId);


        Task<GraphObject> UpdateObjectAsync(GraphObject obj);


        Task<int> UpdateObjectsBatchAsync(List<int> ids, Dictionary<string, object> fields);
        Task<int> UpdateRelationsBatchAsync(List<int> ids, Dictionary<string, object> fields);
    }
}
