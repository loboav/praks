using GraphVisualizationApp.Models;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace GraphVisualizationApp.Services
{
    public interface ITimelineService
    {
        Task<TimelineStatsResponse> GetTimelineStatsAsync();
        Task<TimelineBoundariesResponse> GetTimelineBoundariesAsync();
    }

    public class TimelineStatsResponse
    {
        public List<TimelineDataPoint> DataPoints { get; set; } = new();
        public DateTime? MinDate { get; set; }
        public DateTime? MaxDate { get; set; }
        public int TotalItemsWithDates { get; set; }
        public int TotalItemsWithoutDates { get; set; }
    }

    public class TimelineDataPoint
    {
        public DateTime Date { get; set; }
        public int NodeCount { get; set; }
        public int EdgeCount { get; set; }
        public int TotalCount => NodeCount + EdgeCount;
    }

    public class TimelineBoundariesResponse
    {
        public DateTime? MinDate { get; set; }
        public DateTime? MaxDate { get; set; }
    }

    public class TimelineService : ITimelineService
    {
        private readonly GraphDbContext _context;
        
        // Ключи свойств, которые считаются временными
        private static readonly string[] DatePropertyKeys = 
        {
            "date", "datetime", "timestamp", "time", "created_at", 
            "дата", "время", "создано", "дата_создания"
        };
        
        // Форматы дат для парсинга (приоритет: DD.MM.YYYY)
        private static readonly string[] DateFormats =
        {
            "dd.MM.yyyy",           // 25.12.2024
            "dd.MM.yyyy HH:mm",     // 25.12.2024 14:30
            "dd.MM.yyyy HH:mm:ss",  // 25.12.2024 14:30:45
            "yyyy-MM-dd",           // 2024-12-25
            "yyyy-MM-dd HH:mm:ss",  // 2024-12-25 14:30:45
            "dd/MM/yyyy",           // 25/12/2024
            "MM/dd/yyyy",           // 12/25/2024
        };

        public TimelineService(GraphDbContext context)
        {
            _context = context;
        }

        public async Task<TimelineStatsResponse> GetTimelineStatsAsync()
        {
            var response = new TimelineStatsResponse();
            var dateGroups = new Dictionary<DateTime, TimelineDataPoint>();

            // Получаем все свойства объектов
            var objectProperties = await _context.ObjectProperties
                .Include(p => p.Object)
                .ToListAsync();

            // Получаем все свойства связей
            var relationProperties = await _context.RelationProperties
                .Include(p => p.Relation)
                .ToListAsync();

            int itemsWithDates = 0;
            int itemsWithoutDates = 0;

            // Обрабатываем свойства объектов
            var processedObjectIds = new HashSet<int>();
            foreach (var prop in objectProperties)
            {
                if (prop.Object == null || processedObjectIds.Contains(prop.ObjectId))
                    continue;

                if (IsDateProperty(prop.Key) && TryParseDate(prop.Value, out var date))
                {
                    var dateOnly = date.Date;
                    if (!dateGroups.ContainsKey(dateOnly))
                    {
                        dateGroups[dateOnly] = new TimelineDataPoint { Date = dateOnly };
                    }
                    dateGroups[dateOnly].NodeCount++;
                    processedObjectIds.Add(prop.ObjectId);
                    itemsWithDates++;
                }
            }

            // Подсчитываем объекты без дат
            var allObjectIds = await _context.GraphObjects.Select(o => o.Id).ToListAsync();
            itemsWithoutDates += allObjectIds.Count - processedObjectIds.Count;

            // Обрабатываем свойства связей
            var processedRelationIds = new HashSet<int>();
            foreach (var prop in relationProperties)
            {
                if (prop.Relation == null || processedRelationIds.Contains(prop.RelationId))
                    continue;

                if (IsDateProperty(prop.Key) && TryParseDate(prop.Value, out var date))
                {
                    var dateOnly = date.Date;
                    if (!dateGroups.ContainsKey(dateOnly))
                    {
                        dateGroups[dateOnly] = new TimelineDataPoint { Date = dateOnly };
                    }
                    dateGroups[dateOnly].EdgeCount++;
                    processedRelationIds.Add(prop.RelationId);
                    itemsWithDates++;
                }
            }

            // Подсчитываем связи без дат
            var allRelationIds = await _context.GraphRelations.Select(r => r.Id).ToListAsync();
            itemsWithoutDates += allRelationIds.Count - processedRelationIds.Count;

            // Сортируем по дате
            response.DataPoints = dateGroups.Values.OrderBy(d => d.Date).ToList();

            if (response.DataPoints.Any())
            {
                response.MinDate = response.DataPoints.First().Date;
                response.MaxDate = response.DataPoints.Last().Date;
            }

            response.TotalItemsWithDates = itemsWithDates;
            response.TotalItemsWithoutDates = itemsWithoutDates;

            return response;
        }

        public async Task<TimelineBoundariesResponse> GetTimelineBoundariesAsync()
        {
            var stats = await GetTimelineStatsAsync();
            return new TimelineBoundariesResponse
            {
                MinDate = stats.MinDate,
                MaxDate = stats.MaxDate
            };
        }

        private static bool IsDateProperty(string? key)
        {
            if (string.IsNullOrWhiteSpace(key))
                return false;
            
            return DatePropertyKeys.Any(dk => 
                key.Equals(dk, StringComparison.OrdinalIgnoreCase) ||
                key.Replace("_", "").Replace("-", "").Equals(dk.Replace("_", ""), StringComparison.OrdinalIgnoreCase)
            );
        }

        private static bool TryParseDate(string? value, out DateTime result)
        {
            result = default;
            if (string.IsNullOrWhiteSpace(value))
                return false;

            // Пробуем Unix timestamp
            if (long.TryParse(value, out var unixTimestamp))
            {
                // Если это миллисекунды (число больше 10^12)
                if (unixTimestamp > 1_000_000_000_000)
                {
                    result = DateTimeOffset.FromUnixTimeMilliseconds(unixTimestamp).DateTime;
                    return true;
                }
                // Если это секунды
                if (unixTimestamp > 1_000_000_000)
                {
                    result = DateTimeOffset.FromUnixTimeSeconds(unixTimestamp).DateTime;
                    return true;
                }
            }

            // Пробуем стандартные форматы
            foreach (var format in DateFormats)
            {
                if (DateTime.TryParseExact(value, format, CultureInfo.InvariantCulture, 
                    DateTimeStyles.None, out result))
                {
                    return true;
                }
            }

            // Пробуем общий парсинг
            return DateTime.TryParse(value, CultureInfo.InvariantCulture, 
                DateTimeStyles.None, out result);
        }
    }
}
