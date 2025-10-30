namespace GraphVisualizationApp.Models
{
    /// <summary>
    /// Опции для полнотекстового поиска по графу
    /// </summary>
    public class SearchOptions
    {
        /// <summary>
        /// Поиск по имени объекта/связи
        /// </summary>
        public bool SearchInNames { get; set; } = true;

        /// <summary>
        /// Поиск по свойствам (ключи и значения)
        /// </summary>
        public bool SearchInProperties { get; set; } = true;

        /// <summary>
        /// Поиск по описанию типа
        /// </summary>
        public bool SearchInTypeDescriptions { get; set; } = false;

        /// <summary>
        /// Фильтр по типам объектов (если пусто - все типы)
        /// </summary>
        public List<int> ObjectTypeIds { get; set; } = new List<int>();

        /// <summary>
        /// Фильтр по типам связей (если пусто - все типы)
        /// </summary>
        public List<int> RelationTypeIds { get; set; } = new List<int>();

        /// <summary>
        /// Использовать регулярные выражения
        /// </summary>
        public bool UseRegex { get; set; } = false;

        /// <summary>
        /// Нечёткий поиск (fuzzy search) - допускает опечатки
        /// </summary>
        public bool UseFuzzySearch { get; set; } = false;

        /// <summary>
        /// Максимальное расстояние Левенштейна для fuzzy search (1-3)
        /// </summary>
        public int FuzzyMaxDistance { get; set; } = 1;

        /// <summary>
        /// Регистрозависимый поиск
        /// </summary>
        public bool CaseSensitive { get; set; } = false;

        /// <summary>
        /// Искать только целые слова
        /// </summary>
        public bool WholeWordOnly { get; set; } = false;

        /// <summary>
        /// Максимальное количество результатов (0 = без ограничений)
        /// </summary>
        public int MaxResults { get; set; } = 100;

        /// <summary>
        /// Минимальная релевантность (0.0 - 1.0)
        /// </summary>
        public double MinRelevance { get; set; } = 0.0;
    }

    /// <summary>
    /// Результат поиска объекта
    /// </summary>
    public class ObjectSearchResult
    {
        public GraphObject Object { get; set; } = null!;
        
        /// <summary>
        /// Релевантность результата (0.0 - 1.0)
        /// </summary>
        public double Relevance { get; set; }

        /// <summary>
        /// Где найдено совпадение
        /// </summary>
        public List<SearchMatch> Matches { get; set; } = new List<SearchMatch>();
    }

    /// <summary>
    /// Результат поиска связи
    /// </summary>
    public class RelationSearchResult
    {
        public GraphRelation Relation { get; set; } = null!;
        
        /// <summary>
        /// Релевантность результата (0.0 - 1.0)
        /// </summary>
        public double Relevance { get; set; }

        /// <summary>
        /// Где найдено совпадение
        /// </summary>
        public List<SearchMatch> Matches { get; set; } = new List<SearchMatch>();
    }

    /// <summary>
    /// Информация о совпадении при поиске
    /// </summary>
    public class SearchMatch
    {
        /// <summary>
        /// Тип совпадения
        /// </summary>
        public SearchMatchType Type { get; set; }

        /// <summary>
        /// Поле, в котором найдено совпадение
        /// </summary>
        public string Field { get; set; } = string.Empty;

        /// <summary>
        /// Найденное значение
        /// </summary>
        public string Value { get; set; } = string.Empty;

        /// <summary>
        /// Позиция начала совпадения в строке
        /// </summary>
        public int Position { get; set; }

        /// <summary>
        /// Длина совпадения
        /// </summary>
        public int Length { get; set; }
    }

    /// <summary>
    /// Тип совпадения при поиске
    /// </summary>
    public enum SearchMatchType
    {
        /// <summary>
        /// Совпадение в имени
        /// </summary>
        Name,

        /// <summary>
        /// Совпадение в ключе свойства
        /// </summary>
        PropertyKey,

        /// <summary>
        /// Совпадение в значении свойства
        /// </summary>
        PropertyValue,

        /// <summary>
        /// Совпадение в описании типа
        /// </summary>
        TypeDescription,

        /// <summary>
        /// Совпадение в имени типа
        /// </summary>
        TypeName
    }

    /// <summary>
    /// Комбинированный результат поиска
    /// </summary>
    public class SearchResults
    {
        public List<ObjectSearchResult> Objects { get; set; } = new List<ObjectSearchResult>();
        public List<RelationSearchResult> Relations { get; set; } = new List<RelationSearchResult>();
        public int TotalFound { get; set; }
        public double SearchDurationMs { get; set; }
        public string Query { get; set; } = string.Empty;
    }
}
