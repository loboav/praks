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
    public class SearchControllerTests
    {
        private readonly Mock<IGraphService> _mockGraphService;
        private readonly SearchController _controller;

        public SearchControllerTests()
        {
            _mockGraphService = new Mock<IGraphService>();
            _controller = new SearchController(_mockGraphService.Object);
        }

        [Fact]
        public async Task Search_ValidQuery_ReturnsResults()
        {
            // Arrange
            var query = "test";
            var expectedResults = new SearchResults
            {
                Objects = new List<ObjectSearchResult>(),
                Relations = new List<RelationSearchResult>(),
                TotalFound = 5,
                SearchDurationMs = 10.5,
                Query = query
            };

            _mockGraphService.Setup(s => s.SearchAsync(query, It.IsAny<SearchOptions>()))
                .ReturnsAsync(expectedResults);

            // Act
            var result = await _controller.Search(query, null);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var searchResults = okResult.Value as SearchResults;
            searchResults.Should().NotBeNull();
            searchResults!.TotalFound.Should().Be(5);
            searchResults.Query.Should().Be(query);
        }

        [Fact]
        public async Task Search_EmptyQuery_ReturnsBadRequest()
        {
            // Act
            var result = await _controller.Search("", null);

            // Assert
            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Search_NullQuery_ReturnsBadRequest()
        {
            // Act
            var result = await _controller.Search(null!, null);

            // Assert
            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task SearchObjects_ValidQuery_ReturnsResults()
        {
            // Arrange
            var query = "Alice";
            var expectedResults = new List<ObjectSearchResult>
            {
                new ObjectSearchResult
                {
                    Object = new GraphObject { Id = 1, Name = "Alice", ObjectTypeId = 1 },
                    Relevance = 1.0,
                    Matches = new List<SearchMatch>()
                }
            };

            _mockGraphService.Setup(s => s.SearchObjectsAsync(query, It.IsAny<SearchOptions>()))
                .ReturnsAsync(expectedResults);

            // Act
            var result = await _controller.SearchObjects(query, null);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var results = okResult.Value as List<ObjectSearchResult>;
            results.Should().NotBeNull();
            results.Should().HaveCount(1);
        }

        [Fact]
        public async Task SearchObjects_EmptyQuery_ReturnsBadRequest()
        {
            // Act
            var result = await _controller.SearchObjects("   ", null);

            // Assert
            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task SearchRelations_ValidQuery_ReturnsResults()
        {
            // Arrange
            var query = "knows";
            var expectedResults = new List<RelationSearchResult>
            {
                new RelationSearchResult
                {
                    Relation = new GraphRelation { Id = 1, Source = 1, Target = 2, RelationTypeId = 1 },
                    Relevance = 0.9,
                    Matches = new List<SearchMatch>()
                }
            };

            _mockGraphService.Setup(s => s.SearchRelationsAsync(query, It.IsAny<SearchOptions>()))
                .ReturnsAsync(expectedResults);

            // Act
            var result = await _controller.SearchRelations(query, null);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var results = okResult.Value as List<RelationSearchResult>;
            results.Should().NotBeNull();
            results.Should().HaveCount(1);
        }

        [Fact]
        public async Task QuickSearch_ValidQuery_ReturnsResults()
        {
            // Arrange
            var query = "test";
            var expectedResults = new SearchResults
            {
                Objects = new List<ObjectSearchResult>(),
                Relations = new List<RelationSearchResult>(),
                TotalFound = 3,
                SearchDurationMs = 5.2,
                Query = query
            };

            _mockGraphService.Setup(s => s.SearchAsync(query, It.IsAny<SearchOptions>()))
                .ReturnsAsync(expectedResults);

            // Act
            var result = await _controller.QuickSearch(query, 50, false);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var searchResults = okResult.Value as SearchResults;
            searchResults.Should().NotBeNull();
            searchResults!.TotalFound.Should().Be(3);
        }

        [Fact]
        public async Task QuickSearch_WithFuzzy_UsesFuzzySearch()
        {
            // Arrange
            var query = "test";
            SearchOptions? capturedOptions = null;

            _mockGraphService.Setup(s => s.SearchAsync(query, It.IsAny<SearchOptions>()))
                .Callback<string, SearchOptions>((q, opts) => capturedOptions = opts)
                .ReturnsAsync(new SearchResults { TotalFound = 0, Query = query });

            // Act
            await _controller.QuickSearch(query, 100, true);

            // Assert
            capturedOptions.Should().NotBeNull();
            capturedOptions!.UseFuzzySearch.Should().BeTrue();
            capturedOptions.MaxResults.Should().Be(100);
        }

        [Fact]
        public async Task Search_WithOptions_PassesOptionsToService()
        {
            // Arrange
            var query = "test";
            var options = new SearchOptions
            {
                CaseSensitive = true,
                WholeWordOnly = true,
                MaxResults = 10
            };

            _mockGraphService.Setup(s => s.SearchAsync(query, options))
                .ReturnsAsync(new SearchResults { TotalFound = 0, Query = query });

            // Act
            await _controller.Search(query, options);

            // Assert
            _mockGraphService.Verify(s => s.SearchAsync(query, options), Times.Once);
        }
    }
}
