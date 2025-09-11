using GraphVisualizationApp.Models;
using GraphVisualizationApp.Algorithms;
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

        // Поиск кратчайшего пути по Дейкстре
    public async Task<GraphVisualizationApp.Algorithms.DijkstraPathFinder.PathResult> FindShortestPathDijkstraAsync(int fromId, int toId)
        {
            var nodes = await _db.GraphObjects.Include(o => o.Properties).ToListAsync();
            var edges = await _db.GraphRelations.Include(r => r.Properties).ToListAsync();
            // Преобразуем свойства связей в Dictionary<string, string>
            var edgeList = edges.Select(e => {
                var rel = new GraphRelation
                {
                    Id = e.Id,
                    Source = e.Source,
                    Target = e.Target,
                    RelationTypeId = e.RelationTypeId,
                    Color = e.Color,
                    Properties = e.Properties?.ToList() ?? new List<RelationProperty>()
                };
                return rel;
            }).ToList();
            var nodeList = nodes.Select(n => new GraphObject
            {
                Id = n.Id,
                Name = n.Name,
                ObjectTypeId = n.ObjectTypeId,
                Color = n.Color,
                Icon = n.Icon,
                Properties = n.Properties?.ToList() ?? new List<ObjectProperty>()
            }).ToList();
            var finder = new GraphVisualizationApp.Algorithms.DijkstraPathFinder();
            // Преобразуем RelationProperty в Dictionary<string, string> для Properties
            foreach (var edge in edgeList)
            {
                if (edge.Properties != null)
                {
                    var dict = new Dictionary<string, string>();
                    foreach (var prop in edge.Properties)
                        if (prop.Key != null && prop.Value != null)
                            dict[prop.Key] = prop.Value;
                    // В алгоритме используется edge.Properties как коллекция, а не словарь, поэтому ничего не меняем
                }
            }
            // Для алгоритма используем только Id и Properties
            // DijkstraPathFinder ожидает List<GraphObject>, List<GraphRelation>
            return finder.FindShortestPath(nodeList, edgeList, fromId, toId);
        }

            // Layout
            public async Task<GraphLayout?> GetLayoutAsync(int? graphId = null, string? userId = null)
            {
                var query = _db.GraphLayouts.AsQueryable();
                if (graphId != null)
                    query = query.Where(l => l.GraphId == graphId);
                if (userId != null)
                    query = query.Where(l => l.UserId == userId);
                return await query.OrderByDescending(l => l.UpdatedAt).FirstOrDefaultAsync();
            }

            public async Task<GraphLayout> SaveLayoutAsync(GraphLayout layout)
            {
                var existing = await _db.GraphLayouts
                    .Where(l => l.GraphId == layout.GraphId && l.UserId == layout.UserId)
                    .FirstOrDefaultAsync();
                if (existing != null)
                {
                    existing.LayoutJson = layout.LayoutJson;
                    existing.UpdatedAt = DateTime.UtcNow;
                    await _db.SaveChangesAsync();
                    return existing;
                }
                else
                {
                    layout.UpdatedAt = DateTime.UtcNow;
                    _db.GraphLayouts.Add(layout);
                    await _db.SaveChangesAsync();
                    return layout;
                }
            }


        public async Task<int> UpdateObjectsBatchAsync(List<int> ids, Dictionary<string, object> fields)
        {
            var objects = await _db.GraphObjects.Include(o => o.Properties).Where(o => ids.Contains(o.Id)).ToListAsync();
            foreach (var obj in objects)
            {
                if (fields.ContainsKey("Name"))
                    obj.Name = fields["Name"]?.ToString();
                if (fields.ContainsKey("ObjectTypeId"))
                {
                    var val = fields["ObjectTypeId"]?.ToString();
                    if (!string.IsNullOrEmpty(val) && int.TryParse(val, out var parsed))
                        obj.ObjectTypeId = parsed;
                }
                if (fields.ContainsKey("Color"))
                    obj.Color = fields["Color"]?.ToString();
                if (fields.ContainsKey("Icon"))
                    obj.Icon = fields["Icon"]?.ToString();
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


        public async Task<int> UpdateRelationsBatchAsync(List<int> ids, Dictionary<string, object> fields)
        {
            var relations = await _db.GraphRelations.Include(r => r.Properties).Where(r => ids.Contains(r.Id)).ToListAsync();
            foreach (var rel in relations)
            {
                if (fields.ContainsKey("RelationTypeId"))
                {
                    var val = fields["RelationTypeId"]?.ToString();
                    if (!string.IsNullOrEmpty(val) && int.TryParse(val, out var parsed))
                        rel.RelationTypeId = parsed;
                }
                if (fields.ContainsKey("Color"))
                    rel.Color = fields["Color"]?.ToString();
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
            if (existing == null) return null!;
            existing.Name = obj.Name;
            existing.ObjectTypeId = obj.ObjectTypeId;
            existing.Color = obj.Color;
            existing.Icon = obj.Icon;

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


        public static ObjectTypeDto ToDto(ObjectType type) => new ObjectTypeDto
        {
            Id = type.Id,
            Name = type.Name ?? string.Empty,
            Description = type.Description
        };
        public static RelationTypeDto ToDto(RelationType type) => new RelationTypeDto
        {
            Id = type.Id,
            Name = type.Name ?? string.Empty,
            Description = type.Description,
            ObjectTypeId = type.ObjectTypeId
        };
        public static GraphObjectDto ToDto(GraphObject obj) => new GraphObjectDto
        {
            Id = obj.Id,
            Name = obj.Name ?? string.Empty,
            ObjectTypeId = obj.ObjectTypeId,
            Properties = obj.Properties?.ToDictionary(p => p.Key ?? string.Empty, p => p.Value ?? string.Empty) ?? new Dictionary<string, string>(),
            Color = obj.Color,
            Icon = obj.Icon
        };
        public static GraphRelationDto ToDto(GraphRelation rel) => new GraphRelationDto
        {
            Id = rel.Id,
            Source = rel.Source,
            Target = rel.Target,
            RelationTypeId = rel.RelationTypeId,
            Properties = rel.Properties?.ToDictionary(p => p.Key ?? string.Empty, p => p.Value ?? string.Empty) ?? new Dictionary<string, string>(),
            Color = rel.Color
        };

        // Удаление объекта
        public async Task<bool> DeleteObjectAsync(int id)
        {
            var obj = await _db.GraphObjects.FindAsync(id);
            if (obj == null) return false;
            // Удаляем связанные свойства и связи
            var props = _db.ObjectProperties.Where(p => p.ObjectId == id).ToList();
            _db.ObjectProperties.RemoveRange(props);
            var rels = _db.GraphRelations.Where(r => r.Source == id || r.Target == id).ToList();
            foreach (var r in rels)
            {
                var relProps = _db.RelationProperties.Where(p => p.RelationId == r.Id).ToList();
                _db.RelationProperties.RemoveRange(relProps);
            }
            _db.GraphRelations.RemoveRange(rels);
            _db.GraphObjects.Remove(obj);
            await _db.SaveChangesAsync();
            return true;
        }

        // Удаление связи
        public async Task<bool> DeleteRelationAsync(int id)
        {
            var rel = await _db.GraphRelations.FindAsync(id);
            if (rel == null) return false;
            var relProps = _db.RelationProperties.Where(p => p.RelationId == id).ToList();
            _db.RelationProperties.RemoveRange(relProps);
            _db.GraphRelations.Remove(rel);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}