using GraphVisualizationApp.Models;
using System.Text;
using System.Text.Json;
using System.Xml.Linq;
using ClosedXML.Excel;

namespace GraphVisualizationApp.Services
{
    public class ExportService : IExportService
    {
        private readonly IGraphService _graphService;

        public ExportService(IGraphService graphService)
        {
            _graphService = graphService;
        }

        public async Task<string> ExportToJsonAsync()
        {
            var objects = await _graphService.GetObjectsAsync();
            var relations = await _graphService.GetRelationsAsync();
            var objectTypes = await _graphService.GetObjectTypesAsync();
            var relationTypes = await _graphService.GetRelationTypesAsync();

            var export = new
            {
                metadata = new
                {
                    exportDate = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss"),
                    version = "1.0",
                    nodesCount = objects.Count,
                    edgesCount = relations.Count
                },
                objectTypes = objectTypes.Select(ot => new
                {
                    id = ot.Id,
                    name = ot.Name,
                    description = ot.Description,
                    color = ot.Color,
                    icon = ot.Icon
                }),
                relationTypes = relationTypes.Select(rt => new
                {
                    id = rt.Id,
                    name = rt.Name,
                    description = rt.Description,
                    objectTypeId = rt.ObjectTypeId,
                    color = rt.Color
                }),
                nodes = objects.Select(o => new
                {
                    id = o.Id,
                    name = o.Name,
                    objectTypeId = o.ObjectTypeId,
                    positionX = o.PositionX,
                    positionY = o.PositionY,
                    color = o.Color,
                    icon = o.Icon,
                    properties = o.Properties?.ToDictionary(p => p.Key ?? "", p => p.Value ?? "")
                }),
                edges = relations.Select(r => new
                {
                    id = r.Id,
                    source = r.Source,
                    target = r.Target,
                    relationTypeId = r.RelationTypeId,
                    color = r.Color,
                    properties = r.Properties?.ToDictionary(p => p.Key ?? "", p => p.Value ?? "")
                })
            };

            return JsonSerializer.Serialize(export, new JsonSerializerOptions
            {
                WriteIndented = true,
                Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
            });
        }

        public async Task<string> ExportToGraphMLAsync()
        {
            var objects = await _graphService.GetObjectsAsync();
            var relations = await _graphService.GetRelationsAsync();

            try
            {
                var objectTypes = await _graphService.GetObjectTypesAsync();
                var relationTypes = await _graphService.GetRelationTypesAsync();
                
                // Опции JSON для корректной кодировки кириллицы
                var jsonOptions = new JsonSerializerOptions
                {
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                };
                
                XNamespace ns = "http://graphml.graphdrawing.org/xmlns";
                var graphml = new XDocument(
                    new XDeclaration("1.0", "UTF-8", "yes"),
                    new XElement(ns + "graphml",
                        // Ключи для узлов
                        new XElement(ns + "key",
                            new XAttribute("id", "name"),
                            new XAttribute("for", "node"),
                            new XAttribute("attr.name", "name"),
                            new XAttribute("attr.type", "string")
                        ),
                        new XElement(ns + "key",
                            new XAttribute("id", "type"),
                            new XAttribute("for", "node"),
                            new XAttribute("attr.name", "type"),
                            new XAttribute("attr.type", "string")
                        ),
                        new XElement(ns + "key",
                            new XAttribute("id", "color"),
                            new XAttribute("for", "node"),
                            new XAttribute("attr.name", "color"),
                            new XAttribute("attr.type", "string")
                        ),
                        new XElement(ns + "key",
                            new XAttribute("id", "x"),
                            new XAttribute("for", "node"),
                            new XAttribute("attr.name", "x"),
                            new XAttribute("attr.type", "double")
                        ),
                        new XElement(ns + "key",
                            new XAttribute("id", "y"),
                            new XAttribute("for", "node"),
                            new XAttribute("attr.name", "y"),
                            new XAttribute("attr.type", "double")
                        ),
                        new XElement(ns + "key",
                            new XAttribute("id", "properties"),
                            new XAttribute("for", "node"),
                            new XAttribute("attr.name", "properties"),
                            new XAttribute("attr.type", "string")
                        ),
                        // Ключи для рёбер
                        new XElement(ns + "key",
                            new XAttribute("id", "relationType"),
                            new XAttribute("for", "edge"),
                            new XAttribute("attr.name", "relationType"),
                            new XAttribute("attr.type", "string")
                        ),
                        new XElement(ns + "key",
                            new XAttribute("id", "edgeColor"),
                            new XAttribute("for", "edge"),
                            new XAttribute("attr.name", "color"),
                            new XAttribute("attr.type", "string")
                        ),
                        new XElement(ns + "key",
                            new XAttribute("id", "edgeProperties"),
                            new XAttribute("for", "edge"),
                            new XAttribute("attr.name", "properties"),
                            new XAttribute("attr.type", "string")
                        ),
                        new XElement(ns + "graph",
                            new XAttribute("id", "G"),
                            new XAttribute("edgedefault", "directed"),
                            objects.Select(o =>
                            {
                                var typeName = objectTypes.FirstOrDefault(ot => ot.Id == o.ObjectTypeId)?.Name ?? "Unknown";
                                var propsJson = o.Properties != null && o.Properties.Any()
                                    ? JsonSerializer.Serialize(o.Properties.ToDictionary(p => p.Key ?? "", p => p.Value ?? ""), jsonOptions)
                                    : "";
                                
                                return new XElement(ns + "node",
                                    new XAttribute("id", $"n{o.Id}"),
                                    new XElement(ns + "data", new XAttribute("key", "name"), o.Name ?? ""),
                                    new XElement(ns + "data", new XAttribute("key", "type"), typeName),
                                    new XElement(ns + "data", new XAttribute("key", "color"), o.Color ?? ""),
                                    new XElement(ns + "data", new XAttribute("key", "x"), o.PositionX ?? 0),
                                    new XElement(ns + "data", new XAttribute("key", "y"), o.PositionY ?? 0),
                                    new XElement(ns + "data", new XAttribute("key", "properties"), propsJson)
                                );
                            }),
                            relations.Select(r =>
                            {
                                var relTypeName = relationTypes.FirstOrDefault(rt => rt.Id == r.RelationTypeId)?.Name ?? "Unknown";
                                var propsJson = r.Properties != null && r.Properties.Any()
                                    ? JsonSerializer.Serialize(r.Properties.ToDictionary(p => p.Key ?? "", p => p.Value ?? ""), jsonOptions)
                                    : "";
                                
                                return new XElement(ns + "edge",
                                    new XAttribute("id", $"e{r.Id}"),
                                    new XAttribute("source", $"n{r.Source}"),
                                    new XAttribute("target", $"n{r.Target}"),
                                    new XElement(ns + "data", new XAttribute("key", "relationType"), relTypeName),
                                    new XElement(ns + "data", new XAttribute("key", "edgeColor"), r.Color ?? ""),
                                    new XElement(ns + "data", new XAttribute("key", "edgeProperties"), propsJson)
                                );
                            })
                        )
                    )
                );

                using var stringWriter = new StringWriter();
                using var xmlWriter = System.Xml.XmlWriter.Create(stringWriter, new System.Xml.XmlWriterSettings
                {
                    Indent = true,
                    Encoding = Encoding.UTF8,
                    OmitXmlDeclaration = false
                });
                graphml.Save(xmlWriter);
                xmlWriter.Flush();
                return stringWriter.ToString();
            }
            catch (Exception ex)
            {
                throw new Exception($"GraphML export error: {ex.Message}", ex);
            }
        }

