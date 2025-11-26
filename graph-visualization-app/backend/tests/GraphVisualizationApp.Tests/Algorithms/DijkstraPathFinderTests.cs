using Xunit;
using FluentAssertions;
using GraphVisualizationApp.Algorithms;
using GraphVisualizationApp.Models;
using System.Collections.Generic;
using System.Linq;

namespace GraphVisualizationApp.Tests.Algorithms
{
    public class DijkstraPathFinderTests
    {
        private readonly DijkstraPathFinder _pathFinder;

        public DijkstraPathFinderTests()
        {
            _pathFinder = new DijkstraPathFinder();
        }

        [Fact]
        public void FindShortestPath_DirectPath_ReturnsShortestPath()
        {
            // Arrange
            var nodes = new List<GraphObject>
            {
                new GraphObject { Id = 1, Name = "A", ObjectTypeId = 1 },
                new GraphObject { Id = 2, Name = "B", ObjectTypeId = 1 },
                new GraphObject { Id = 3, Name = "C", ObjectTypeId = 1 }
            };

            var edges = new List<GraphRelation>
            {
                new GraphRelation { Id = 1, Source = 1, Target = 2, RelationTypeId = 1 },
                new GraphRelation { Id = 2, Source = 2, Target = 3, RelationTypeId = 1 }
            };

            // Act
            var result = _pathFinder.FindShortestPath(nodes, edges, 1, 3);

            // Assert
            result.NodeIds.Should().Equal(1, 2, 3);
            result.EdgeIds.Should().HaveCount(2);
            result.TotalWeight.Should().Be(2);
        }

        [Fact]
        public void FindShortestPath_MultiplePathsExist_ReturnsOptimal()
        {
            // Arrange
            var nodes = new List<GraphObject>
            {
                new GraphObject { Id = 1, Name = "A", ObjectTypeId = 1 },
                new GraphObject { Id = 2, Name = "B", ObjectTypeId = 1 },
                new GraphObject { Id = 3, Name = "C", ObjectTypeId = 1 },
                new GraphObject { Id = 4, Name = "D", ObjectTypeId = 1 }
            };

            var edges = new List<GraphRelation>
            {
                new GraphRelation { Id = 1, Source = 1, Target = 2, RelationTypeId = 1 }, // A -> B (weight 1)
                new GraphRelation { Id = 2, Source = 2, Target = 4, RelationTypeId = 1 }, // B -> D (weight 1)
                new GraphRelation { Id = 3, Source = 1, Target = 3, RelationTypeId = 1 }, // A -> C (weight 1)
                new GraphRelation { Id = 4, Source = 3, Target = 4, RelationTypeId = 1 }  // C -> D (weight 1)
            };

            // Act
            var result = _pathFinder.FindShortestPath(nodes, edges, 1, 4);

            // Assert
            result.NodeIds.Should().HaveCount(3); // Should be 3 nodes (A -> B -> D or A -> C -> D)
            result.TotalWeight.Should().Be(2);
        }

        [Fact]
        public void FindShortestPath_WithWeights_ConsidersWeights()
        {
            // Arrange
            var nodes = new List<GraphObject>
            {
                new GraphObject { Id = 1, Name = "A", ObjectTypeId = 1 },
                new GraphObject { Id = 2, Name = "B", ObjectTypeId = 1 },
                new GraphObject { Id = 3, Name = "C", ObjectTypeId = 1 }
            };

            var edges = new List<GraphRelation>
            {
                new GraphRelation 
                { 
                    Id = 1, 
                    Source = 1, 
                    Target = 2, 
                    RelationTypeId = 1,
                    Properties = new List<RelationProperty> 
                    { 
                        new RelationProperty { Key = "weight", Value = "5" } 
                    }
                },
                new GraphRelation 
                { 
                    Id = 2, 
                    Source = 1, 
                    Target = 3, 
                    RelationTypeId = 1,
                    Properties = new List<RelationProperty> 
                    { 
                        new RelationProperty { Key = "weight", Value = "2" } 
                    }
                },
                new GraphRelation 
                { 
                    Id = 3, 
                    Source = 3, 
                    Target = 2, 
                    RelationTypeId = 1,
                    Properties = new List<RelationProperty> 
                    { 
                        new RelationProperty { Key = "weight", Value = "1" } 
                    }
                }
            };

            // Act
            var result = _pathFinder.FindShortestPath(nodes, edges, 1, 2);

            // Assert
            result.NodeIds.Should().Equal(1, 3, 2); // Should go through C (2+1=3) instead of direct (5)
            result.TotalWeight.Should().Be(3);
        }

