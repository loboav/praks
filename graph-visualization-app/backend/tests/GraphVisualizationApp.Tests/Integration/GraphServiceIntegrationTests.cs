using Xunit;
using FluentAssertions;
using Testcontainers.PostgreSql;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using GraphVisualizationApp.Models;
using GraphVisualizationApp.Services;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Tests.Integration
{
    /// <summary>
    /// Интеграционные тесты с реальной PostgreSQL БД через Docker Testcontainers
    /// </summary>
    public class GraphServiceIntegrationTests : IAsyncLifetime
    {
        private PostgreSqlContainer? _postgresContainer;
        private GraphDbContext? _context;
        private GraphService? _service;
        private IMemoryCache? _cache;

        public async Task InitializeAsync()
        {
            // Запускаем PostgreSQL контейнер
            _postgresContainer = new PostgreSqlBuilder()
                .WithImage("postgres:15")
                .WithDatabase("testdb")
                .WithUsername("testuser")
                .WithPassword("testpass")
                .Build();

            await _postgresContainer.StartAsync();

            // Настраиваем DbContext с реальной БД
            var options = new DbContextOptionsBuilder<GraphDbContext>()
                .UseNpgsql(_postgresContainer.GetConnectionString())
                .Options;

            _context = new GraphDbContext(options);
            await _context.Database.EnsureCreatedAsync();

            // Настраиваем сервис
            _cache = new MemoryCache(new MemoryCacheOptions());
            var cacheSettings = Options.Create(new CacheSettings
            {
                ObjectsCacheDuration = TimeSpan.FromMinutes(5),
                RelationsCacheDuration = TimeSpan.FromMinutes(5),
                ObjectTypesCacheDuration = TimeSpan.FromMinutes(10),
                RelationTypesCacheDuration = TimeSpan.FromMinutes(10)
            });

            _service = new GraphService(_context, _cache, cacheSettings);
        }

        [Fact]
        public async Task FullWorkflow_CreateUpdateDelete_ShouldWorkWithRealDatabase()
        {
            // Arrange - создаём тип объекта
            var objectType = new ObjectType
            {
                Name = "TestType",
                Description = "Test object type"
            };
            var createdType = await _service.CreateObjectTypeAsync(objectType);
            createdType.Id.Should().BeGreaterThan(0);

            // Act 1 - создаём объект
            var newObject = new GraphObject
            {
                Name = "TestObject",
                ObjectTypeId = createdType.Id,
                Color = "#FF0000"
            };
            var createdObject = await _service.CreateObjectAsync(newObject);

            // Assert 1
            createdObject.Should().NotBeNull();
            createdObject.Id.Should().BeGreaterThan(0);

            // Act 2 - обновляем объект
            createdObject.Name = "UpdatedObject";
            var updatedObject = await _service.UpdateObjectAsync(createdObject);

            // Assert 2
            updatedObject.Name.Should().Be("UpdatedObject");

            // Act 3 - удаляем объект
            var deleteResult = await _service.DeleteObjectAsync(createdObject.Id);

            // Assert 3
            deleteResult.Should().BeTrue();
            var deletedObject = await _service.GetObjectAsync(createdObject.Id);
            deletedObject.Should().BeNull();
        }

        [Fact]
        public async Task PathFinding_WithRealDatabase_ShouldFindCorrectPath()
        {
            // Arrange - создаём граф
            var objectType = await _service.CreateObjectTypeAsync(new ObjectType { Name = "Node" });
            var relationType = await _service.CreateRelationTypeAsync(new RelationType 
            { 
                Name = "Edge", 
                ObjectTypeId = objectType.Id 
            });

            var node1 = await _service.CreateObjectAsync(new GraphObject { Name = "Node1", ObjectTypeId = objectType.Id });
            var node2 = await _service.CreateObjectAsync(new GraphObject { Name = "Node2", ObjectTypeId = objectType.Id });
            var node3 = await _service.CreateObjectAsync(new GraphObject { Name = "Node3", ObjectTypeId = objectType.Id });

            await _service.CreateRelationAsync(new GraphRelation 
            { 
                Source = node1.Id, 
                Target = node2.Id, 
                RelationTypeId = relationType.Id 
            });
            await _service.CreateRelationAsync(new GraphRelation 
            { 
                Source = node2.Id, 
                Target = node3.Id, 
                RelationTypeId = relationType.Id 
            });

            // Act
            var path = await _service.FindPathAsync(node1.Id, node3.Id);

            // Assert
            path.Should().NotBeNull();
            path.Should().HaveCount(3);
            path[0].Id.Should().Be(node1.Id);
            path[1].Id.Should().Be(node2.Id);
            path[2].Id.Should().Be(node3.Id);
        }

        public async Task DisposeAsync()
        {
            await _context.DisposeAsync();
            _cache.Dispose();
            await _postgresContainer.DisposeAsync();
        }
    }
}
