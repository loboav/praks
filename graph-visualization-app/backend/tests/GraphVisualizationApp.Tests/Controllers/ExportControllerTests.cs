using Xunit;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using GraphVisualizationApp.Controllers;
using GraphVisualizationApp.Services;
using System.Threading.Tasks;

namespace GraphVisualizationApp.Tests.Controllers
{
    public class ExportControllerTests
    {
        private readonly Mock<IExportService> _mockExportService;
        private readonly ExportController _controller;

        public ExportControllerTests()
        {
            _mockExportService = new Mock<IExportService>();
            _controller = new ExportController(_mockExportService.Object);
        }

        [Fact]
        public async Task ExportJson_ReturnsJsonFile()
        {
            // Arrange
            var expectedJson = "{\"nodes\": [], \"edges\": []}";
            _mockExportService.Setup(s => s.ExportToJsonAsync())
                .ReturnsAsync(expectedJson);

            // Act
            var result = await _controller.ExportJson();

            // Assert
            var fileResult = result.Should().BeOfType<FileContentResult>().Subject;
            fileResult.ContentType.Should().Be("application/json");
            fileResult.FileDownloadName.Should().Contain(".json");
        }

        [Fact]
        public async Task ExportGraphML_ReturnsXmlFile()
        {
            // Arrange
            var expectedXml = "<graphml><graph></graph></graphml>";
            _mockExportService.Setup(s => s.ExportToGraphMLAsync())
                .ReturnsAsync(expectedXml);

            // Act
            var result = await _controller.ExportGraphML();

            // Assert
            var fileResult = result.Should().BeOfType<FileContentResult>().Subject;
            fileResult.ContentType.Should().Be("application/xml");
            fileResult.FileDownloadName.Should().Contain(".graphml");
        }

        [Fact]
        public async Task ExportCsv_ReturnsZipFile()
        {
            // Arrange
            var nodesCsv = "id,name\n1,Node1";
            var edgesCsv = "source,target\n1,2";
            _mockExportService.Setup(s => s.ExportToCsvAsync())
                .ReturnsAsync((nodesCsv, edgesCsv));

            // Act
            var result = await _controller.ExportCsv();

            // Assert
            var fileResult = result.Should().BeOfType<FileContentResult>().Subject;
            fileResult.ContentType.Should().Be("application/zip");
            fileResult.FileDownloadName.Should().Contain(".zip");
        }

        [Fact]
        public async Task ExportNodesOnly_ReturnsCsvFile()
        {
            // Arrange
            var nodesCsv = "id,name\n1,Node1\n2,Node2";
            _mockExportService.Setup(s => s.ExportToCsvAsync())
                .ReturnsAsync((nodesCsv, ""));

            // Act
            var result = await _controller.ExportNodesOnly();

            // Assert
            var fileResult = result.Should().BeOfType<FileContentResult>().Subject;
            fileResult.ContentType.Should().Be("text/csv");
            fileResult.FileDownloadName.Should().Contain("nodes_");
        }

        [Fact]
        public async Task ExportEdgesOnly_ReturnsCsvFile()
        {
            // Arrange
            var edgesCsv = "source,target\n1,2\n2,3";
            _mockExportService.Setup(s => s.ExportToCsvAsync())
                .ReturnsAsync(("", edgesCsv));

            // Act
            var result = await _controller.ExportEdgesOnly();

            // Assert
            var fileResult = result.Should().BeOfType<FileContentResult>().Subject;
            fileResult.ContentType.Should().Be("text/csv");
            fileResult.FileDownloadName.Should().Contain("edges_");
        }
    }
}