        public async Task<(string nodesCsv, string edgesCsv)> ExportToCsvAsync()
        {
            var objects = await _graphService.GetObjectsAsync();
            var relations = await _graphService.GetRelationsAsync();
            var objectTypes = await _graphService.GetObjectTypesAsync();
            var relationTypes = await _graphService.GetRelationTypesAsync();

            // Nodes CSV с расширенными данными
            var nodesCsv = new StringBuilder();
            nodesCsv.AppendLine("id;name;type;typeName;positionX;positionY;color;icon;properties");
            foreach (var obj in objects)
            {
                var typeName = objectTypes.FirstOrDefault(ot => ot.Id == obj.ObjectTypeId)?.Name ?? "";
                var propsStr = obj.Properties != null && obj.Properties.Any()
                    ? string.Join("|", obj.Properties.Select(p => $"{p.Key}={p.Value}"))
                    : "";
                
                nodesCsv.AppendLine($"{obj.Id};" +
                    $"\"{EscapeCsv(obj.Name ?? "")}\";" +
                    $"{obj.ObjectTypeId};" +
                    $"\"{EscapeCsv(typeName)}\";" +
                    $"{obj.PositionX ?? 0};" +
                    $"{obj.PositionY ?? 0};" +
                    $"\"{EscapeCsv(obj.Color ?? "")}\";" +
                    $"\"{EscapeCsv(obj.Icon ?? "")}\";" +
                    $"\"{EscapeCsv(propsStr)}\"");
            }

            // Edges CSV с расширенными данными
            var edgesCsv = new StringBuilder();
            edgesCsv.AppendLine("id;source;target;relationTypeId;relationTypeName;color;properties");
            foreach (var rel in relations)
            {
                var relTypeName = relationTypes.FirstOrDefault(rt => rt.Id == rel.RelationTypeId)?.Name ?? "";
                var propsStr = rel.Properties != null && rel.Properties.Any()
                    ? string.Join("|", rel.Properties.Select(p => $"{p.Key}={p.Value}"))
                    : "";
                
                edgesCsv.AppendLine($"{rel.Id};" +
                    $"{rel.Source};" +
                    $"{rel.Target};" +
                    $"{rel.RelationTypeId};" +
                    $"\"{EscapeCsv(relTypeName)}\";" +
                    $"\"{EscapeCsv(rel.Color ?? "")}\";" +
                    $"\"{EscapeCsv(propsStr)}\"");
            }

            return (nodesCsv.ToString(), edgesCsv.ToString());
        }

        private string EscapeCsv(string value)
        {
            if (string.IsNullOrEmpty(value)) return "";
            return value.Replace("\"", "\"\"");
        }
    }
}
