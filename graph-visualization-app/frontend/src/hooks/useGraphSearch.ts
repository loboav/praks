import { useState, useCallback } from 'react';
import { GraphObject, GraphRelation } from '../types/graph';
import { toast } from 'react-toastify';

export interface SearchOptions {
  searchInNames?: boolean;
  searchInProperties?: boolean;
  searchInTypeDescriptions?: boolean;
  objectTypeIds?: number[];
  relationTypeIds?: number[];
  useRegex?: boolean;
  useFuzzySearch?: boolean;
  fuzzyMaxDistance?: number;
  caseSensitive?: boolean;
  wholeWordOnly?: boolean;
  maxResults?: number;
  minRelevance?: number;
}

export interface SearchMatch {
  type: 'Name' | 'PropertyKey' | 'PropertyValue' | 'TypeDescription' | 'TypeName';
  field: string;
  value: string;
  position: number;
  length: number;
}

export interface ObjectSearchResult {
  object: GraphObject;
  relevance: number;
  matches: SearchMatch[];
}

export interface RelationSearchResult {
  relation: GraphRelation;
  relevance: number;
  matches: SearchMatch[];
}

export interface SearchResults {
  objects: ObjectSearchResult[];
  relations: RelationSearchResult[];
  totalFound: number;
  searchDurationMs: number;
  query: string;
}

export const useGraphSearch = () => {
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Выполнить поиск по графу
   */
  const search = useCallback(async (query: string, options?: SearchOptions) => {
    if (!query || query.trim().length === 0) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    setSearchQuery(query);

    try {
      const defaultOptions: SearchOptions = {
        searchInNames: true,
        searchInProperties: true,
        searchInTypeDescriptions: false,
        useFuzzySearch: false,
        fuzzyMaxDistance: 1,
        caseSensitive: false,
        wholeWordOnly: false,
        maxResults: 100,
        minRelevance: 0.0,
        ...options,
      };

      const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(defaultOptions),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const results: SearchResults = await response.json();
      setSearchResults(results);

      if (results.totalFound === 0) {
        toast.info(`Ничего не найдено по запросу "${query}"`);
      } else {
        toast.success(
          `Найдено: ${results.objects.length} объектов, ${results.relations.length} связей (${results.searchDurationMs.toFixed(1)}ms)`
        );
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Ошибка поиска: ' + (error as Error).message);
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Быстрый поиск (GET запрос с минимальными опциями)
   */
  const quickSearch = useCallback(async (query: string, limit: number = 50, fuzzy: boolean = false) => {
    if (!query || query.trim().length === 0) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    setSearchQuery(query);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&limit=${limit}&fuzzy=${fuzzy}`
      );

      if (!response.ok) {
        throw new Error(`Quick search failed: ${response.statusText}`);
      }

      const results: SearchResults = await response.json();
      setSearchResults(results);
    } catch (error) {
      console.error('Quick search error:', error);
      toast.error('Ошибка быстрого поиска');
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Поиск только объектов
   */
  const searchObjects = useCallback(async (query: string, options?: SearchOptions) => {
    if (!query || query.trim().length === 0) {
      return [];
    }

    setIsSearching(true);

    try {
      const response = await fetch(`/api/search/objects?query=${encodeURIComponent(query)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options || {}),
      });

      if (!response.ok) {
        throw new Error(`Object search failed: ${response.statusText}`);
      }

      const results: ObjectSearchResult[] = await response.json();
      return results;
    } catch (error) {
      console.error('Object search error:', error);
      toast.error('Ошибка поиска объектов');
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Поиск только связей
   */
  const searchRelations = useCallback(async (query: string, options?: SearchOptions) => {
    if (!query || query.trim().length === 0) {
      return [];
    }

    setIsSearching(true);

    try {
      const response = await fetch(`/api/search/relations?query=${encodeURIComponent(query)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options || {}),
      });

      if (!response.ok) {
        throw new Error(`Relation search failed: ${response.statusText}`);
      }

      const results: RelationSearchResult[] = await response.json();
      return results;
    } catch (error) {
      console.error('Relation search error:', error);
      toast.error('Ошибка поиска связей');
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Очистить результаты поиска
   */
  const clearSearch = useCallback(() => {
    setSearchResults(null);
    setSearchQuery('');
  }, []);

  /**
   * Получить ID найденных объектов
   */
  const getFoundObjectIds = useCallback((): number[] => {
    if (!searchResults) return [];
    return searchResults.objects.map((r) => r.object.id);
  }, [searchResults]);

  /**
   * Получить ID найденных связей
   */
  const getFoundRelationIds = useCallback((): number[] => {
    if (!searchResults) return [];
    return searchResults.relations.map((r) => r.relation.id);
  }, [searchResults]);

  return {
    searchResults,
    isSearching,
    searchQuery,
    search,
    quickSearch,
    searchObjects,
    searchRelations,
    clearSearch,
    getFoundObjectIds,
    getFoundRelationIds,
  };
};
