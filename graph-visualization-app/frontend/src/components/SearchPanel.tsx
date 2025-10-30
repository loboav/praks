import React, { useState, useEffect } from 'react';
import { useGraphSearch, SearchOptions, ObjectSearchResult, RelationSearchResult } from '../hooks/useGraphSearch';

interface SearchPanelProps {
  onObjectSelect?: (objectId: number) => void;
  onRelationSelect?: (relationId: number) => void;
  onHighlightResults?: (objectIds: number[], relationIds: number[]) => void;
  onClose?: () => void;
}

export default function SearchPanel({ 
  onObjectSelect, 
  onRelationSelect, 
  onHighlightResults,
  onClose
}: SearchPanelProps) {
  const {
    searchResults,
    isSearching,
    searchQuery,
    search,
    clearSearch,
    getFoundObjectIds,
    getFoundRelationIds,
  } = useGraphSearch();

  const [query, setQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [options, setOptions] = useState<SearchOptions>({
    searchInNames: true,
    searchInProperties: true,
    searchInTypeDescriptions: false,
    useFuzzySearch: false,
    fuzzyMaxDistance: 1,
    caseSensitive: false,
    wholeWordOnly: false,
    maxResults: 100,
  });

  // Подсветка результатов при изменении
  useEffect(() => {
    if (searchResults && onHighlightResults) {
      const objectIds = getFoundObjectIds();
      const relationIds = getFoundRelationIds();
      onHighlightResults(objectIds, relationIds);
    }
  }, [searchResults, onHighlightResults, getFoundObjectIds, getFoundRelationIds]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      search(query, options);
    }
  };

  const handleClear = () => {
    setQuery('');
    clearSearch();
    if (onHighlightResults) {
      onHighlightResults([], []);
    }
  };

  const handleObjectClick = (result: ObjectSearchResult) => {
    if (onObjectSelect) {
      onObjectSelect(result.object.id);
    }
  };

  const handleRelationClick = (result: RelationSearchResult) => {
    if (onRelationSelect) {
      onRelationSelect(result.relation.id);
    }
  };

  const getMatchTypeIcon = (type: string) => {
    switch (type) {
      case 'Name':
        return '📝';
      case 'PropertyKey':
        return '🔑';
      case 'PropertyValue':
        return '💎';
      case 'TypeName':
        return '🏷️';
      case 'TypeDescription':
        return '📄';
      default:
        return '🔍';
    }
  };

  const highlightText = (text: string, position: number, length: number) => {
    if (position < 0 || length === 0) return text;
    
    const before = text.substring(0, position);
    const match = text.substring(position, position + length);
    const after = text.substring(position + length);
    
    return (
      <>
        {before}
        <mark style={{ backgroundColor: '#ffeb3b', fontWeight: 'bold' }}>{match}</mark>
        {after}
      </>
    );
  };

  return (
    <div style={styles.container}>
      {/* Заголовок панели */}
      <div style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9f9f9' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>🔍 Поиск по графу</h3>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f44336';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#666';
            }}
            title="Закрыть (Esc)"
          >
            ✕
          </button>
        )}
      </div>
      
      <form onSubmit={handleSearch} style={styles.searchForm}>
        <div style={styles.searchInputContainer}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по графу... (Ctrl+F)"
            style={styles.searchInput}
            disabled={isSearching}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              style={styles.clearButton}
              title="Очистить"
            >
              ✕
            </button>
          )}
          <button
            type="submit"
            style={styles.searchButton}
            disabled={isSearching || !query.trim()}
          >
            {isSearching ? '⏳' : '🔍'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={styles.advancedToggle}
        >
          {showAdvanced ? '▼' : '▶'} Расширенный поиск
        </button>

        {showAdvanced && (
          <div style={styles.advancedOptions}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={options.searchInNames}
                onChange={(e) => setOptions({ ...options, searchInNames: e.target.checked })}
              />
              Искать в именах
            </label>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={options.searchInProperties}
                onChange={(e) => setOptions({ ...options, searchInProperties: e.target.checked })}
              />
              Искать в свойствах
            </label>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={options.searchInTypeDescriptions}
                onChange={(e) => setOptions({ ...options, searchInTypeDescriptions: e.target.checked })}
              />
              Искать в описаниях типов
            </label>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={options.useFuzzySearch}
                onChange={(e) => setOptions({ ...options, useFuzzySearch: e.target.checked })}
              />
              Нечёткий поиск (допускает опечатки)
            </label>

            {options.useFuzzySearch && (
              <label style={styles.inputLabel}>
                Макс. расстояние:
                <input
                  type="number"
                  min="1"
                  max="3"
                  value={options.fuzzyMaxDistance}
                  onChange={(e) => setOptions({ ...options, fuzzyMaxDistance: parseInt(e.target.value) })}
                  style={styles.numberInput}
                />
              </label>
            )}

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={options.caseSensitive}
                onChange={(e) => setOptions({ ...options, caseSensitive: e.target.checked })}
              />
              Учитывать регистр
            </label>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={options.wholeWordOnly}
                onChange={(e) => setOptions({ ...options, wholeWordOnly: e.target.checked })}
              />
              Только целые слова
            </label>

            <label style={styles.inputLabel}>
              Макс. результатов:
              <input
                type="number"
                min="10"
                max="1000"
                value={options.maxResults}
                onChange={(e) => setOptions({ ...options, maxResults: parseInt(e.target.value) })}
                style={styles.numberInput}
              />
            </label>
          </div>
        )}
      </form>

      {searchResults && (
        <div style={styles.results}>
          <div style={styles.resultsHeader}>
            <h3 style={styles.resultsTitle}>
              Найдено: {searchResults.totalFound} ({searchResults.searchDurationMs.toFixed(1)}ms)
            </h3>
            {searchResults.query && (
              <div style={styles.queryInfo}>Запрос: "{searchResults.query}"</div>
            )}
          </div>

          {searchResults.objects.length > 0 && (
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>📦 Объекты ({searchResults.objects.length})</h4>
              {searchResults.objects.map((result, idx) => (
                <div
                  key={result.object.id}
                  style={styles.resultItem}
                  onClick={() => handleObjectClick(result)}
                >
                  <div style={styles.resultHeader}>
                    <span style={styles.resultName}>{result.object.name}</span>
                    <span style={styles.relevance}>
                      {(result.relevance * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={styles.matches}>
                    {result.matches.map((match, mIdx) => (
                      <div key={mIdx} style={styles.match}>
                        <span style={styles.matchIcon}>{getMatchTypeIcon(match.type)}</span>
                        <span style={styles.matchField}>{match.field}:</span>
                        <span style={styles.matchValue}>
                          {highlightText(match.value, match.position, match.length)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchResults.relations.length > 0 && (
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>🔗 Связи ({searchResults.relations.length})</h4>
              {searchResults.relations.map((result, idx) => (
                <div
                  key={result.relation.id}
                  style={styles.resultItem}
                  onClick={() => handleRelationClick(result)}
                >
                  <div style={styles.resultHeader}>
                    <span style={styles.resultName}>
                      {result.relation.source} → {result.relation.target}
                    </span>
                    <span style={styles.relevance}>
                      {(result.relevance * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={styles.matches}>
                    {result.matches.map((match, mIdx) => (
                      <div key={mIdx} style={styles.match}>
                        <span style={styles.matchIcon}>{getMatchTypeIcon(match.type)}</span>
                        <span style={styles.matchField}>{match.field}:</span>
                        <span style={styles.matchValue}>
                          {highlightText(match.value, match.position, match.length)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchResults.totalFound === 0 && (
            <div style={styles.noResults}>
              Ничего не найдено по запросу "{searchResults.query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '350px',
    height: '100%',
    backgroundColor: '#fff',
    borderLeft: '1px solid #ddd',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  searchForm: {
    padding: '15px',
    borderBottom: '1px solid #eee',
  },
  searchInputContainer: {
    display: 'flex',
    gap: '5px',
    marginBottom: '10px',
  },
  searchInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  clearButton: {
    padding: '8px 12px',
    border: 'none',
    background: '#f5f5f5',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  searchButton: {
    padding: '8px 16px',
    border: 'none',
    background: '#2196F3',
    color: '#fff',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '18px',
  },
  advancedToggle: {
    padding: '6px 10px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#666',
  },
  advancedOptions: {
    marginTop: '10px',
    padding: '10px',
    background: '#f9f9f9',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  inputLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
  },
  numberInput: {
    width: '60px',
    padding: '4px 8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  results: {
    flex: 1,
    overflow: 'auto',
    padding: '15px',
  },
  resultsHeader: {
    marginBottom: '15px',
  },
  resultsTitle: {
    margin: '0 0 5px 0',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  queryInfo: {
    fontSize: '12px',
    color: '#666',
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  resultItem: {
    padding: '10px',
    marginBottom: '8px',
    background: '#f9f9f9',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  resultName: {
    fontWeight: 'bold',
    fontSize: '14px',
  },
  relevance: {
    fontSize: '12px',
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  matches: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  match: {
    fontSize: '12px',
    display: 'flex',
    gap: '6px',
    alignItems: 'flex-start',
  },
  matchIcon: {
    fontSize: '14px',
  },
  matchField: {
    color: '#666',
    fontWeight: '500',
    minWidth: '80px',
  },
  matchValue: {
    flex: 1,
    wordBreak: 'break-word',
  },
  noResults: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#999',
    fontSize: '14px',
  },
};
