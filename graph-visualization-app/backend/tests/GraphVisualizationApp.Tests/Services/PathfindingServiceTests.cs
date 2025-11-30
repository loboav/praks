using Xunit;
using FluentAssertions;
using Moq;
using GraphVisualizationApp.Models;
using GraphVisualizationApp.Services;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Tests.Services
{
    public class PathfindingServiceTests
    {
        private readonly Mock<IObjectService> _mockObjectService;
        private readonly Mock<IRelationService> _mockRelationService;
        private readonly PathfindingService _service;

        public PathfindingServiceTests()
        {
            _mockObjectService = new Mock<IObjectService>();
            _mockRelationService = new Mock<IRelationService>();
            _service = new PathfindingService(_mockObjectService.Object, _mockRelationService.Object);
        }

        [Fact]
        public async Task FindPathAsync_ExistingPath_ShouldReturnPath()
        {
            // Arrange
            var objects = new List<GraphObject>
            {
                new GraphObject { Id = 1, Name = "A" },
                new GraphObject { Id = 2, Name = "B" }
            };
            var relations = new List<GraphRelation>
            {
                new GraphRelation { Source = 1, Target = 2 }
            };

            _mockObjectService.Setup(s => s.GetObjectsAsync()).ReturnsAsync(objects);
            _mockRelationService.Setup(s => s.GetRelationsAsync()).ReturnsAsync(relations);

            // Act
            var result = await _service.FindPathAsync(1, 2);

            // Assert
            result.Should().NotBeNull();
            result.Should().HaveCount(2);
            result.Should().Contain(o => o.Id == 1);
            result.Should().Contain(o => o.Id == 2);
        }

        [Fact]
        public async Task FindPathAsync_NoPath_ShouldReturnEmptyList()
        {
            // Arrange
            var objects = new List<GraphObject>
            {
                new GraphObject { Id = 1, Name = "A" },
                new GraphObject { Id = 3, Name = "C" }
            };
            var relations = new List<GraphRelation>(); // No relations

            _mockObjectService.Setup(s => s.GetObjectsAsync()).ReturnsAsync(objects);
            _mockRelationService.Setup(s => s.GetRelationsAsync()).ReturnsAsync(relations);

            // Act
            var result = await _service.FindPathAsync(1, 3);

            // Assert
            result.Should().NotBeNull();
            result.Should().BeEmpty();
        }
    }
}
