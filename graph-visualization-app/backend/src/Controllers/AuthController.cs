using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GraphVisualizationApp.Models;
using GraphVisualizationApp.Services;
using System.Security.Claims;

namespace GraphVisualizationApp.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
        {
            var response = await _authService.LoginAsync(request);
            if (response == null)
            {
                return Unauthorized(new { message = "Неверное имя пользователя или пароль" });
            }

            return Ok(response);
        }

        [HttpPost("signup")]
        public async Task<ActionResult<UserDto>> Signup([FromBody] LoginRequest request)
        {
            // Публичная регистрация - дает роль Editor
            // Если это первый пользователь - даем Admin
            var dto = new RegisterUserDto
            {
                Username = request.Username,
                Password = request.Password,
                Role = "Editor" // По умолчанию Editor
            };

            var user = await _authService.RegisterUserAsync(dto);
            if (user == null)
            {
                return BadRequest(new { message = "Пользователь с таким именем уже существует" });
            }

            return Ok(user);
        }

        [HttpPost("register")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<UserDto>> Register([FromBody] RegisterUserDto dto)
        {
            var user = await _authService.RegisterUserAsync(dto);
            if (user == null)
            {
                return BadRequest(new { message = "Пользователь с таким именем уже существует или роль недействительна" });
            }

            return Ok(user);
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<UserDto>> GetCurrentUser()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var user = await _authService.GetUserByIdAsync(userId);
            
            if (user == null)
            {
                return NotFound();
            }

            return Ok(user);
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var success = await _authService.ChangePasswordAsync(userId, dto);

            if (!success)
            {
                return BadRequest(new { message = "Неверный текущий пароль" });
            }

            return Ok(new { message = "Пароль успешно изменен" });
        }
    }
}
