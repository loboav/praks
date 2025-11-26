using Xunit;
using FluentAssertions;
using GraphVisualizationApp.Algorithms;

namespace GraphVisualizationApp.Tests.Algorithms
{
    public class FuzzyMatcherTests
    {
        [Fact]
        public void LevenshteinDistance_IdenticalStrings_ReturnsZero()
        {
            // Act
            var distance = FuzzyMatcher.LevenshteinDistance("hello", "hello");

            // Assert
            distance.Should().Be(0);
        }

        [Fact]
        public void LevenshteinDistance_OneCharDifference_ReturnsOne()
        {
            // Act
            var distance = FuzzyMatcher.LevenshteinDistance("hello", "hallo");

            // Assert
            distance.Should().Be(1);
        }

        [Fact]
        public void LevenshteinDistance_CompletelyDifferent_ReturnsMaxDistance()
        {
            // Act
            var distance = FuzzyMatcher.LevenshteinDistance("abc", "xyz");

            // Assert
            distance.Should().Be(3);
        }

        [Fact]
        public void LevenshteinDistance_EmptyStrings_ReturnsZero()
        {
            // Act
            var distance = FuzzyMatcher.LevenshteinDistance("", "");

            // Assert
            distance.Should().Be(0);
        }

        [Fact]
        public void FuzzyMatch_ExactMatch_ReturnsTrue()
        {
            // Act
            var result = FuzzyMatcher.FuzzyMatch("hello world", "hello", 1, false);

            // Assert
            result.Should().BeTrue();
        }

        [Fact]
        public void FuzzyMatch_WithinDistance_ReturnsTrue()
        {
            // Act
            var result = FuzzyMatcher.FuzzyMatch("hello world", "hallo", 1, false);

            // Assert
            result.Should().BeTrue();
        }

        [Fact]
        public void FuzzyMatch_ExceedsDistance_ReturnsFalse()
        {
            // Act
            var result = FuzzyMatcher.FuzzyMatch("hello world", "xyz", 1, false);

            // Assert
            result.Should().BeFalse();
        }

        [Fact]
        public void FuzzyMatch_CaseSensitive_RespectsCase()
        {
            // Act
            var resultSensitive = FuzzyMatcher.FuzzyMatch("Hello", "hello", 0, true);
            var resultInsensitive = FuzzyMatcher.FuzzyMatch("Hello", "hello", 0, false);

            // Assert
            resultSensitive.Should().BeFalse();
            resultInsensitive.Should().BeTrue();
        }

        [Fact]
        public void CalculateRelevance_ExactMatch_Returns100Percent()
        {
            // Act
            var relevance = FuzzyMatcher.CalculateRelevance("test", "test", false);

            // Assert
            relevance.Should().Be(1.0);
        }

        [Fact]
        public void CalculateRelevance_PartialMatch_ReturnsHighScore()
        {
            // Act
            var relevance = FuzzyMatcher.CalculateRelevance("testing", "test", false);

            // Assert
            relevance.Should().BeGreaterThan(0.5);
        }

        [Fact]
        public void CalculateRelevance_NoMatch_ReturnsLowScore()
        {
            // Act
            var relevance = FuzzyMatcher.CalculateRelevance("abc", "xyz", false);

            // Assert
            relevance.Should().BeLessThan(0.5);
        }

        [Fact]
        public void FindMatch_ExactMatch_ReturnsCorrectPosition()
        {
            // Act
            var (position, length) = FuzzyMatcher.FindMatch("hello world", "world", false);

            // Assert
            position.Should().Be(6);
            length.Should().Be(5);
        }

        [Fact]
        public void FindMatch_NoMatch_ReturnsNegativePosition()
        {
            // Act
            var (position, length) = FuzzyMatcher.FindMatch("hello", "xyz", false);

            // Assert
            position.Should().Be(-1);
            length.Should().Be(0);
        }

        [Fact]
        public void RegexMatch_ValidPattern_ReturnsTrue()
        {
            // Act
            var result = FuzzyMatcher.RegexMatch("test123", @"\d+", false);

            // Assert
            result.Should().BeTrue();
        }

        [Fact]
        public void RegexMatch_InvalidPattern_ReturnsFalse()
        {
            // Act
            var result = FuzzyMatcher.RegexMatch("test", "[invalid(", false);

            // Assert
            result.Should().BeFalse();
        }

        [Fact]
        public void RegexMatch_NoMatch_ReturnsFalse()
        {
            // Act
            var result = FuzzyMatcher.RegexMatch("test", @"\d+", false);

            // Assert
            result.Should().BeFalse();
        }

        [Fact]
        public void FindRegexMatch_ValidPattern_ReturnsPosition()
        {
            // Act
            var (position, length) = FuzzyMatcher.FindRegexMatch("test123abc", @"\d+", false);

            // Assert
            position.Should().Be(4);
            length.Should().Be(3);
        }

        [Fact]
        public void FindRegexMatch_InvalidPattern_ReturnsNegative()
        {
            // Act
            var (position, length) = FuzzyMatcher.FindRegexMatch("test", "[invalid(", false);

            // Assert
            position.Should().Be(-1);
            length.Should().Be(0);
        }
    }
}
