using Xunit;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using GraphVisualizationApp.Models;
using GraphVisualizationApp.Services;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Tests.Services
{
    public class TypeServiceTests : IDisposable
    {
        private readonly GraphDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly TypeService _service;
        private readonly CacheSettings _cacheSettings;

        public TypeServiceTests()
        {
            var options = new DbContextOptionsBuilder<GraphDbContext>()
                .UseInMemoryDatabase(databaseName: $"TypeTestDb_{Guid.NewGuid()}")
                .Options;

            _context = new GraphDbContext(options);
            _cache = new MemoryCache(new MemoryCacheOptions());
            
            _cacheSettings = new CacheSettings
            {
                ObjectTypesCacheDuration = TimeSpan.FromMinutes(10),
                RelationTypesCacheDuration = TimeSpan.FromMinutes(10)
            };

            var cacheOptions = Options.Create(_cacheSettings);
            _service = new TypeService(_context, _cache, cacheOptions);

            SeedTestData();
        }

        private void SeedTestData()
        {
            var objectType = new ObjectType { Id = 1, Name = "Person", Description = "Person type" };
            _context.ObjectTypes.Add(objectType);

            var relationType = new RelationType { Id = 1, Name = "Knows", Description = "Knows relationship", ObjectTypeId = 1 };
            _context.RelationTypes.Add(relationType);

            _context.SaveChanges();
        }

        [Fact]
        public async Task GetObjectTypesAsync_ShouldReturnAllTypes()
        {
            var result = await _service.GetObjectTypesAsync();
            result.Should().NotBeNull();
            result.Should().HaveCount(1);
            result.First().Name.Should().Be("Person");
        }

        [Fact]
        public async Task CreateObjectTypeAsync_ShouldAddNewType()
        {
            var newType = new ObjectType { Name = "Organization", Description = "Organization type" };
            var result = await _service.CreateObjectTypeAsync(newType);

            result.Should().NotBeNull();
            result.Id.Should().BeGreaterThan(0);

            var allTypes = await _service.GetObjectTypesAsync();
            allTypes.Should().HaveCount(2);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
            _cache.Dispose();
        }
    }
}
