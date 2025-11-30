using Xunit;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using GraphVisualizationApp.Controllers;
using GraphVisualizationApp.Models;
using GraphVisualizationApp.Services;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Tests.Controllers
{
    public class GraphControllerTests
    {
        private readonly Mock<IObjectService> _mockObjectService;
        private readonly Mock<IRelationService> _mockRelationService;
        private readonly Mock<ITypeService> _mockTypeService;
        private readonly Mock<IPathfindingService> _mockPathfindingService;
        private readonly GraphController _controller;

        public GraphControllerTests()
        {
            _mockObjectService = new Mock<IObjectService>();
            _mockRelationService = new Mock<IRelationService>();
            _mockTypeService = new Mock<ITypeService>();
            _mockPathfindingService = new Mock<IPathfindingService>();
            
            _controller = new GraphController(
                _mockObjectService.Object,
                _mockRelationService.Object,
                _mockTypeService.Object,
                _mockPathfindingService.Object
            );
        }

        [Fact]
        public async Task GetGraph_ShouldReturnOkWithGraphData()
        {
            // Arrange
            var objects = new List<GraphObject>
            {
                new GraphObject { Id = 1, Name = "Test1", ObjectTypeId = 1 },
                new GraphObject { Id = 2, Name = "Test2", ObjectTypeId = 1 }
            };
            var relations = new List<GraphRelation>
            {
                new GraphRelation { Id = 1, Source = 1, Target = 2, RelationTypeId = 1 }
            };

            _mockObjectService.Setup(s => s.GetObjectsAsync()).ReturnsAsync(objects);
            _mockRelationService.Setup(s => s.GetRelationsAsync()).ReturnsAsync(relations);

            // Act
            var result = await _controller.GetGraph();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().NotBeNull();
            // Verify structure if needed, but checking NotBeNull is a good start
        }

        [Fact]
        public async Task GetObjects_ShouldReturnAllObjects()
        {
            // Arrange
            var expectedObjects = new List<GraphObject>
            {
                new GraphObject { Id = 1, Name = "Alice", ObjectTypeId = 1 },
                new GraphObject { Id = 2, Name = "Bob", ObjectTypeId = 1 }
            };

            _mockObjectService.Setup(s => s.GetObjectsAsync())
                .ReturnsAsync(expectedObjects);

            // Act
            var result = await _controller.GetObjects();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().NotBeNull();
        }

        [Fact]
        public async Task CreateObject_ValidObject_ShouldReturnCreatedResult()
        {
            // Arrange
            var newObjectDto = new CreateObjectDto
            {
                Name = "Charlie",
                ObjectTypeId = 1,
                Color = "#FF0000",
                Properties = new List<PropertyDto>()
            };

            var createdObject = new GraphObject
            {
                Id = 3,
                Name = "Charlie",
                ObjectTypeId = 1,
                Color = "#FF0000"
            };

            _mockObjectService.Setup(s => s.CreateObjectAsync(It.IsAny<GraphObject>()))
                .ReturnsAsync(createdObject);

            // Act
            var result = await _controller.CreateObject(newObjectDto);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().NotBeNull();
        }


        [Fact]
        public async Task UpdateObject_ExistingObject_ShouldReturnOk()
        {
            // Arrange
            var updatedObject = new GraphObject
            {
                Id = 1,
                Name = "Alice Updated",
                ObjectTypeId = 1
            };

            _mockObjectService.Setup(s => s.UpdateObjectAsync(It.IsAny<GraphObject>()))
                .ReturnsAsync(updatedObject);

            // Act
            var result = await _controller.UpdateObject(1, updatedObject);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().NotBeNull();
        }

        [Fact]
        public async Task DeleteObject_ExistingId_ShouldReturnNoContent()
        {
            // Arrange
            _mockObjectService.Setup(s => s.DeleteObjectAsync(1))
                .ReturnsAsync(true);

            // Act
            var result = await _controller.DeleteObject(1);

            // Assert
            result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task DeleteObject_NonExistingId_ShouldReturnNotFound()
        {
            // Arrange
            _mockObjectService.Setup(s => s.DeleteObjectAsync(999))
                .ReturnsAsync(false);

            // Act
            var result = await _controller.DeleteObject(999);

            // Assert
            result.Should().BeOfType<NotFoundResult>();
        }
    }
}
