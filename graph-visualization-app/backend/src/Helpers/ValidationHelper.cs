using FluentValidation;
using FluentValidation.Results;
using Microsoft.AspNetCore.Mvc;

namespace GraphVisualizationApp.Helpers
{
    
    public static class ValidationHelper
    {
        
        public static async Task<(bool IsValid, IActionResult? ErrorResult)> ValidateAsync<T>(
            T model, 
            IValidator<T> validator,
            HttpContext httpContext)
        {
            var validationResult = await validator.ValidateAsync(model);
            
            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Select(e => e.ErrorMessage).ToArray()
                    );

                var response = new
                {
                    type = "ValidationError",
                    title = "Ошибка валидации данных",
                    status = 400,
                    errors = errors,
                    traceId = httpContext.TraceIdentifier
                };

                return (false, new BadRequestObjectResult(response));
            }

            return (true, null);
        }

        /// <summary>
        /// Создает BadRequest с кастомной ошибкой валидации
        /// </summary>
        public static IActionResult CreateValidationError(
            string propertyName, 
            string errorMessage,
            HttpContext httpContext)
        {
            var errors = new Dictionary<string, string[]>
            {
                { propertyName, new[] { errorMessage } }
            };

            var response = new
            {
                type = "ValidationError",
                title = "Ошибка валидации данных",
                status = 400,
                errors = errors,
                traceId = httpContext.TraceIdentifier
            };

            return new BadRequestObjectResult(response);
        }

        /// <summary>
        /// Создает BadRequest с множественными ошибками валидации
        /// </summary>
        public static IActionResult CreateValidationErrors(
            Dictionary<string, string[]> errors,
            HttpContext httpContext)
        {
            var response = new
            {
                type = "ValidationError",
                title = "Ошибка валидации данных",
                status = 400,
                errors = errors,
                traceId = httpContext.TraceIdentifier
            };

            return new BadRequestObjectResult(response);
        }
    }
}
