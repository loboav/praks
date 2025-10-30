using GraphVisualizationApp.Models;
using GraphVisualizationApp.Algorithms;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Diagnostics;

namespace GraphVisualizationApp.Services
{
    public class GraphService : IGraphService
    {
        private readonly GraphDbContext _db;
        private readonly IMemoryCache _cache;
        private const string CACHE_KEY_OBJECTS = "graph_objects";
        private const string CACHE_KEY_RELATIONS = "graph_relations";
        private const string CACHE_KEY_OBJECT_TYPES = "object_types";
        private const string CACHE_KEY_RELATION_TYPES = "relation_types";
        private static readonly TimeSpan CacheExpiration = TimeSpan.FromMinutes(5);

        public GraphService(GraphDbContext db, IMemoryCache cache) 
        { 
            _db = db;
            _cache = cache;
        }

        // Поиск кратчайшего пути по Дейкстре (оптимизировано с использованием кэша)
    public async Task<GraphVisualizationApp.Algorithms.DijkstraPathFinder.PathResult> FindShortestPathDijkstraAsync(int fromId, int toId)
        {
            // Используем кэшированные данные вместо прямых запросов к БД
            var nodes = await GetObjectsAsync();
            var edges = await GetRelationsAsync();
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
            var result = await _db.SaveChangesAsync();
            _cache.Remove(CACHE_KEY_OBJECTS);
            return result;
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
            var result = await _db.SaveChangesAsync();
            _cache.Remove(CACHE_KEY_RELATIONS);
            return result;
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
            _cache.Remove(CACHE_KEY_OBJECTS);
            return existing;
        }

        public async Task<List<ObjectType>> GetObjectTypesAsync()
        {
            return await _cache.GetOrCreateAsync(CACHE_KEY_OBJECT_TYPES, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = CacheExpiration;
                return await _db.ObjectTypes.AsNoTracking().ToListAsync();
            }) ?? new List<ObjectType>();
        }

        public async Task<ObjectType> CreateObjectTypeAsync(ObjectType type)
        {
            _db.ObjectTypes.Add(type);
            await _db.SaveChangesAsync();
            _cache.Remove(CACHE_KEY_OBJECT_TYPES);
            return type;
        }

        public async Task<bool> DeleteObjectTypeAsync(int id)
        {
            var type = await _db.ObjectTypes.FindAsync(id);
            if (type == null) return false;
            _db.ObjectTypes.Remove(type);
            await _db.SaveChangesAsync();
            _cache.Remove(CACHE_KEY_OBJECT_TYPES);
            return true;
        }

