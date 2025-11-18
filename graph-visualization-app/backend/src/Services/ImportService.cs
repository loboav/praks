using GraphVisualizationApp.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using System.Text.Json;
using System.Xml.Linq;

namespace GraphVisualizationApp.Services
{
    public class ImportService : IImportService
    {
        private readonly GraphDbContext _db;
        private readonly IMemoryCache _cache;
        private readonly CacheSettings _cacheSettings;
        
        private const string CACHE_KEY_OBJECTS = "graph_objects";
        private const string CACHE_KEY_RELATIONS = "graph_relations";
        private const string CACHE_KEY_OBJECT_TYPES = "object_types";
        private const string CACHE_KEY_RELATION_TYPES = "relation_types";

        public ImportService(
            GraphDbContext db, 
            IMemoryCache cache,
            IOptions<CacheSettings> cacheOptions)
        {
            _db = db;
            _cache = cache;
            _cacheSettings = cacheOptions.Value;
        }

        public async Task<ImportResult> ImportFromJsonAsync(string json)
        {
            var result = new ImportResult { Success = false };

            try
            {
                var jsonDoc = JsonDocument.Parse(json);
                var root = jsonDoc.RootElement;

                // Проверяем формат (поддерживаем два формата: objects/relations и nodes/edges)
                if (!root.TryGetProperty("objectTypes", out var objectTypesJson) ||
                    !root.TryGetProperty("relationTypes", out var relationTypesJson))
                {
                    result.ErrorMessage = "Неверный формат JSON. Ожидаются поля: objectTypes, relationTypes";
                    return result;
                }
                
                // Поддерживаем оба формата: objects/relations (старый) и nodes/edges (новый экспорт)
                JsonElement objectsJson, relationsJson;
                if (root.TryGetProperty("objects", out objectsJson) && root.TryGetProperty("relations", out relationsJson))
                {
                    // Старый формат
                }
                else if (root.TryGetProperty("nodes", out objectsJson) && root.TryGetProperty("edges", out relationsJson))
                {
                    // Новый формат (экспорт)
                }
                else
                {
                    result.ErrorMessage = "Неверный формат JSON. Ожидаются поля: objects+relations или nodes+edges";
                    return result;
                }

                // Создаём mapping старых ID -> новых ID
                var objectTypeIdMap = new Dictionary<int, int>();
                var relationTypeIdMap = new Dictionary<int, int>();
                var objectIdMap = new Dictionary<int, int>();

                // Импортируем типы объектов
                foreach (var typeJson in objectTypesJson.EnumerateArray())
                {
                    var oldId = typeJson.GetProperty("id").GetInt32();
                    var name = typeJson.GetProperty("name").GetString() ?? "Unknown";
                    var description = typeJson.TryGetProperty("description", out var desc) ? desc.GetString() : null;

                    var existingType = await _db.ObjectTypes.FirstOrDefaultAsync(t => t.Name == name);
                    
                    if (existingType != null)
                    {
                        objectTypeIdMap[oldId] = existingType.Id;
                    }
                    else
                    {
                        var newType = new ObjectType
                        {
                            Name = name,
                            Description = description
                        };
                        _db.ObjectTypes.Add(newType);
                        await _db.SaveChangesAsync();
                        objectTypeIdMap[oldId] = newType.Id;
                        result.ObjectTypesImported++;
                    }
                }

                // Импортируем типы связей
                foreach (var typeJson in relationTypesJson.EnumerateArray())
                {
                    var oldId = typeJson.GetProperty("id").GetInt32();
                    var name = typeJson.GetProperty("name").GetString() ?? "Unknown";
                    var description = typeJson.TryGetProperty("description", out var desc) ? desc.GetString() : null;
                    var oldObjectTypeId = typeJson.GetProperty("objectTypeId").GetInt32();

                    if (!objectTypeIdMap.TryGetValue(oldObjectTypeId, out var newObjectTypeId))
                    {
                        continue; // Пропускаем если тип объекта не найден
                    }

                    var existingType = await _db.RelationTypes.FirstOrDefaultAsync(
                        t => t.Name == name && t.ObjectTypeId == newObjectTypeId);
                    
                    if (existingType != null)
                    {
                        relationTypeIdMap[oldId] = existingType.Id;
                    }
                    else
                    {
                        var newType = new RelationType
                        {
                            Name = name,
                            Description = description,
                            ObjectTypeId = newObjectTypeId
                        };
                        _db.RelationTypes.Add(newType);
                        await _db.SaveChangesAsync();
                        relationTypeIdMap[oldId] = newType.Id;
                        result.RelationTypesImported++;
                    }
                }

                // Импортируем объекты
                foreach (var objJson in objectsJson.EnumerateArray())
                {
                    var oldId = objJson.GetProperty("id").GetInt32();
                    var name = objJson.GetProperty("name").GetString() ?? "Unknown";
                    var oldObjectTypeId = objJson.GetProperty("objectTypeId").GetInt32();

                    if (!objectTypeIdMap.TryGetValue(oldObjectTypeId, out var newObjectTypeId))
                    {
                        continue; // Пропускаем если тип не найден
                    }

                    var color = objJson.TryGetProperty("color", out var colorProp) ? colorProp.GetString() : null;
                    var icon = objJson.TryGetProperty("icon", out var iconProp) ? iconProp.GetString() : null;

                    var newObj = new GraphObject
                    {
                        Name = name,
                        ObjectTypeId = newObjectTypeId,
                        Color = color,
                        Icon = icon,
                        Properties = new List<ObjectProperty>()
                    };

                    // Импортируем свойства
                    if (objJson.TryGetProperty("properties", out var propsJson))
                    {
                        foreach (var prop in propsJson.EnumerateObject())
                        {
                            newObj.Properties.Add(new ObjectProperty
                            {
                                Key = prop.Name,
                                Value = prop.Value.GetString() ?? ""
                            });
                        }
                    }

                    _db.GraphObjects.Add(newObj);
                    await _db.SaveChangesAsync();
                    objectIdMap[oldId] = newObj.Id;
                    result.ObjectsImported++;
                }

                // Импортируем связи
                foreach (var relJson in relationsJson.EnumerateArray())
                {
                    var oldSource = relJson.GetProperty("source").GetInt32();
                    var oldTarget = relJson.GetProperty("target").GetInt32();
                    var oldRelationTypeId = relJson.GetProperty("relationTypeId").GetInt32();

                    if (!objectIdMap.TryGetValue(oldSource, out var newSource) ||
                        !objectIdMap.TryGetValue(oldTarget, out var newTarget) ||
                        !relationTypeIdMap.TryGetValue(oldRelationTypeId, out var newRelationTypeId))
                    {
                        continue; // Пропускаем если что-то не найдено
                    }

                    var color = relJson.TryGetProperty("color", out var colorProp) ? colorProp.GetString() : null;

                    var newRel = new GraphRelation
                    {
                        Source = newSource,
                        Target = newTarget,
                        RelationTypeId = newRelationTypeId,
                        Color = color,
                        Properties = new List<RelationProperty>()
                    };

                    // Импортируем свойства
                    if (relJson.TryGetProperty("properties", out var propsJson))
                    {
                        foreach (var prop in propsJson.EnumerateObject())
                        {
                            newRel.Properties.Add(new RelationProperty
                            {
                                Key = prop.Name,
                                Value = prop.Value.GetString() ?? ""
                            });
                        }
                    }

                    _db.GraphRelations.Add(newRel);
                    result.RelationsImported++;
                }

                await _db.SaveChangesAsync();
                
                // Сбрасываем кеш для обновления данных
                _cache.Remove(CACHE_KEY_OBJECTS);
                _cache.Remove(CACHE_KEY_RELATIONS);
                _cache.Remove(CACHE_KEY_OBJECT_TYPES);
                _cache.Remove(CACHE_KEY_RELATION_TYPES);
                
                result.Success = true;
            }
            catch (Exception ex)
            {
                result.ErrorMessage = $"Ошибка импорта: {ex.Message}";
            }

            return result;
        }

