using FluentValidation;
using GraphVisualizationApp.Models;

namespace GraphVisualizationApp.Validators
{
    /// <summary>
    /// Валидатор для RelationType
    /// </summary>
    public class RelationTypeValidator : AbstractValidator<RelationType>
    {
        public RelationTypeValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty()
                .WithMessage("Название типа связи обязательно")
                .MaximumLength(100)
                .WithMessage("Название типа связи не может быть длиннее 100 символов")
                .Matches(@"^[a-zA-Zа-яА-ЯёЁ0-9\s\-_]+$")
                .WithMessage("Название типа связи содержит недопустимые символы");

            RuleFor(x => x.Description)
                .MaximumLength(500)
                .When(x => !string.IsNullOrEmpty(x.Description))
                .WithMessage("Описание не может быть длиннее 500 символов");

            RuleFor(x => x.ObjectTypeId)
                .GreaterThan(0)
                .WithMessage("Необходимо указать корректный тип объекта");

            RuleFor(x => x.Color)
                .Matches(@"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")
                .When(x => !string.IsNullOrEmpty(x.Color))
                .WithMessage("Цвет должен быть в формате HEX (#RRGGBB или #RGB)");
        }
    }
}