        [Fact]
        public void FindShortestPath_NoPath_ReturnsEmpty()
        {
            // Arrange
            var nodes = new List<GraphObject>
            {
                new GraphObject { Id = 1, Name = "A", ObjectTypeId = 1 },
                new GraphObject { Id = 2, Name = "B", ObjectTypeId = 1 },
                new GraphObject { Id = 3, Name = "C", ObjectTypeId = 1 }
            };

            var edges = new List<GraphRelation>
            {
                new GraphRelation { Id = 1, Source = 1, Target = 2, RelationTypeId = 1 }
                // No connection to node 3
            };

            // Act
            var result = _pathFinder.FindShortestPath(nodes, edges, 1, 3);

            // Assert
            result.NodeIds.Should().BeEmpty();
            result.EdgeIds.Should().BeEmpty();
            result.TotalWeight.Should().Be(-1);
        }

        [Fact]
        public void FindShortestPath_SameNode_ReturnsSingleNode()
        {
            // Arrange
            var nodes = new List<GraphObject>
            {
                new GraphObject { Id = 1, Name = "A", ObjectTypeId = 1 }
            };

            var edges = new List<GraphRelation>();

            // Act
            var result = _pathFinder.FindShortestPath(nodes, edges, 1, 1);

            // Assert
            result.NodeIds.Should().Equal(1);
            result.EdgeIds.Should().BeEmpty();
            result.TotalWeight.Should().Be(0);
        }

        [Fact]
        public void FindShortestPath_DisconnectedGraph_ReturnsEmpty()
        {
            // Arrange
            var nodes = new List<GraphObject>
            {
                new GraphObject { Id = 1, Name = "A", ObjectTypeId = 1 },
                new GraphObject { Id = 2, Name = "B", ObjectTypeId = 1 },
                new GraphObject { Id = 3, Name = "C", ObjectTypeId = 1 },
                new GraphObject { Id = 4, Name = "D", ObjectTypeId = 1 }
            };

            var edges = new List<GraphRelation>
            {
                new GraphRelation { Id = 1, Source = 1, Target = 2, RelationTypeId = 1 },
                new GraphRelation { Id = 2, Source = 3, Target = 4, RelationTypeId = 1 }
            };

            // Act
            var result = _pathFinder.FindShortestPath(nodes, edges, 1, 4);

            // Assert
            result.NodeIds.Should().BeEmpty();
            result.TotalWeight.Should().Be(-1);
        }

        [Fact]
        public void FindShortestPath_UndirectedGraph_WorksBothDirections()
        {
            // Arrange
            var nodes = new List<GraphObject>
            {
                new GraphObject { Id = 1, Name = "A", ObjectTypeId = 1 },
                new GraphObject { Id = 2, Name = "B", ObjectTypeId = 1 }
            };

            var edges = new List<GraphRelation>
            {
                new GraphRelation { Id = 1, Source = 1, Target = 2, RelationTypeId = 1 }
            };

            // Act - should work in both directions
            var result1 = _pathFinder.FindShortestPath(nodes, edges, 1, 2);
            var result2 = _pathFinder.FindShortestPath(nodes, edges, 2, 1);

            // Assert
            result1.NodeIds.Should().Equal(1, 2);
            result2.NodeIds.Should().Equal(2, 1);
        }
    }
}
