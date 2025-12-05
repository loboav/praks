using GraphVisualizationApp.Models;
using System.Linq;

namespace GraphVisualizationApp.Services
{
    /// <summary>
    /// Helper класс для преобразования моделей в DTO
    /// </summary>
    public static class DtoMapper
    {
        public static object ToDto(ObjectType type)
        {
            return new { type.Id, type.Name, type.Description, type.Color, type.Icon };
        }

        public static object ToDto(RelationType type)
        {
            return new { type.Id, type.Name, type.Description, type.Color, type.ObjectTypeId };
        }

        public static object ToDto(GraphObject obj)
        {
            return new
            {
                obj.Id,
                obj.Name,
                obj.ObjectTypeId,
                obj.Color,
                obj.Icon,
                Properties = obj.Properties?.ToDictionary(p => p.Key!, p => p.Value ?? string.Empty) ?? new System.Collections.Generic.Dictionary<string, string>()
            };
        }

        public static object ToDto(GraphRelation rel)
        {
            return new
            {
                rel.Id,
                rel.Source,
                rel.Target,
                rel.RelationTypeId,
                rel.Color,
                Properties = rel.Properties?.ToDictionary(p => p.Key!, p => p.Value ?? string.Empty) ?? new System.Collections.Generic.Dictionary<string, string>()
            };
        }
    }
}
