using GraphVisualizationApp.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Services
{
    /// <summary>
    /// Сервис для работы с объектами графа
    /// </summary>
    public class ObjectService : IObjectService
    {
        private readonly GraphDbContext _db;
        private readonly IMemoryCache _cache;
        private readonly CacheSettings _cacheSettings;

        private const string CACHE_KEY_OBJECTS = "graph_objects";

        public ObjectService(
            GraphDbContext db,
            IMemoryCache cache,
            IOptions<CacheSettings> cacheOptions)
        {
            _db = db;
            _cache = cache;
            _cacheSettings = cacheOptions.Value;
        }

        // Исправлена N+1 проблема: используем AsSplitQuery() для оптимизации Include
        public async Task<List<GraphObject>> GetObjectsAsync()
        {
            return await _cache.GetOrCreateAsync(CACHE_KEY_OBJECTS, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = _cacheSettings.ObjectsCacheDuration;
                return await _db.GraphObjects
                    .Include(o => o.Properties)
                    .AsSplitQuery()
                    .AsNoTracking()
                    .ToListAsync();
            }) ?? new List<GraphObject>();
        }

        public async Task<GraphObject?> GetObjectAsync(int id)
        {
            return await _db.GraphObjects
                .Include(o => o.Properties)
                .FirstOrDefaultAsync(o => o.Id == id);
        }

        public async Task<GraphObject> CreateObjectAsync(GraphObject obj)
        {
            _db.GraphObjects.Add(obj);
            await _db.SaveChangesAsync();
            _cache.Remove(CACHE_KEY_OBJECTS);
            return obj;
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

        public async Task<bool> DeleteObjectAsync(int id)
        {
            var obj = await _db.GraphObjects.FindAsync(id);
            if (obj == null) return false;

            // Удаляем все связи, где этот объект является источником или целью
            var relationsToDelete = _db.GraphRelations
                .Where(r => r.Source == id || r.Target == id)
                .ToList();

            foreach (var rel in relationsToDelete)
            {
                var relProps = _db.RelationProperties.Where(p => p.RelationId == rel.Id).ToList();
                _db.RelationProperties.RemoveRange(relProps);
            }
            _db.GraphRelations.RemoveRange(relationsToDelete);

            // Удаляем свойства объекта
            var objProps = _db.ObjectProperties.Where(p => p.ObjectId == id).ToList();
            _db.ObjectProperties.RemoveRange(objProps);

            // Удаляем сам объект
            _db.GraphObjects.Remove(obj);
            await _db.SaveChangesAsync();
            _cache.Remove(CACHE_KEY_OBJECTS);
            return true;
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

        public async Task<List<ObjectProperty>> GetObjectPropertiesAsync(int objectId)
        {
            return await _db.ObjectProperties.Where(p => p.ObjectId == objectId).ToListAsync();
        }

        public async Task<ObjectProperty> AddObjectPropertyAsync(ObjectProperty prop)
        {
            _db.ObjectProperties.Add(prop);
            await _db.SaveChangesAsync();
            return prop;
        }

        public async Task<List<GraphRelation>> GetNeighborsAsync(int objectId)
        {
            return await _db.GraphRelations
                .Include(r => r.Properties)
                .AsNoTracking()
                .Where(r => r.Source == objectId || r.Target == objectId)
                .ToListAsync();
        }

        public async Task<List<GraphObject>> GetObjectsByIdsAsync(List<int> ids)
        {
            if (ids == null || ids.Count == 0)
                return new List<GraphObject>();

            return await _db.GraphObjects
                .Include(o => o.Properties)
                .AsNoTracking()
                .Where(o => ids.Contains(o.Id))
                .ToListAsync();
        }
    }
}
