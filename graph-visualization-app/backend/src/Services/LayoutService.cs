using GraphVisualizationApp.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Services
{
    /// <summary>
    /// Сервис для работы с layouts (сохранение позиций узлов)
    /// </summary>
    public class LayoutService : ILayoutService
    {
        private readonly GraphDbContext _db;

        public LayoutService(GraphDbContext db)
        {
            _db = db;
        }

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
    }
}
