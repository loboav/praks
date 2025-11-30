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
    public class AnalyticsControllerTests
    {
        private readonly Mock<IAnalyticsService> _mockAnalyticsService;
        private readonly AnalyticsController _controller;

        public AnalyticsControllerTests()
        {
            _mockAnalyticsService = new Mock<IAnalyticsService>();
            _controller = new AnalyticsController(_mockAnalyticsService.Object);
        }

        [Fact]
        public async Task GetSummary_ReturnsAnalyticsSummary()
        {
            // Arrange
            var expectedSummary = new AnalyticsSummaryDto
            {
                NodeCount = 100,
                EdgeCount = 250,
                Density = 0.05,
                Components = 3
            };

            _mockAnalyticsService.Setup(s => s.GetSummaryAsync())
                .ReturnsAsync(expectedSummary);

            // Act
            var result = await _controller.GetSummary();

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var summary = okResult.Value as AnalyticsSummaryDto;
            summary.Should().NotBeNull();
            summary!.NodeCount.Should().Be(100);
            summary.EdgeCount.Should().Be(250);
        }

        [Fact]
        public async Task GetNodeMetrics_WithoutCloseness_ReturnsMetrics()
        {
            // Arrange
            var expectedMetrics = new List<NodeMetricsDto>
            {
                new NodeMetricsDto { NodeId = 1, Degree = 5, DegreeCentrality = 0.3 },
                new NodeMetricsDto { NodeId = 2, Degree = 3, DegreeCentrality = 0.1 }
            };

            _mockAnalyticsService.Setup(s => s.GetNodeMetricsAsync(false, false))
                .ReturnsAsync(expectedMetrics);

            // Act
            var result = await _controller.GetNodeMetrics(false);

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var metrics = okResult.Value as List<NodeMetricsDto>;
            metrics.Should().NotBeNull();
            metrics.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetNodeMetrics_WithCloseness_IncludesCloseness()
        {
            // Arrange
            var expectedMetrics = new List<NodeMetricsDto>
            {
                new NodeMetricsDto 
                { 
                    NodeId = 1, 
                    Degree = 5, 
                    DegreeCentrality = 0.3,
                    ClosenessCentrality = 0.7 
                }
            };

            _mockAnalyticsService.Setup(s => s.GetNodeMetricsAsync(true, false))
                .ReturnsAsync(expectedMetrics);

            // Act
            var result = await _controller.GetNodeMetrics(true);

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var metrics = okResult.Value as List<NodeMetricsDto>;
            metrics.Should().NotBeNull();
            metrics![0].ClosenessCentrality.Should().Be(0.7);
        }

        [Fact]
        public async Task GetPageRank_WithDefaultParameters_ReturnsRankings()
        {
            // Arrange
            var expectedRankings = new List<PageRankEntryDto>
            {
                new PageRankEntryDto { NodeId = 1, Score = 0.25 },
                new PageRankEntryDto { NodeId = 2, Score = 0.15 }
            };

            _mockAnalyticsService.Setup(s => s.GetPageRankAsync(50, 0.85))
                .ReturnsAsync(expectedRankings);

            // Act
            var result = await _controller.GetPageRank(50, 0.85);

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var rankings = okResult.Value as List<PageRankEntryDto>;
            rankings.Should().NotBeNull();
            rankings.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetSummary_EmptyGraph_ReturnsZeros()
        {
            // Arrange
            var emptySummary = new AnalyticsSummaryDto
            {
                NodeCount = 0,
                EdgeCount = 0,
                Density = 0,
                Components = 0
            };

            _mockAnalyticsService.Setup(s => s.GetSummaryAsync())
                .ReturnsAsync(emptySummary);

            // Act
            var result = await _controller.GetSummary();

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var summary = okResult.Value as AnalyticsSummaryDto;
            summary!.NodeCount.Should().Be(0);
        }
    }
}
