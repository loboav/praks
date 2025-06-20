using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using graph_visualization_app.Models;

namespace graph_visualization_app.Services
{
    public class GraphService
    {
        private readonly List<GraphObject> _graphObjects;
        private readonly List<GraphRelation> _graphRelations;

        public GraphService()
        {
            _graphObjects = new List<GraphObject>();
            _graphRelations = new List<GraphRelation>();
        }

        public Task<GraphObject> CreateObject(GraphObject graphObject)
        {
            _graphObjects.Add(graphObject);
            return Task.FromResult(graphObject);
        }

        public Task<GraphRelation> CreateRelation(GraphRelation graphRelation)
        {
            _graphRelations.Add(graphRelation);
            return Task.FromResult(graphRelation);
        }

        public Task<GraphObject> GetObjectById(string id)
        {
            var graphObject = _graphObjects.FirstOrDefault(o => o.Id == id);
            return Task.FromResult(graphObject);
        }

        public Task<List<GraphRelation>> GetRelationsByObjectId(string objectId)
        {
            var relations = _graphRelations.Where(r => r.SourceId == objectId || r.TargetId == objectId).ToList();
            return Task.FromResult(relations);
        }

        public Task<List<GraphObject>> GetAllObjects()
        {
            return Task.FromResult(_graphObjects);
        }

        public Task<List<GraphRelation>> GetAllRelations()
        {
            return Task.FromResult(_graphRelations);
        }

        public Task<List<GraphObject>> FindPath(string startId, string endId)
        {
            // Implement pathfinding logic here
            return Task.FromResult(new List<GraphObject>());
        }
    }
}