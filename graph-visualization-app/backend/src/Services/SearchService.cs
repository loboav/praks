using GraphVisualizationApp.Models;
using GraphVisualizationApp.Algorithms;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Services
{
    /// <summary>
    /// Сервис для полнотекстового поиска по объектам и связям
    /// </summary>
    public class SearchService : ISearchService
    {
        private readonly GraphDbContext _db;

        public SearchService(GraphDbContext db)
        {
            _db = db;
        }

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

                // Поиск в имени объекта
                if (options.SearchInNames && !string.IsNullOrEmpty(obj.Name) &&
                    IsMatch(obj.Name, query, options, out var nameRel, out var namePos, out var nameLen))
                {
                    matches.Add(new SearchMatch
                    {
                        Type = SearchMatchType.Name,
                        Field = "Name",
                        Value = obj.Name,
                        Position = namePos,
                        Length = nameLen
                    });
                    maxRelevance = Math.Max(maxRelevance, nameRel);
                }

                // Поиск в свойствах объекта
                if (options.SearchInProperties && obj.Properties != null)
                {
                    foreach (var prop in obj.Properties)
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

                // Поиск в типе объекта
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

            results = results.OrderByDescending(r => r.Relevance).ToList();

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

            // Получаем все связи с типами, свойствами и связанными объектами
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
