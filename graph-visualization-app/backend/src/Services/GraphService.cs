using GraphVisualizationApp.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Services
{
    public class GraphService : IGraphService
    {
        private readonly GraphDbContext _db;
        public GraphService(GraphDbContext db) { _db = db; }

        // Массовое обновление объектов
        public async Task<int> UpdateObjectsBatchAsync(List<int> ids, Dictionary<string, object> fields)
        {
            var objects = await _db.GraphObjects.Include(o => o.Properties).Where(o => ids.Contains(o.Id)).ToListAsync();
            foreach (var obj in objects)
            {
                if (fields.ContainsKey("Name"))
                    obj.Name = fields["Name"]?.ToString();
                if (fields.ContainsKey("ObjectTypeId"))
                    obj.ObjectTypeId = int.Parse(fields["ObjectTypeId"].ToString());
                if (fields.ContainsKey("Properties") && fields["Properties"] is Dictionary<string, string> props)
                {
                    _db.ObjectProperties.RemoveRange(obj.Properties);
                    foreach (var prop in props)
                    {
                        _db.ObjectProperties.Add(new ObjectProperty
                        {
                            ObjectId = obj.Id,
                            Key = prop.Key,
                            Value = prop.Value
                        });
                    }
                }
            }
            return await _db.SaveChangesAsync();
        }

        // Массовое обновление связей
        public async Task<int> UpdateRelationsBatchAsync(List<int> ids, Dictionary<string, object> fields)
        {
            var relations = await _db.GraphRelations.Include(r => r.Properties).Where(r => ids.Contains(r.Id)).ToListAsync();
            foreach (var rel in relations)
            {
                if (fields.ContainsKey("RelationTypeId"))
                    rel.RelationTypeId = int.Parse(fields["RelationTypeId"].ToString());
                if (fields.ContainsKey("Properties") && fields["Properties"] is Dictionary<string, string> props)
                {
                    _db.RelationProperties.RemoveRange(rel.Properties);
                    foreach (var prop in props)
                    {
                        _db.RelationProperties.Add(new RelationProperty
                        {
                            RelationId = rel.Id,
                            Key = prop.Key,
                            Value = prop.Value
                        });
                    }
                }
            }
            return await _db.SaveChangesAsync();
        }

        public async Task<GraphObject> UpdateObjectAsync(GraphObject obj)
        {
            var existing = await _db.GraphObjects.Include(o => o.Properties).FirstOrDefaultAsync(o => o.Id == obj.Id);
            if (existing == null) return null;
            existing.Name = obj.Name;
            existing.ObjectTypeId = obj.ObjectTypeId;
            // Обновление свойств: удаляем старые, добавляем новые
            _db.ObjectProperties.RemoveRange(existing.Properties);
            if (obj.Properties != null)
            {
                foreach (var prop in obj.Properties)
                {
                    _db.ObjectProperties.Add(new ObjectProperty
                    {
                        ObjectId = existing.Id,
                        Key = prop.Key,
                        Value = prop.Value
                    });
                }
            }
            await _db.SaveChangesAsync();
            return existing;
        }

        public async Task<List<ObjectType>> GetObjectTypesAsync() => await _db.ObjectTypes.ToListAsync();
        public async Task<ObjectType> CreateObjectTypeAsync(ObjectType type)
        {
            _db.ObjectTypes.Add(type);
            await _db.SaveChangesAsync();
            return type;
        }
        public async Task<bool> DeleteObjectTypeAsync(int id)
        {
            var type = await _db.ObjectTypes.FindAsync(id);
            if (type == null) return false;
            _db.ObjectTypes.Remove(type);
            await _db.SaveChangesAsync();
            return true;
        }
        public async Task<List<RelationType>> GetRelationTypesAsync() => await _db.RelationTypes.ToListAsync();
        public async Task<RelationType> CreateRelationTypeAsync(RelationType type)
        {
            _db.RelationTypes.Add(type);
            await _db.SaveChangesAsync();
            return type;
        }
        public async Task<List<GraphObject>> GetObjectsAsync() => await _db.GraphObjects.Include(o => o.Properties).ToListAsync();
        public async Task<GraphObject> CreateObjectAsync(GraphObject obj)
        {
            _db.GraphObjects.Add(obj);
            await _db.SaveChangesAsync();
            return obj;
        }
        public async Task<List<GraphRelation>> GetRelationsAsync() => await _db.GraphRelations.Include(r => r.Properties).ToListAsync();
        public async Task<GraphRelation> CreateRelationAsync(GraphRelation rel)
        {
            _db.GraphRelations.Add(rel);
            await _db.SaveChangesAsync();
            return rel;
        }
        public async Task<List<ObjectProperty>> GetObjectPropertiesAsync(int objectId) => await _db.ObjectProperties.Where(p => p.ObjectId == objectId).ToListAsync();
        public async Task<ObjectProperty> AddObjectPropertyAsync(ObjectProperty prop)
        {
            _db.ObjectProperties.Add(prop);
            await _db.SaveChangesAsync();
            return prop;
        }
        public async Task<List<RelationProperty>> GetRelationPropertiesAsync(int relationId) => await _db.RelationProperties.Where(p => p.RelationId == relationId).ToListAsync();
        public async Task<RelationProperty> AddRelationPropertyAsync(RelationProperty prop)
        {
            _db.RelationProperties.Add(prop);
            await _db.SaveChangesAsync();
            return prop;
        }
        // Поиск всех путей между двумя объектами (DFS, ограничение по глубине)
        public async Task<List<List<int>>> FindPathsAsync(int fromId, int toId)
        {
            var result = new List<List<int>>();
            var graph = await _db.GraphRelations.ToListAsync();
            void Dfs(int current, List<int> path, HashSet<int> visited)
            {
                if (current == toId)
                {
                    result.Add(new List<int>(path));
                    return;
                }
                visited.Add(current);
                foreach (var rel in graph.Where(r => r.Source == current && !visited.Contains(r.Target)))
                {
                    path.Add(rel.Target);
                    Dfs(rel.Target, path, visited);
                    path.RemoveAt(path.Count - 1);
                }
                visited.Remove(current);
            }
            Dfs(fromId, new List<int> { fromId }, new HashSet<int>());
            return result;
        }

        // --- Добавлено для поддержки контроллера ---
        public async Task<object> GetGraphAsync()
        {
            return new {
                Objects = await GetObjectsAsync(),
                Relations = await GetRelationsAsync()
            };
        }

        public async Task<GraphObject> GetObjectAsync(int id)
        {
            return await _db.GraphObjects.Include(o => o.Properties).FirstOrDefaultAsync(o => o.Id == id);
        }

        public async Task<GraphRelation> GetRelationAsync(int id)
        {
            return await _db.GraphRelations.Include(r => r.Properties).FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<List<GraphObject>> FindPathAsync(int startId, int endId)
        {
            // Примитивная реализация поиска пути (BFS)
            var nodes = await _db.GraphObjects.ToListAsync();
            var edges = await _db.GraphRelations.ToListAsync();
            var queue = new Queue<List<int>>();
            var visited = new HashSet<int>();
            queue.Enqueue(new List<int> { startId });
            while (queue.Count > 0)
            {
                var path = queue.Dequeue();
                int last = path.Last();
                if (last == endId)
                {
                    return nodes.Where(n => path.Contains(n.Id)).ToList();
                }
                if (!visited.Add(last)) continue;
                foreach (var e in edges.Where(e => e.Source == last))
                {
                    var newPath = new List<int>(path) { e.Target };
                    queue.Enqueue(newPath);
                }
            }
            return new List<GraphObject>();
        }

        // --- Маппинг моделей в DTO ---
        public static ObjectTypeDto ToDto(ObjectType type) => new ObjectTypeDto
        {
            Id = type.Id,
            Name = type.Name,
            Description = type.Description
        };
        public static RelationTypeDto ToDto(RelationType type) => new RelationTypeDto
        {
            Id = type.Id,
            Name = type.Name,
            Description = type.Description,
            ObjectTypeId = type.ObjectTypeId
        };
        public static GraphObjectDto ToDto(GraphObject obj) => new GraphObjectDto
        {
            Id = obj.Id,
            Name = obj.Name,
            ObjectTypeId = obj.ObjectTypeId,
            Properties = obj.Properties?.ToDictionary(p => p.Key, p => p.Value) ?? new Dictionary<string, string>()
        };
        public static GraphRelationDto ToDto(GraphRelation rel) => new GraphRelationDto
        {
            Id = rel.Id,
            Source = rel.Source,
            Target = rel.Target,
            RelationTypeId = rel.RelationTypeId,
            Properties = rel.Properties?.ToDictionary(p => p.Key, p => p.Value) ?? new Dictionary<string, string>()
        };
    }
}