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
    public class AuthControllerTests
    {
        private readonly Mock<IAuthService> _mockAuthService;
        private readonly AuthController _controller;

        public AuthControllerTests()
        {
            _mockAuthService = new Mock<IAuthService>();
            _controller = new AuthController(_mockAuthService.Object);
        }

        [Fact]
        public async Task Login_ValidCredentials_ReturnsToken()
        {
            // Arrange
            var loginRequest = new LoginRequest
            {
                Username = "testuser",
                Password = "password123"
            };

            var expectedResponse = new LoginResponse
            {
                Token = "jwt-token-here",
                Username = "testuser",
                Role = "Editor"
            };

            _mockAuthService.Setup(s => s.LoginAsync(loginRequest))
                .ReturnsAsync(expectedResponse);

            // Act
            var result = await _controller.Login(loginRequest);

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var response = okResult.Value as LoginResponse;
            response.Should().NotBeNull();
            response!.Token.Should().NotBeNullOrEmpty();
            response.Username.Should().Be("testuser");
        }

        [Fact]
        public async Task Login_InvalidCredentials_ReturnsUnauthorized()
        {
            // Arrange
            var loginRequest = new LoginRequest
            {
                Username = "testuser",
                Password = "wrongpassword"
            };

            _mockAuthService.Setup(s => s.LoginAsync(loginRequest))
                .ReturnsAsync((LoginResponse?)null);

            // Act
            var result = await _controller.Login(loginRequest);

            // Assert
            result.Result.Should().BeOfType<UnauthorizedObjectResult>();
        }

        [Fact]
        public async Task Signup_ValidData_CreatesUser()
        {
            // Arrange
            var signupRequest = new LoginRequest
            {
                Username = "newuser",
                Password = "password123"
            };

            var expectedUser = new UserDto
            {
                Id = 2,
                Username = "newuser",
                Role = "Editor"
            };

            _mockAuthService.Setup(s => s.RegisterUserAsync(It.IsAny<RegisterUserDto>()))
                .ReturnsAsync(expectedUser);

            // Act
            var result = await _controller.Signup(signupRequest);

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var user = okResult.Value as UserDto;
            user.Should().NotBeNull();
            user!.Username.Should().Be("newuser");
            user.Role.Should().Be("Editor");
        }

        [Fact]
        public async Task Signup_DuplicateUsername_ReturnsBadRequest()
        {
            // Arrange
            var signupRequest = new LoginRequest
            {
                Username = "existinguser",
                Password = "password123"
            };

            _mockAuthService.Setup(s => s.RegisterUserAsync(It.IsAny<RegisterUserDto>()))
                .ReturnsAsync((UserDto?)null);

            // Act
            var result = await _controller.Signup(signupRequest);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task Register_AdminCreatesUser_ReturnsUser()
        {
            // Arrange
            var registerDto = new RegisterUserDto
            {
                Username = "adminuser",
                Password = "password123",
                Role = "Admin"
            };

            var expectedUser = new UserDto
            {
                Id = 3,
                Username = "adminuser",
                Role = "Admin"
            };

            _mockAuthService.Setup(s => s.RegisterUserAsync(registerDto))
                .ReturnsAsync(expectedUser);

            // Act
            var result = await _controller.Register(registerDto);

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var user = okResult.Value as UserDto;
            user!.Role.Should().Be("Admin");
        }

        [Fact]
        public async Task Register_InvalidRole_ReturnsBadRequest()
        {
            // Arrange
            var registerDto = new RegisterUserDto
            {
                Username = "testuser",
                Password = "password123",
                Role = "InvalidRole"
            };

            _mockAuthService.Setup(s => s.RegisterUserAsync(registerDto))
                .ReturnsAsync((UserDto?)null);

            // Act
            var result = await _controller.Register(registerDto);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }
    }
}
