using Xunit;
using Moq;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using GraphVisualizationApp.Models;
using GraphVisualizationApp.Services;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Tests.Services
{
    public class GraphServiceTests : IDisposable
    {
        private readonly GraphDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly GraphService _service;
        private readonly CacheSettings _cacheSettings;

        public GraphServiceTests()
        {
            // Настройка in-memory БД для тестов
            var options = new DbContextOptionsBuilder<GraphDbContext>()
                .UseInMemoryDatabase(databaseName: $"TestDb_{Guid.NewGuid()}")
                .Options;

            _context = new GraphDbContext(options);
            _cache = new MemoryCache(new MemoryCacheOptions());
            
            _cacheSettings = new CacheSettings
            {
                ObjectsCacheDuration = TimeSpan.FromMinutes(5),
                RelationsCacheDuration = TimeSpan.FromMinutes(5),
                ObjectTypesCacheDuration = TimeSpan.FromMinutes(10),
                RelationTypesCacheDuration = TimeSpan.FromMinutes(10)
            };

            var cacheOptions = Options.Create(_cacheSettings);
            _service = new GraphService(_context, _cache, cacheOptions);

            // Заполняем тестовыми данными
            SeedTestData();
        }

        private void SeedTestData()
        {
            // Создаём типы объектов
            var objectType = new ObjectType
            {
                Id = 1,
                Name = "Person",
                Description = "Person type"
            };
            _context.ObjectTypes.Add(objectType);

            // Создаём типы связей
            var relationType = new RelationType
            {
                Id = 1,
                Name = "Knows",
                Description = "Knows relationship",
                ObjectTypeId = 1
            };
            _context.RelationTypes.Add(relationType);

            // Создаём объекты
            var obj1 = new GraphObject
            {
                Id = 1,
                Name = "Alice",
                ObjectTypeId = 1,
                Color = "#FF0000"
            };
            var obj2 = new GraphObject
            {
                Id = 2,
                Name = "Bob",
                ObjectTypeId = 1,
                Color = "#00FF00"
            };
            _context.GraphObjects.AddRange(obj1, obj2);

            // Создаём связь
            var relation = new GraphRelation
            {
                Id = 1,
                Source = 1,
                Target = 2,
                RelationTypeId = 1
            };
            _context.GraphRelations.Add(relation);

            _context.SaveChanges();
        }

        [Fact]
        public async Task GetObjectsAsync_ShouldReturnAllObjects()
        {
            // Act
            var result = await _service.GetObjectsAsync();

            // Assert
            result.Should().NotBeNull();
            result.Should().HaveCount(2);
            result.Should().Contain(o => o.Name == "Alice");
            result.Should().Contain(o => o.Name == "Bob");
        }

        [Fact]
        public async Task GetObjectAsync_ExistingId_ShouldReturnObject()
        {
            // Act
            var result = await _service.GetObjectAsync(1);

            // Assert
            result.Should().NotBeNull();
            result.Id.Should().Be(1);
            result.Name.Should().Be("Alice");
        }

        [Fact]
        public async Task GetObjectAsync_NonExistingId_ShouldReturnNull()
        {
            // Act
            var result = await _service.GetObjectAsync(999);

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task CreateObjectAsync_ShouldAddNewObject()
        {
            // Arrange
            var newObject = new GraphObject
            {
                Name = "Charlie",
                ObjectTypeId = 1,
                Color = "#0000FF"
            };

            // Act
            var result = await _service.CreateObjectAsync(newObject);

            // Assert
            result.Should().NotBeNull();
            result.Id.Should().BeGreaterThan(0);
            result.Name.Should().Be("Charlie");

            var allObjects = await _service.GetObjectsAsync();
            allObjects.Should().HaveCount(3);
        }

        [Fact]
        public async Task UpdateObjectAsync_ExistingObject_ShouldUpdateSuccessfully()
        {
            // Arrange
            var existingObject = await _service.GetObjectAsync(1);
            existingObject.Name = "Alice Updated";
            existingObject.Color = "#FFFFFF";

            // Act
            var result = await _service.UpdateObjectAsync(existingObject);

            // Assert
            result.Should().NotBeNull();
            result.Name.Should().Be("Alice Updated");
            result.Color.Should().Be("#FFFFFF");
        }

        [Fact]
        public async Task DeleteObjectAsync_ExistingId_ShouldReturnTrue()
        {
            // Act
            var result = await _service.DeleteObjectAsync(1);

            // Assert
            result.Should().BeTrue();

            var allObjects = await _service.GetObjectsAsync();
            allObjects.Should().HaveCount(1);
            allObjects.Should().NotContain(o => o.Id == 1);
        }

        [Fact]
        public async Task DeleteObjectAsync_NonExistingId_ShouldReturnFalse()
        {
            // Act
            var result = await _service.DeleteObjectAsync(999);

            // Assert
            result.Should().BeFalse();
        }

        [Fact]
        public async Task GetRelationsAsync_ShouldReturnAllRelations()
        {
            // Act
            var result = await _service.GetRelationsAsync();

            // Assert
            result.Should().NotBeNull();
            result.Should().HaveCount(1);
            result.First().Source.Should().Be(1);
            result.First().Target.Should().Be(2);
        }

        [Fact]
        public async Task CreateRelationAsync_ShouldAddNewRelation()
        {
            // Arrange
            var newRelation = new GraphRelation
            {
                Source = 2,
                Target = 1,
                RelationTypeId = 1
            };

            // Act
            var result = await _service.CreateRelationAsync(newRelation);

            // Assert
            result.Should().NotBeNull();
            result.Id.Should().BeGreaterThan(0);

            var allRelations = await _service.GetRelationsAsync();
            allRelations.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetObjectTypesAsync_ShouldReturnAllTypes()
        {
            // Act
            var result = await _service.GetObjectTypesAsync();

            // Assert
            result.Should().NotBeNull();
            result.Should().HaveCount(1);
            result.First().Name.Should().Be("Person");
        }

        [Fact]
        public async Task CreateObjectTypeAsync_ShouldAddNewType()
        {
            // Arrange
            var newType = new ObjectType
            {
                Name = "Organization",
                Description = "Organization type"
            };

            // Act
            var result = await _service.CreateObjectTypeAsync(newType);

            // Assert
            result.Should().NotBeNull();
            result.Id.Should().BeGreaterThan(0);

            var allTypes = await _service.GetObjectTypesAsync();
            allTypes.Should().HaveCount(2);
        }

        [Fact]
        public async Task FindPathAsync_ExistingPath_ShouldReturnPath()
        {
            // Act
            var result = await _service.FindPathAsync(1, 2);

            // Assert
            result.Should().NotBeNull();
            result.Should().HaveCount(2);
            result.First().Id.Should().Be(1);
            result.Last().Id.Should().Be(2);
        }

        [Fact]
        public async Task FindPathAsync_NoPath_ShouldReturnEmptyList()
        {
            // Arrange - создаём изолированный объект
            var isolatedObject = new GraphObject
            {
                Id = 3,
                Name = "Isolated",
                ObjectTypeId = 1
            };
            await _service.CreateObjectAsync(isolatedObject);

            // Act
            var result = await _service.FindPathAsync(1, 3);

            // Assert
            result.Should().NotBeNull();
            result.Should().BeEmpty();
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
            _cache.Dispose();
        }
    }
}
