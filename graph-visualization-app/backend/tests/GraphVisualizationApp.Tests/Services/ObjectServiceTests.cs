using Xunit;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using GraphVisualizationApp.Models;
using GraphVisualizationApp.Services;
using System;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Tests.Services
{
    public class ObjectServiceTests : IDisposable
    {
        private readonly GraphDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly ObjectService _service;
        private readonly CacheSettings _cacheSettings;

        public ObjectServiceTests()
        {
            var options = new DbContextOptionsBuilder<GraphDbContext>()
                .UseInMemoryDatabase(databaseName: $"ObjectTestDb_{Guid.NewGuid()}")
                .Options;

            _context = new GraphDbContext(options);
            _cache = new MemoryCache(new MemoryCacheOptions());
            
            _cacheSettings = new CacheSettings
            {
                ObjectsCacheDuration = TimeSpan.FromMinutes(5)
            };

            var cacheOptions = Options.Create(_cacheSettings);
            _service = new ObjectService(_context, _cache, cacheOptions);

            SeedTestData();
        }

        private void SeedTestData()
        {
            var objectType = new ObjectType { Id = 1, Name = "Person" };
            _context.ObjectTypes.Add(objectType);

            var obj1 = new GraphObject { Id = 1, Name = "Alice", ObjectTypeId = 1, Color = "#FF0000" };
            var obj2 = new GraphObject { Id = 2, Name = "Bob", ObjectTypeId = 1, Color = "#00FF00" };
            _context.GraphObjects.AddRange(obj1, obj2);
            _context.SaveChanges();
        }

        [Fact]
        public async Task GetObjectsAsync_ShouldReturnAllObjects()
        {
            var result = await _service.GetObjectsAsync();
            result.Should().NotBeNull();
            result.Should().HaveCount(2);
            result.Should().Contain(o => o.Name == "Alice");
        }

        [Fact]
        public async Task GetObjectAsync_ExistingId_ShouldReturnObject()
        {
            var result = await _service.GetObjectAsync(1);
            result.Should().NotBeNull();
            result.Id.Should().Be(1);
            result.Name.Should().Be("Alice");
        }

        [Fact]
        public async Task GetObjectAsync_NonExistingId_ShouldReturnNull()
        {
            var result = await _service.GetObjectAsync(999);
            result.Should().BeNull();
        }

        [Fact]
        public async Task CreateObjectAsync_ShouldAddNewObject()
        {
            var newObject = new GraphObject { Name = "Charlie", ObjectTypeId = 1, Color = "#0000FF" };
            var result = await _service.CreateObjectAsync(newObject);

            result.Should().NotBeNull();
            result.Id.Should().BeGreaterThan(0);
            result.Name.Should().Be("Charlie");

            var allObjects = await _service.GetObjectsAsync();
            allObjects.Should().HaveCount(3);
        }

        [Fact]
        public async Task UpdateObjectAsync_ExistingObject_ShouldUpdateSuccessfully()
        {
            var existingObject = await _service.GetObjectAsync(1);
            existingObject.Name = "Alice Updated";
            var result = await _service.UpdateObjectAsync(existingObject);

            result.Should().NotBeNull();
            result.Name.Should().Be("Alice Updated");
        }

        [Fact]
        public async Task DeleteObjectAsync_ExistingId_ShouldReturnTrue()
        {
            var result = await _service.DeleteObjectAsync(1);
            result.Should().BeTrue();

            var allObjects = await _service.GetObjectsAsync();
            allObjects.Should().HaveCount(1);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
            _cache.Dispose();
        }
    }
}
