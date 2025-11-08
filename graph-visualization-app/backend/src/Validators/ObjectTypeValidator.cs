using FluentValidation;
using GraphVisualizationApp.Models;

namespace GraphVisualizationApp.Validators
{
    /// <summary>
    /// Валидатор для ObjectType
    /// </summary>
    public class ObjectTypeValidator : AbstractValidator<ObjectType>
    {
        public ObjectTypeValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty()
                .WithMessage("Название типа объекта обязательно")
                .MaximumLength(100)
                .WithMessage("Название типа объекта не может быть длиннее 100 символов")
                .Matches(@"^[a-zA-Zа-яА-ЯёЁ0-9\s\-_]+$")
                .WithMessage("Название типа объекта содержит недопустимые символы");

            RuleFor(x => x.Description)
                .MaximumLength(500)
                .When(x => !string.IsNullOrEmpty(x.Description))
                .WithMessage("Описание не может быть длиннее 500 символов");

            RuleFor(x => x.Color)
                .Matches(@"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")
                .When(x => !string.IsNullOrEmpty(x.Color))
                .WithMessage("Цвет должен быть в формате HEX (#RRGGBB или #RGB)");

            RuleFor(x => x.Icon)
                .MaximumLength(100)
                .When(x => !string.IsNullOrEmpty(x.Icon))
                .WithMessage("Иконка не может быть длиннее 100 символов");

            RuleFor(x => x.Shape)
                .Must(shape => shape == null || new[] { "circle", "square", "triangle", "diamond", "star", "hexagon" }.Contains(shape.ToLower()))
                .When(x => !string.IsNullOrEmpty(x.Shape))
                .WithMessage("Недопустимая форма. Допустимые значения: circle, square, triangle, diamond, star, hexagon");

            RuleFor(x => x.ImageUrl)
                .Must(BeAValidUrl)
                .When(x => !string.IsNullOrEmpty(x.ImageUrl))
                .WithMessage("Некорректный URL изображения");
        }

        private bool BeAValidUrl(string? url)
        {
            if (string.IsNullOrEmpty(url)) return true;
            return Uri.TryCreate(url, UriKind.Absolute, out var uriResult)
                && (uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps);
        }
    }
}
