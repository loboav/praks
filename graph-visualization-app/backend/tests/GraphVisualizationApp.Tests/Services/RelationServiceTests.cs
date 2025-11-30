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
    public class RelationServiceTests : IDisposable
    {
        private readonly GraphDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly RelationService _service;
        private readonly CacheSettings _cacheSettings;

        public RelationServiceTests()
        {
            var options = new DbContextOptionsBuilder<GraphDbContext>()
                .UseInMemoryDatabase(databaseName: $"RelationTestDb_{Guid.NewGuid()}")
                .Options;

            _context = new GraphDbContext(options);
            _cache = new MemoryCache(new MemoryCacheOptions());
            
            _cacheSettings = new CacheSettings
            {
                RelationsCacheDuration = TimeSpan.FromMinutes(5)
            };

            var cacheOptions = Options.Create(_cacheSettings);
            _service = new RelationService(_context, _cache, cacheOptions);

            SeedTestData();
        }

        private void SeedTestData()
        {
            var objectType = new ObjectType { Id = 1, Name = "Person" };
            _context.ObjectTypes.Add(objectType);

            var relationType = new RelationType { Id = 1, Name = "Knows", ObjectTypeId = 1 };
            _context.RelationTypes.Add(relationType);

            var obj1 = new GraphObject { Id = 1, Name = "Alice", ObjectTypeId = 1 };
            var obj2 = new GraphObject { Id = 2, Name = "Bob", ObjectTypeId = 1 };
            _context.GraphObjects.AddRange(obj1, obj2);

            var relation = new GraphRelation { Id = 1, Source = 1, Target = 2, RelationTypeId = 1 };
            _context.GraphRelations.Add(relation);

            _context.SaveChanges();
        }

        [Fact]
        public async Task GetRelationsAsync_ShouldReturnAllRelations()
        {
            var result = await _service.GetRelationsAsync();
            result.Should().NotBeNull();
            result.Should().HaveCount(1);
            result.First().Source.Should().Be(1);
            result.First().Target.Should().Be(2);
        }

        [Fact]
        public async Task CreateRelationAsync_ShouldAddNewRelation()
        {
            var newRelation = new GraphRelation { Source = 2, Target = 1, RelationTypeId = 1 };
            var result = await _service.CreateRelationAsync(newRelation);

            result.Should().NotBeNull();
            result.Id.Should().BeGreaterThan(0);

            var allRelations = await _service.GetRelationsAsync();
            allRelations.Should().HaveCount(2);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
            _cache.Dispose();
        }
    }
}
