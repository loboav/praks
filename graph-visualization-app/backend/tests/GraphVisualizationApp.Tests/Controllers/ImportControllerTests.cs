using Xunit;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using GraphVisualizationApp.Controllers;
using GraphVisualizationApp.Models;
using GraphVisualizationApp.Services;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Tests.Controllers
{
    public class ImportControllerTests
    {
        private readonly Mock<IImportService> _mockImportService;
        private readonly ImportController _controller;

        public ImportControllerTests()
        {
            _mockImportService = new Mock<IImportService>();
            _controller = new ImportController(_mockImportService.Object);
        }

        [Fact]
        public async Task ImportJson_ValidData_ReturnsSuccess()
        {
            // Arrange
            var request = new ImportRequest { Data = "{\"nodes\": [], \"edges\": []}" };
            var expectedResult = new ImportResult
            {
                Success = true,
                ObjectsImported = 10,
                RelationsImported = 15,
                ObjectTypesImported = 2,
                RelationTypesImported = 1
            };

            _mockImportService.Setup(s => s.ImportFromJsonAsync(request.Data))
                .ReturnsAsync(expectedResult);

            // Act
            var result = await _controller.ImportJson(request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().NotBeNull();
        }

        [Fact]
        public async Task ImportJson_EmptyData_ReturnsBadRequest()
        {
            // Arrange
            var request = new ImportRequest { Data = "" };

            // Act
            var result = await _controller.ImportJson(request);

            // Assert
            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task ImportJson_InvalidFormat_ReturnsBadRequest()
        {
            // Arrange
            var request = new ImportRequest { Data = "invalid json" };
            var expectedResult = new ImportResult
            {
                Success = false,
                ErrorMessage = "Invalid JSON format"
            };

            _mockImportService.Setup(s => s.ImportFromJsonAsync(request.Data))
                .ReturnsAsync(expectedResult);

            // Act
            var result = await _controller.ImportJson(request);

            // Assert
            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task ImportGraphML_ValidData_ReturnsSuccess()
        {
            // Arrange
            var request = new ImportRequest { Data = "<graphml><graph></graph></graphml>" };
            var expectedResult = new ImportResult
            {
                Success = true,
                ObjectsImported = 5,
                RelationsImported = 8
            };

            _mockImportService.Setup(s => s.ImportFromGraphMLAsync(request.Data))
                .ReturnsAsync(expectedResult);

            // Act
            var result = await _controller.ImportGraphML(request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().NotBeNull();
        }

        [Fact]
        public async Task ImportGraphML_InvalidXml_ReturnsBadRequest()
        {
            // Arrange
            var request = new ImportRequest { Data = "<invalid xml" };
            var expectedResult = new ImportResult
            {
                Success = false,
                ErrorMessage = "Invalid GraphML format"
            };

            _mockImportService.Setup(s => s.ImportFromGraphMLAsync(request.Data))
                .ReturnsAsync(expectedResult);

            // Act
            var result = await _controller.ImportGraphML(request);

            // Assert
            result.Should().BeOfType<BadRequestObjectResult>();
        }
    }
}
