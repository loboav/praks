using FluentValidation;
using GraphVisualizationApp.Models;

namespace GraphVisualizationApp.Validators
{
    /// <summary>
    /// Валидатор для GraphObject
    /// </summary>
    public class GraphObjectValidator : AbstractValidator<GraphObject>
    {
        public GraphObjectValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty()
                .WithMessage("Имя объекта обязательно")
                .MaximumLength(200)
                .WithMessage("Имя объекта не может быть длиннее 200 символов")
                .Matches(@"^[a-zA-Zа-яА-ЯёЁ0-9\s\-_\.,\(\)\[\]""']+$")
                .WithMessage("Имя объекта содержит недопустимые символы");

            RuleFor(x => x.ObjectTypeId)
                .GreaterThan(0)
                .WithMessage("Необходимо указать корректный тип объекта");

            RuleFor(x => x.Color)
                .Matches(@"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")
                .When(x => !string.IsNullOrEmpty(x.Color))
                .WithMessage("Цвет должен быть в формате HEX (#RRGGBB или #RGB)");

            RuleFor(x => x.Icon)
                .MaximumLength(100)
                .When(x => !string.IsNullOrEmpty(x.Icon))
                .WithMessage("Иконка не может быть длиннее 100 символов");

            RuleFor(x => x.PositionX)
                .InclusiveBetween(-100000, 100000)
                .When(x => x.PositionX.HasValue)
                .WithMessage("Координата X должна быть в диапазоне от -100000 до 100000");

            RuleFor(x => x.PositionY)
                .InclusiveBetween(-100000, 100000)
                .When(x => x.PositionY.HasValue)
                .WithMessage("Координата Y должна быть в диапазоне от -100000 до 100000");

            RuleFor(x => x.Properties)
                .Must(props => props == null || props.Count <= 100)
                .WithMessage("Объект не может иметь более 100 свойств");

            RuleForEach(x => x.Properties)
                .SetValidator(new ObjectPropertyValidator())
                .When(x => x.Properties != null && x.Properties.Any());
        }
    }
}
