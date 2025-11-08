using FluentValidation;
using GraphVisualizationApp.Models;

namespace GraphVisualizationApp.Validators
{
    /// <summary>
    /// Валидатор для SearchOptions
    /// </summary>
    public class SearchOptionsValidator : AbstractValidator<SearchOptions>
    {
        public SearchOptionsValidator()
        {
            RuleFor(x => x.MaxResults)
                .InclusiveBetween(0, 1000)
                .WithMessage("Максимальное количество результатов должно быть от 0 до 1000");

            RuleFor(x => x.MinRelevance)
                .InclusiveBetween(0.0, 1.0)
                .WithMessage("Минимальная релевантность должна быть от 0.0 до 1.0");

            RuleFor(x => x.FuzzyMaxDistance)
                .InclusiveBetween(1, 5)
                .When(x => x.UseFuzzySearch)
                .WithMessage("Максимальное расстояние для нечёткого поиска должно быть от 1 до 5");

            RuleFor(x => x.ObjectTypeIds)
                .Must(ids => ids == null || ids.All(id => id > 0))
                .WithMessage("Все ID типов объектов должны быть положительными числами");

            RuleFor(x => x.RelationTypeIds)
                .Must(ids => ids == null || ids.All(id => id > 0))
                .WithMessage("Все ID типов связей должны быть положительными числами");
        }
    }
}
