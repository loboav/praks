using FluentValidation;

namespace GraphVisualizationApp.Validators
{
    /// <summary>
    /// Валидатор для параметров поиска пути
    /// </summary>
    public class PathFindingRequest
    {
        public int FromId { get; set; }
        public int ToId { get; set; }
    }

    public class PathFindingValidator : AbstractValidator<PathFindingRequest>
    {
        public PathFindingValidator()
        {
            RuleFor(x => x.FromId)
                .GreaterThan(0)
                .WithMessage("ID начального объекта должен быть положительным числом");

            RuleFor(x => x.ToId)
                .GreaterThan(0)
                .WithMessage("ID конечного объекта должен быть положительным числом");

            RuleFor(x => x)
                .Must(x => x.FromId != x.ToId)
                .WithMessage("Начальный и конечный объекты не могут совпадать");
        }
    }
}
