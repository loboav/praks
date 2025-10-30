using System;
using System.Text.RegularExpressions;

namespace GraphVisualizationApp.Algorithms
{
    /// <summary>
    /// Утилиты для нечёткого поиска (fuzzy matching)
    /// </summary>
    public static class FuzzyMatcher
    {
        /// <summary>
        /// Вычисляет расстояние Левенштейна между двумя строками
        /// </summary>
        public static int LevenshteinDistance(string source, string target)
        {
            if (string.IsNullOrEmpty(source))
                return string.IsNullOrEmpty(target) ? 0 : target.Length;

            if (string.IsNullOrEmpty(target))
                return source.Length;

            int sourceLength = source.Length;
            int targetLength = target.Length;

            var distance = new int[sourceLength + 1, targetLength + 1];

            // Инициализация первой строки и столбца
            for (int i = 0; i <= sourceLength; distance[i, 0] = i++) { }
            for (int j = 0; j <= targetLength; distance[0, j] = j++) { }

            for (int i = 1; i <= sourceLength; i++)
            {
                for (int j = 1; j <= targetLength; j++)
                {
                    int cost = (target[j - 1] == source[i - 1]) ? 0 : 1;

                    distance[i, j] = Math.Min(
                        Math.Min(distance[i - 1, j] + 1, distance[i, j - 1] + 1),
                        distance[i - 1, j - 1] + cost);
                }
            }

            return distance[sourceLength, targetLength];
        }

        /// <summary>
        /// Проверяет, соответствует ли текст запросу с учётом нечёткого поиска
        /// </summary>
        public static bool FuzzyMatch(string text, string query, int maxDistance, bool caseSensitive = false)
        {
            if (string.IsNullOrEmpty(text) || string.IsNullOrEmpty(query))
                return false;

            if (!caseSensitive)
            {
                text = text.ToLowerInvariant();
                query = query.ToLowerInvariant();
            }

            // Точное совпадение
            if (text.Contains(query))
                return true;

            // Проверяем каждое слово в тексте
            var words = text.Split(new[] { ' ', ',', '.', ';', ':', '-', '_' }, StringSplitOptions.RemoveEmptyEntries);
            
            foreach (var word in words)
            {
                if (LevenshteinDistance(word, query) <= maxDistance)
                    return true;
            }

            return false;
        }

        /// <summary>
        /// Вычисляет релевантность совпадения (0.0 - 1.0)
        /// </summary>
        public static double CalculateRelevance(string text, string query, bool caseSensitive = false)
        {
            if (string.IsNullOrEmpty(text) || string.IsNullOrEmpty(query))
                return 0.0;

            if (!caseSensitive)
            {
                text = text.ToLowerInvariant();
                query = query.ToLowerInvariant();
            }

            // Точное совпадение = максимальная релевантность
            if (text == query)
                return 1.0;

            // Содержит запрос целиком
            if (text.Contains(query))
            {
                // Чем ближе к началу, тем выше релевантность
                int position = text.IndexOf(query, StringComparison.Ordinal);
                double positionScore = 1.0 - (position / (double)text.Length * 0.3);
                
                // Чем больше доля совпадения, тем выше релевантность
                double lengthScore = query.Length / (double)text.Length;
                
                return Math.Min(1.0, (positionScore + lengthScore) / 2.0);
            }

            // Fuzzy matching - используем расстояние Левенштейна
            int distance = LevenshteinDistance(text, query);
            int maxLength = Math.Max(text.Length, query.Length);
            
            if (maxLength == 0)
                return 0.0;

            return Math.Max(0.0, 1.0 - (distance / (double)maxLength));
        }

        /// <summary>
        /// Находит позицию и длину совпадения в тексте
        /// </summary>
        public static (int position, int length) FindMatch(string text, string query, bool caseSensitive = false)
        {
            if (string.IsNullOrEmpty(text) || string.IsNullOrEmpty(query))
                return (-1, 0);

            var searchText = caseSensitive ? text : text.ToLowerInvariant();
            var searchQuery = caseSensitive ? query : query.ToLowerInvariant();

            int position = searchText.IndexOf(searchQuery, StringComparison.Ordinal);
            
            if (position >= 0)
                return (position, query.Length);

            return (-1, 0);
        }

        /// <summary>
        /// Проверяет совпадение по регулярному выражению
        /// </summary>
        public static bool RegexMatch(string text, string pattern, bool caseSensitive = false)
        {
            if (string.IsNullOrEmpty(text) || string.IsNullOrEmpty(pattern))
                return false;

            try
            {
                var options = caseSensitive ? RegexOptions.None : RegexOptions.IgnoreCase;
                return Regex.IsMatch(text, pattern, options);
            }
            catch (ArgumentException)
            {
                // Невалидное регулярное выражение - возвращаем false
                return false;
            }
        }

        /// <summary>
        /// Находит совпадение по регулярному выражению
        /// </summary>
        public static (int position, int length) FindRegexMatch(string text, string pattern, bool caseSensitive = false)
        {
            if (string.IsNullOrEmpty(text) || string.IsNullOrEmpty(pattern))
                return (-1, 0);

            try
            {
                var options = caseSensitive ? RegexOptions.None : RegexOptions.IgnoreCase;
                var match = Regex.Match(text, pattern, options);
                
                if (match.Success)
                    return (match.Index, match.Length);
            }
            catch (ArgumentException)
            {
                // Невалидное регулярное выражение
            }

            return (-1, 0);
        }
    }
}
