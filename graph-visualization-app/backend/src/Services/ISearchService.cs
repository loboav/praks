using GraphVisualizationApp.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Services
{
    /// <summary>
    /// Сервис для полнотекстового поиска по объектам и связям
    /// </summary>
    public interface ISearchService
    {
        Task<SearchResults> SearchAsync(string query, SearchOptions? options = null);
        Task<List<ObjectSearchResult>> SearchObjectsAsync(string query, SearchOptions? options = null);
        Task<List<RelationSearchResult>> SearchRelationsAsync(string query, SearchOptions? options = null);
    }
}
