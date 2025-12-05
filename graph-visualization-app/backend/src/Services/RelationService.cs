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
    /// Сервис для работы со связями графа
    /// </summary>
    public class RelationService : IRelationService
    {
        private readonly GraphDbContext _db;
        private readonly IMemoryCache _cache;
        private readonly CacheSettings _cacheSettings;

        private const string CACHE_KEY_RELATIONS = "graph_relations";

        public RelationService(
            GraphDbContext db,
            IMemoryCache cache,
            IOptions<CacheSettings> cacheOptions)
        {
            _db = db;
            _cache = cache;
            _cacheSettings = cacheOptions.Value;
        }

        // Исправлена N+1 проблема: используем AsSplitQuery() для оптимизации Include
        public async Task<List<GraphRelation>> GetRelationsAsync()
        {
            return await _cache.GetOrCreateAsync(CACHE_KEY_RELATIONS, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = _cacheSettings.RelationsCacheDuration;
                return await _db.GraphRelations
                    .Include(r => r.Properties)
                    .AsSplitQuery()
                    .AsNoTracking()
                    .ToListAsync();
            }) ?? new List<GraphRelation>();
        }

        public async Task<GraphRelation?> GetRelationAsync(int id)
        {
            return await _db.GraphRelations
                .Include(r => r.Properties)
                .FirstOrDefaultAsync(r => r.Id == id);
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

        public async Task<bool> DeleteRelationAsync(int id)
        {
            var rel = await _db.GraphRelations.FindAsync(id);
            if (rel == null) return false;

            // Удаляем свойства связи
            var relProps = _db.RelationProperties.Where(p => p.RelationId == id).ToList();
            _db.RelationProperties.RemoveRange(relProps);

            // Удаляем саму связь
            _db.GraphRelations.Remove(rel);
            await _db.SaveChangesAsync();
            _cache.Remove(CACHE_KEY_RELATIONS);
            return true;
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
                if (fields.ContainsKey("Properties") && fields["Properties"] is Dictionary<string, object> props)
                {
                    _db.RelationProperties.RemoveRange(rel.Properties);
                    foreach (var prop in props)
                    {
                        _db.RelationProperties.Add(new RelationProperty
                        {
                            RelationId = rel.Id,
                            Key = prop.Key,
                            Value = prop.Value?.ToString()
                        });
                    }
                }
            }
            var result = await _db.SaveChangesAsync();
            _cache.Remove(CACHE_KEY_RELATIONS);
            return result;
        }

        public async Task<List<RelationProperty>> GetRelationPropertiesAsync(int relationId)
        {
            return await _db.RelationProperties.Where(p => p.RelationId == relationId).ToListAsync();
        }

        public async Task<RelationProperty> AddRelationPropertyAsync(RelationProperty prop)
        {
            _db.RelationProperties.Add(prop);
            await _db.SaveChangesAsync();
            return prop;
        }
    }
}