        public async Task<List<RelationType>> GetRelationTypesAsync()
        {
            return await _cache.GetOrCreateAsync(CACHE_KEY_RELATION_TYPES, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = CacheExpiration;
                return await _db.RelationTypes.AsNoTracking().ToListAsync();
            }) ?? new List<RelationType>();
        }

        public async Task<RelationType> CreateRelationTypeAsync(RelationType type)
        {
            _db.RelationTypes.Add(type);
            await _db.SaveChangesAsync();
            _cache.Remove(CACHE_KEY_RELATION_TYPES);
            return type;
        }

        // Исправлена N+1 проблема: используем AsSplitQuery() для оптимизации Include
        public async Task<List<GraphObject>> GetObjectsAsync()
        {
            return await _cache.GetOrCreateAsync(CACHE_KEY_OBJECTS, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = CacheExpiration;
                return await _db.GraphObjects
                    .Include(o => o.Properties)
                    .AsSplitQuery()
                    .AsNoTracking()
                    .ToListAsync();
            }) ?? new List<GraphObject>();
        }

        public async Task<GraphObject> CreateObjectAsync(GraphObject obj)
        {
            _db.GraphObjects.Add(obj);
            await _db.SaveChangesAsync();
            _cache.Remove(CACHE_KEY_OBJECTS);
            return obj;
        }

        // Исправлена N+1 проблема: используем AsSplitQuery() для оптимизации Include
        public async Task<List<GraphRelation>> GetRelationsAsync()
        {
            return await _cache.GetOrCreateAsync(CACHE_KEY_RELATIONS, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = CacheExpiration;
                return await _db.GraphRelations
                    .Include(r => r.Properties)
                    .AsSplitQuery()
                    .AsNoTracking()
                    .ToListAsync();
            }) ?? new List<GraphRelation>();
        }

        public async Task<GraphRelation> CreateRelationAsync(GraphRelation rel)
        {
            _db.GraphRelations.Add(rel);
            await _db.SaveChangesAsync();
            _cache.Remove(CACHE_KEY_RELATIONS);
            return rel;
        }

        public async Task<GraphRelation> UpdateRelationAsync(GraphRelation rel)
        {
            var existing = await _db.GraphRelations.Include(r => r.Properties).FirstOrDefaultAsync(r => r.Id == rel.Id);
            if (existing == null) return null!;
            existing.RelationTypeId = rel.RelationTypeId;
            existing.Color = rel.Color;

            _db.RelationProperties.RemoveRange(existing.Properties);
            if (rel.Properties != null)
            {
                foreach (var prop in rel.Properties)
                {
                    _db.RelationProperties.Add(new RelationProperty
                    {
                        RelationId = existing.Id,
                        Key = prop.Key,
                        Value = prop.Value
                    });
                }
            }
            await _db.SaveChangesAsync();
            _cache.Remove(CACHE_KEY_RELATIONS);
            return existing;
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
            _cache.Remove(CACHE_KEY_OBJECTS);
            _cache.Remove(CACHE_KEY_RELATIONS);
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
            _cache.Remove(CACHE_KEY_RELATIONS);
            return true;
        }

        public async Task<bool> DeleteRelationTypeAsync(int id)
        {
            var type = await _db.RelationTypes.FindAsync(id);
            if (type == null) return false;
            // optionally consider removing or reassigning relations of this type
            _db.RelationTypes.Remove(type);
            await _db.SaveChangesAsync();
            _cache.Remove(CACHE_KEY_RELATION_TYPES);
            return true;
        }

        // ============================================
        // ПОЛНОТЕКСТОВЫЙ ПОИСК
        // ============================================

        /// <summary>
        /// Комбинированный поиск по объектам и связям
        /// </summary>
        public async Task<SearchResults> SearchAsync(string query, SearchOptions? options = null)
        {
            var stopwatch = Stopwatch.StartNew();
            options ??= new SearchOptions();

            var objectResults = await SearchObjectsAsync(query, options);
            var relationResults = await SearchRelationsAsync(query, options);

            stopwatch.Stop();

            return new SearchResults
            {
                Objects = objectResults,
                Relations = relationResults,
                TotalFound = objectResults.Count + relationResults.Count,
                SearchDurationMs = stopwatch.Elapsed.TotalMilliseconds,
                Query = query
            };
        }

        /// <summary>
        /// Поиск объектов по запросу
        /// </summary>
        public async Task<List<ObjectSearchResult>> SearchObjectsAsync(string query, SearchOptions? options = null)
        {
            if (string.IsNullOrWhiteSpace(query))
                return new List<ObjectSearchResult>();

            options ??= new SearchOptions();
            var results = new List<ObjectSearchResult>();

            // Получаем все объекты с типами и свойствами
            var objects = await _db.GraphObjects
                .Include(o => o.ObjectType)
                .Include(o => o.Properties)
                .AsNoTracking()
                .ToListAsync();

            // Фильтруем по типам, если указано
            if (options.ObjectTypeIds.Any())
            {
                objects = objects.Where(o => options.ObjectTypeIds.Contains(o.ObjectTypeId)).ToList();
            }

            foreach (var obj in objects)
            {
                var matches = new List<SearchMatch>();
                double maxRelevance = 0.0;

                // Поиск в имени
                if (options.SearchInNames && !string.IsNullOrEmpty(obj.Name))
                {
                    if (IsMatch(obj.Name, query, options, out var relevance, out var position, out var length))
                    {
                        matches.Add(new SearchMatch
                        {
                            Type = SearchMatchType.Name,
                            Field = "Name",
                            Value = obj.Name,
                            Position = position,
                            Length = length
                        });
                        maxRelevance = Math.Max(maxRelevance, relevance);
                    }
                }

                // Поиск в свойствах
                if (options.SearchInProperties && obj.Properties != null)
                {
                    foreach (var prop in obj.Properties)
                    {
                        // Поиск в ключе свойства
                        if (!string.IsNullOrEmpty(prop.Key) && 
                            IsMatch(prop.Key, query, options, out var keyRelevance, out var keyPos, out var keyLen))
                        {
                            matches.Add(new SearchMatch
                            {
                                Type = SearchMatchType.PropertyKey,
                                Field = prop.Key,
                                Value = prop.Key,
                                Position = keyPos,
                                Length = keyLen
                            });
                            maxRelevance = Math.Max(maxRelevance, keyRelevance * 0.8); // Ключ менее важен
                        }

                        // Поиск в значении свойства
                        if (!string.IsNullOrEmpty(prop.Value) && 
                            IsMatch(prop.Value, query, options, out var valRelevance, out var valPos, out var valLen))
                        {
                            matches.Add(new SearchMatch
                            {
                                Type = SearchMatchType.PropertyValue,
                                Field = prop.Key ?? "Property",
                                Value = prop.Value,
                                Position = valPos,
                                Length = valLen
                            });
                            maxRelevance = Math.Max(maxRelevance, valRelevance);
                        }
                    }
                }

                // Поиск в описании типа
                if (options.SearchInTypeDescriptions && obj.ObjectType != null)
                {
                    if (!string.IsNullOrEmpty(obj.ObjectType.Name) &&
                        IsMatch(obj.ObjectType.Name, query, options, out var typeNameRel, out var typeNamePos, out var typeNameLen))
                    {
                        matches.Add(new SearchMatch
                        {
                            Type = SearchMatchType.TypeName,
                            Field = "ObjectType.Name",
                            Value = obj.ObjectType.Name,
                            Position = typeNamePos,
                            Length = typeNameLen
                        });
                        maxRelevance = Math.Max(maxRelevance, typeNameRel * 0.6);
                    }

                    if (!string.IsNullOrEmpty(obj.ObjectType.Description) &&
                        IsMatch(obj.ObjectType.Description, query, options, out var typeDescRel, out var typeDescPos, out var typeDescLen))
                    {
                        matches.Add(new SearchMatch
                        {
                            Type = SearchMatchType.TypeDescription,
                            Field = "ObjectType.Description",
                            Value = obj.ObjectType.Description,
                            Position = typeDescPos,
                            Length = typeDescLen
                        });
                        maxRelevance = Math.Max(maxRelevance, typeDescRel * 0.5);
                    }
                }

                // Если есть совпадения и релевантность выше минимальной
                if (matches.Any() && maxRelevance >= options.MinRelevance)
                {
                    results.Add(new ObjectSearchResult
                    {
                        Object = obj,
                        Relevance = maxRelevance,
                        Matches = matches
                    });
                }
            }

            // Сортируем по релевантности
            results = results.OrderByDescending(r => r.Relevance).ToList();

            // Ограничиваем количество результатов
            if (options.MaxResults > 0 && results.Count > options.MaxResults)
            {
                results = results.Take(options.MaxResults).ToList();
            }

            return results;
        }

        /// <summary>
        /// Поиск связей по запросу
        /// </summary>
        public async Task<List<RelationSearchResult>> SearchRelationsAsync(string query, SearchOptions? options = null)
        {
            if (string.IsNullOrWhiteSpace(query))
                return new List<RelationSearchResult>();

            options ??= new SearchOptions();
            var results = new List<RelationSearchResult>();

            // Получаем все связи с типами и свойствами
            var relations = await _db.GraphRelations
                .Include(r => r.RelationType)
                .Include(r => r.Properties)
                .Include(r => r.SourceObject)
                .Include(r => r.TargetObject)
                .AsNoTracking()
                .ToListAsync();

            // Фильтруем по типам, если указано
            if (options.RelationTypeIds.Any())
            {
                relations = relations.Where(r => options.RelationTypeIds.Contains(r.RelationTypeId)).ToList();
            }

            foreach (var rel in relations)
            {
                var matches = new List<SearchMatch>();
                double maxRelevance = 0.0;

                // Поиск в именах источника и цели (если включен поиск в именах)
                if (options.SearchInNames)
                {
                    if (rel.SourceObject != null && !string.IsNullOrEmpty(rel.SourceObject.Name) &&
                        IsMatch(rel.SourceObject.Name, query, options, out var srcRel, out var srcPos, out var srcLen))
                    {
                        matches.Add(new SearchMatch
                        {
                            Type = SearchMatchType.Name,
                            Field = "Source.Name",
                            Value = rel.SourceObject.Name,
                            Position = srcPos,
                            Length = srcLen
                        });
                        maxRelevance = Math.Max(maxRelevance, srcRel * 0.7);
                    }

                    if (rel.TargetObject != null && !string.IsNullOrEmpty(rel.TargetObject.Name) &&
                        IsMatch(rel.TargetObject.Name, query, options, out var tgtRel, out var tgtPos, out var tgtLen))
                    {
                        matches.Add(new SearchMatch
                        {
                            Type = SearchMatchType.Name,
                            Field = "Target.Name",
                            Value = rel.TargetObject.Name,
                            Position = tgtPos,
                            Length = tgtLen
                        });
                        maxRelevance = Math.Max(maxRelevance, tgtRel * 0.7);
                    }
                }

                // Поиск в свойствах связи
                if (options.SearchInProperties && rel.Properties != null)
                {
                    foreach (var prop in rel.Properties)
                    {
                        if (!string.IsNullOrEmpty(prop.Key) &&
                            IsMatch(prop.Key, query, options, out var keyRel, out var keyPos, out var keyLen))
                        {
                            matches.Add(new SearchMatch
                            {
                                Type = SearchMatchType.PropertyKey,
                                Field = prop.Key,
                                Value = prop.Key,
                                Position = keyPos,
                                Length = keyLen
                            });
                            maxRelevance = Math.Max(maxRelevance, keyRel * 0.8);
                        }

                        if (!string.IsNullOrEmpty(prop.Value) &&
                            IsMatch(prop.Value, query, options, out var valRel, out var valPos, out var valLen))
                        {
                            matches.Add(new SearchMatch
                            {
                                Type = SearchMatchType.PropertyValue,
                                Field = prop.Key ?? "Property",
                                Value = prop.Value,
                                Position = valPos,
                                Length = valLen
                            });
                            maxRelevance = Math.Max(maxRelevance, valRel);
                        }
                    }
                }

                // Поиск в типе связи
                if (options.SearchInTypeDescriptions && rel.RelationType != null)
                {
                    if (!string.IsNullOrEmpty(rel.RelationType.Name) &&
                        IsMatch(rel.RelationType.Name, query, options, out var typeNameRel, out var typeNamePos, out var typeNameLen))
                    {
                        matches.Add(new SearchMatch
                        {
                            Type = SearchMatchType.TypeName,
                            Field = "RelationType.Name",
                            Value = rel.RelationType.Name,
                            Position = typeNamePos,
                            Length = typeNameLen
                        });
                        maxRelevance = Math.Max(maxRelevance, typeNameRel * 0.6);
                    }

                    if (!string.IsNullOrEmpty(rel.RelationType.Description) &&
                        IsMatch(rel.RelationType.Description, query, options, out var typeDescRel, out var typeDescPos, out var typeDescLen))
                    {
                        matches.Add(new SearchMatch
                        {
                            Type = SearchMatchType.TypeDescription,
                            Field = "RelationType.Description",
                            Value = rel.RelationType.Description,
                            Position = typeDescPos,
                            Length = typeDescLen
                        });
                        maxRelevance = Math.Max(maxRelevance, typeDescRel * 0.5);
                    }
                }

                if (matches.Any() && maxRelevance >= options.MinRelevance)
                {
                    results.Add(new RelationSearchResult
                    {
                        Relation = rel,
                        Relevance = maxRelevance,
                        Matches = matches
                    });
                }
            }

            results = results.OrderByDescending(r => r.Relevance).ToList();

            if (options.MaxResults > 0 && results.Count > options.MaxResults)
            {
                results = results.Take(options.MaxResults).ToList();
            }

            return results;
        }

        /// <summary>
        /// Проверяет, соответствует ли текст запросу с учётом опций
        /// </summary>
        private bool IsMatch(string text, string query, SearchOptions options, 
            out double relevance, out int position, out int length)
        {
            relevance = 0.0;
            position = -1;
            length = 0;

            if (string.IsNullOrEmpty(text))
                return false;

            // Проверка на целое слово
            if (options.WholeWordOnly)
            {
                var words = text.Split(new[] { ' ', ',', '.', ';', ':', '-', '_' }, 
                    StringSplitOptions.RemoveEmptyEntries);
                
                var comparison = options.CaseSensitive 
                    ? StringComparison.Ordinal 
                    : StringComparison.OrdinalIgnoreCase;

                foreach (var word in words)
                {
                    if (string.Equals(word, query, comparison))
                    {
                        relevance = 1.0;
                        var match = FuzzyMatcher.FindMatch(text, word, options.CaseSensitive);
                        position = match.position;
                        length = match.length;
                        return true;
                    }
                }
                return false;
            }

            // Регулярные выражения
            if (options.UseRegex)
            {
                if (FuzzyMatcher.RegexMatch(text, query, options.CaseSensitive))
                {
                    var match = FuzzyMatcher.FindRegexMatch(text, query, options.CaseSensitive);
                    position = match.position;
                    length = match.length;
                    relevance = FuzzyMatcher.CalculateRelevance(text, query, options.CaseSensitive);
                    return true;
                }
                return false;
            }

            // Fuzzy search
            if (options.UseFuzzySearch)
            {
                if (FuzzyMatcher.FuzzyMatch(text, query, options.FuzzyMaxDistance, options.CaseSensitive))
                {
                    relevance = FuzzyMatcher.CalculateRelevance(text, query, options.CaseSensitive);
                    var match = FuzzyMatcher.FindMatch(text, query, options.CaseSensitive);
                    position = match.position;
                    length = match.length;
                    return true;
                }
                return false;
            }

            // Обычный поиск подстроки
            var searchText = options.CaseSensitive ? text : text.ToLowerInvariant();
            var searchQuery = options.CaseSensitive ? query : query.ToLowerInvariant();

            if (searchText.Contains(searchQuery))
            {
                relevance = FuzzyMatcher.CalculateRelevance(text, query, options.CaseSensitive);
                var match = FuzzyMatcher.FindMatch(text, query, options.CaseSensitive);
                position = match.position;
                length = match.length;
                return true;
            }

            return false;
        }
    }
}