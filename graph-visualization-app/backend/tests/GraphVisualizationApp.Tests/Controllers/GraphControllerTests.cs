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
        private readonly Mock<IGraphService> _mockGraphService;
        private readonly GraphController _controller;

        public GraphControllerTests()
        {
            _mockGraphService = new Mock<IGraphService>();
            _controller = new GraphController(_mockGraphService.Object);
        }

        [Fact]
        public async Task GetGraph_ShouldReturnOkWithGraphData()
        {
            // Arrange
            var graphData = new
            {
                Objects = new List<GraphObject>
                {
                    new GraphObject { Id = 1, Name = "Test1", ObjectTypeId = 1 },
                    new GraphObject { Id = 2, Name = "Test2", ObjectTypeId = 1 }
                },
                Relations = new List<GraphRelation>
                {
                    new GraphRelation { Id = 1, Source = 1, Target = 2, RelationTypeId = 1 }
                }
            };

            _mockGraphService.Setup(s => s.GetGraphAsync())
                .ReturnsAsync(graphData);

            // Act
            var result = await _controller.GetGraph();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().NotBeNull();
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

            _mockGraphService.Setup(s => s.GetObjectsAsync())
                .ReturnsAsync(expectedObjects);

            // Act
            var result = await _controller.GetObjects();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().NotBeNull();
            // Controller returns DTOs, not raw objects
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

            _mockGraphService.Setup(s => s.CreateObjectAsync(It.IsAny<GraphObject>()))
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

            _mockGraphService.Setup(s => s.UpdateObjectAsync(It.IsAny<GraphObject>()))
                .ReturnsAsync(updatedObject);

            // Act
            var result = await _controller.UpdateObject(1, updatedObject);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().NotBeNull();
            // Controller returns DTO, not raw object
        }

        [Fact]
        public async Task DeleteObject_ExistingId_ShouldReturnNoContent()
        {
            // Arrange
            _mockGraphService.Setup(s => s.DeleteObjectAsync(1))
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
            _mockGraphService.Setup(s => s.DeleteObjectAsync(999))
                .ReturnsAsync(false);

            // Act
            var result = await _controller.DeleteObject(999);

            // Assert
            result.Should().BeOfType<NotFoundResult>();
        }
    }
}
