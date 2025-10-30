using GraphVisualizationApp.Models;
using GraphVisualizationApp.Services;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Controllers
{
    /// <summary>
    /// Контроллер для полнотекстового поиска по графу
    /// </summary>
    [ApiController]
    [Route("api/search")]
    public class SearchController : ControllerBase
    {
        private readonly IGraphService _graphService;

        public SearchController(IGraphService graphService)
        {
            _graphService = graphService;
        }

        /// <summary>
        /// Комбинированный поиск по объектам и связям
        /// </summary>
        /// <param name="query">Поисковый запрос</param>
        /// <param name="options">Опции поиска (опционально)</param>
        /// <returns>Результаты поиска с релевантностью</returns>
        /// <response code="200">Успешный поиск</response>
        /// <response code="400">Пустой запрос</response>
        [HttpPost]
        [ProducesResponseType(typeof(SearchResults), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Search([FromQuery] string query, [FromBody] SearchOptions? options = null)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest(new { error = "Query cannot be empty" });
            }

            var results = await _graphService.SearchAsync(query, options);
            return Ok(results);
        }

        /// <summary>
        /// Поиск только объектов
        /// </summary>
        /// <param name="query">Поисковый запрос</param>
        /// <param name="options">Опции поиска (опционально)</param>
        /// <returns>Найденные объекты с релевантностью</returns>
        [HttpPost("objects")]
        [ProducesResponseType(typeof(ObjectSearchResult[]), 200)]
        public async Task<IActionResult> SearchObjects([FromQuery] string query, [FromBody] SearchOptions? options = null)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest(new { error = "Query cannot be empty" });
            }

            var results = await _graphService.SearchObjectsAsync(query, options);
            return Ok(results);
        }

        /// <summary>
        /// Поиск только связей
        /// </summary>
        /// <param name="query">Поисковый запрос</param>
        /// <param name="options">Опции поиска (опционально)</param>
        /// <returns>Найденные связи с релевантностью</returns>
        [HttpPost("relations")]
        [ProducesResponseType(typeof(RelationSearchResult[]), 200)]
        public async Task<IActionResult> SearchRelations([FromQuery] string query, [FromBody] SearchOptions? options = null)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest(new { error = "Query cannot be empty" });
            }

            var results = await _graphService.SearchRelationsAsync(query, options);
            return Ok(results);
        }

        /// <summary>
        /// Быстрый поиск с настройками по умолчанию (GET запрос)
        /// </summary>
        /// <param name="q">Поисковый запрос</param>
        /// <param name="limit">Максимальное количество результатов</param>
        /// <param name="fuzzy">Использовать нечёткий поиск</param>
        /// <returns>Результаты поиска</returns>
        [HttpGet]
        [ProducesResponseType(typeof(SearchResults), 200)]
        public async Task<IActionResult> QuickSearch(
            [FromQuery] string q, 
            [FromQuery] int limit = 50,
            [FromQuery] bool fuzzy = false)
        {
            if (string.IsNullOrWhiteSpace(q))
            {
                return BadRequest(new { error = "Query cannot be empty" });
            }

            var options = new SearchOptions
            {
                MaxResults = limit,
                UseFuzzySearch = fuzzy,
                FuzzyMaxDistance = 1,
                SearchInNames = true,
                SearchInProperties = true,
                SearchInTypeDescriptions = false
            };

            var results = await _graphService.SearchAsync(q, options);
            return Ok(results);
        }
    }
}
