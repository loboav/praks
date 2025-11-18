namespace GraphVisualizationApp.Models
{
    /// <summary>
    /// Configuration settings for caching behavior
    /// </summary>
    public class CacheSettings
    {
        public TimeSpan ObjectsCacheDuration { get; set; } = TimeSpan.FromMinutes(5);
        public TimeSpan RelationsCacheDuration { get; set; } = TimeSpan.FromMinutes(5);
        public TimeSpan ObjectTypesCacheDuration { get; set; } = TimeSpan.FromMinutes(10);
        public TimeSpan RelationTypesCacheDuration { get; set; } = TimeSpan.FromMinutes(10);
    }

    /// <summary>
    /// Configuration settings for API behavior
    /// </summary>
    public class ApiSettings
    {
        public int MaxObjectsPerRequest { get; set; } = 1000;
        public int MaxRelationsPerRequest { get; set; } = 5000;
        public int MaxPropertiesPerObject { get; set; } = 100;
    }

    /// <summary>
    /// Configuration settings for JWT tokens
    /// </summary>
    public class JwtSettings
    {
        public string SecretKey { get; set; } = string.Empty;
        public string Issuer { get; set; } = string.Empty;
        public string Audience { get; set; } = string.Empty;
        public int ExpirationHours { get; set; } = 24;
    }

    /// <summary>
    /// Root application settings configuration
    /// </summary>
    public class ApplicationSettings
    {
        public CacheSettings? Cache { get; set; }
        public ApiSettings? Api { get; set; }
        public JwtSettings? Jwt { get; set; }
    }
}
