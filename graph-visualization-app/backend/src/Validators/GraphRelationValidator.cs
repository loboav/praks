using FluentValidation;
using GraphVisualizationApp.Models;

namespace GraphVisualizationApp.Validators
{
    /// <summary>
    /// Валидатор для GraphRelation
    /// </summary>
    public class GraphRelationValidator : AbstractValidator<GraphRelation>
    {
        public GraphRelationValidator()
        {
            RuleFor(x => x.Source)
                .GreaterThan(0)
                .When(x => x.Id == 0) // Только при создании
                .WithMessage("Необходимо указать корректный исходный объект");

            RuleFor(x => x.Target)
                .GreaterThan(0)
                .When(x => x.Id == 0) // Только при создании
                .WithMessage("Необходимо указать корректный целевой объект");

            RuleFor(x => x)
                .Must(x => x.Source != x.Target) // Запрещать самоссылки
                .When(x => x.Source > 0 && x.Target > 0) // Только когда оба значения заданы
                .WithMessage("Объект не может быть связан сам с собой");

            RuleFor(x => x.RelationTypeId)
                .GreaterThan(0)
                .WithMessage("Необходимо указать корректный тип связи");

            RuleFor(x => x.Color)
                .Matches(@"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")
                .When(x => !string.IsNullOrEmpty(x.Color))
                .WithMessage("Цвет должен быть в формате HEX (#RRGGBB или #RGB)");

            RuleFor(x => x.Properties)
                .Must(props => props == null || props.Count <= 50)
                .WithMessage("Связь не может иметь более 50 свойств");

            RuleForEach(x => x.Properties)
                .SetValidator(new RelationPropertyValidator())
                .When(x => x.Properties != null && x.Properties.Any());
        }
    }
}
