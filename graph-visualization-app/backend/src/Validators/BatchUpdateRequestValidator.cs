using FluentValidation;
using GraphVisualizationApp.Controllers;

namespace GraphVisualizationApp.Validators
{
    /// <summary>
    /// Валидатор для BatchUpdateRequest
    /// </summary>
    public class BatchUpdateRequestValidator : AbstractValidator<GraphController.BatchUpdateRequest>
    {
        public BatchUpdateRequestValidator()
        {
            RuleFor(x => x.Ids)
                .NotEmpty()
                .WithMessage("Список ID не может быть пустым");

            RuleFor(x => x.Ids)
                .Must(ids => ids.Count <= 1000)
                .WithMessage("Нельзя обновить более 1000 объектов за один раз");

            RuleFor(x => x.Ids)
                .Must(ids => ids.All(id => id > 0))
                .WithMessage("Все ID должны быть положительными числами");

            RuleFor(x => x.Ids)
                .Must(ids => ids.Distinct().Count() == ids.Count)
                .WithMessage("В списке ID есть дубликаты");

            RuleFor(x => x.Fields)
                .NotEmpty()
                .WithMessage("Необходимо указать хотя бы одно поле для обновления");

            RuleFor(x => x.Fields)
                .Must(fields => fields.Count <= 20)
                .WithMessage("Нельзя обновить более 20 полей за один раз");
        }
    }
}