        public async Task<ImportResult> ImportFromGraphMLAsync(string xml)
        {
            var result = new ImportResult { Success = false };

            try
            {
                var doc = XDocument.Parse(xml);
                XNamespace ns = "http://graphml.graphdrawing.org/xmlns";

                var graph = doc.Root?.Element(ns + "graph");
                if (graph == null)
                {
                    result.ErrorMessage = "Неверный формат GraphML";
                    return result;
                }

                // Создаём дефолтный тип объекта и связи для импортированных данных
                var defaultObjectType = await _db.ObjectTypes.FirstOrDefaultAsync(t => t.Name == "Импортированный");
                if (defaultObjectType == null)
                {
                    defaultObjectType = new ObjectType
                    {
                        Name = "Импортированный",
                        Description = "Автоматически созданный тип для импорта из GraphML"
                    };
                    _db.ObjectTypes.Add(defaultObjectType);
                    await _db.SaveChangesAsync();
                    result.ObjectTypesImported++;
                }

                var defaultRelationType = await _db.RelationTypes.FirstOrDefaultAsync(
                    t => t.Name == "Связь" && t.ObjectTypeId == defaultObjectType.Id);
                if (defaultRelationType == null)
                {
                    defaultRelationType = new RelationType
                    {
                        Name = "Связь",
                        Description = "Автоматически созданный тип для импорта из GraphML",
                        ObjectTypeId = defaultObjectType.Id
                    };
                    _db.RelationTypes.Add(defaultRelationType);
                    await _db.SaveChangesAsync();
                    result.RelationTypesImported++;
                }

                var nodeIdMap = new Dictionary<string, int>();

                // Импортируем узлы
                foreach (var node in graph.Elements(ns + "node"))
                {
                    var nodeId = node.Attribute("id")?.Value;
                    if (string.IsNullOrEmpty(nodeId)) continue;

                    var label = node.Elements(ns + "data")
                        .FirstOrDefault(d => d.Attribute("key")?.Value == "label")
                        ?.Value ?? nodeId;

                    var newObj = new GraphObject
                    {
                        Name = label,
                        ObjectTypeId = defaultObjectType.Id,
                        Properties = new List<ObjectProperty>()
                    };

                    // Импортируем все data атрибуты как свойства
                    foreach (var data in node.Elements(ns + "data"))
                    {
                        var key = data.Attribute("key")?.Value;
                        var value = data.Value;
                        if (!string.IsNullOrEmpty(key) && key != "label")
                        {
                            newObj.Properties.Add(new ObjectProperty
                            {
                                Key = key,
                                Value = value
                            });
                        }
                    }

                    _db.GraphObjects.Add(newObj);
                    await _db.SaveChangesAsync();
                    nodeIdMap[nodeId] = newObj.Id;
                    result.ObjectsImported++;
                }

                // Импортируем рёбра
                foreach (var edge in graph.Elements(ns + "edge"))
                {
                    var sourceId = edge.Attribute("source")?.Value;
                    var targetId = edge.Attribute("target")?.Value;

                    if (string.IsNullOrEmpty(sourceId) || string.IsNullOrEmpty(targetId)) continue;
                    if (!nodeIdMap.TryGetValue(sourceId, out var source) ||
                        !nodeIdMap.TryGetValue(targetId, out var target)) continue;

                    var newRel = new GraphRelation
                    {
                        Source = source,
                        Target = target,
                        RelationTypeId = defaultRelationType.Id,
                        Properties = new List<RelationProperty>()
                    };

                    // Импортируем все data атрибуты как свойства
                    foreach (var data in edge.Elements(ns + "data"))
                    {
                        var key = data.Attribute("key")?.Value;
                        var value = data.Value;
                        if (!string.IsNullOrEmpty(key))
                        {
                            newRel.Properties.Add(new RelationProperty
                            {
                                Key = key,
                                Value = value
                            });
                        }
                    }

                    _db.GraphRelations.Add(newRel);
                    result.RelationsImported++;
                }

                await _db.SaveChangesAsync();
                
                // Сбрасываем кеш для обновления данных
                _cache.Remove(CACHE_KEY_OBJECTS);
                _cache.Remove(CACHE_KEY_RELATIONS);
                _cache.Remove(CACHE_KEY_OBJECT_TYPES);
                _cache.Remove(CACHE_KEY_RELATION_TYPES);
                
                result.Success = true;
            }
            catch (Exception ex)
            {
                result.ErrorMessage = $"Ошибка импорта GraphML: {ex.Message}";
            }

            return result;
        }
    }
}
