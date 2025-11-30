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
    /// Сервис для работы с типами объектов и типами связей
    /// </summary>
    public class TypeService : ITypeService
    {
        private readonly GraphDbContext _db;
        private readonly IMemoryCache _cache;
        private readonly CacheSettings _cacheSettings;

        private const string CACHE_KEY_OBJECT_TYPES = "object_types";
        private const string CACHE_KEY_RELATION_TYPES = "relation_types";

        public TypeService(
            GraphDbContext db,
            IMemoryCache cache,
            IOptions<CacheSettings> cacheOptions)
        {
            _db = db;
            _cache = cache;
            _cacheSettings = cacheOptions.Value;
        }

        // ============================================
        // OBJECT TYPES
        // ============================================

        public async Task<List<ObjectType>> GetObjectTypesAsync()
        {
            return await _cache.GetOrCreateAsync(CACHE_KEY_OBJECT_TYPES, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = _cacheSettings.ObjectTypesCacheDuration;
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

            // Удаляем все типы связей, связанные с этим типом объекта
            var relationTypes = _db.RelationTypes.Where(rt => rt.ObjectTypeId == id).ToList();
            _db.RelationTypes.RemoveRange(relationTypes);

            _db.ObjectTypes.Remove(type);
            await _db.SaveChangesAsync();
            _cache.Remove(CACHE_KEY_OBJECT_TYPES);
            _cache.Remove(CACHE_KEY_RELATION_TYPES);
            return true;
        }

        // ============================================
        // RELATION TYPES
        // ============================================

        public async Task<List<RelationType>> GetRelationTypesAsync()
        {
            return await _cache.GetOrCreateAsync(CACHE_KEY_RELATION_TYPES, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = _cacheSettings.RelationTypesCacheDuration;
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

        public async Task<bool> DeleteRelationTypeAsync(int id)
        {
            var type = await _db.RelationTypes.FindAsync(id);
            if (type == null) return false;

            // Проверяем, используется ли этот тип связи
            var relationsUsingType = await _db.GraphRelations
                .Where(r => r.RelationTypeId == id)
                .CountAsync();

            if (relationsUsingType > 0)
            {
                // Можно либо запретить удаление, либо удалить все связи этого типа
                // Сейчас удаляем все связи (как в оригинальном GraphService)
                var relations = await _db.GraphRelations
                    .Where(r => r.RelationTypeId == id)
                    .ToListAsync();
                _db.GraphRelations.RemoveRange(relations);
            }

            _db.RelationTypes.Remove(type);
            await _db.SaveChangesAsync();
            _cache.Remove(CACHE_KEY_RELATION_TYPES);
            return true;
        }
    }
}
