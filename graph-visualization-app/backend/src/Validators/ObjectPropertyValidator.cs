using FluentValidation;
using GraphVisualizationApp.Models;

namespace GraphVisualizationApp.Validators
{
    /// <summary>
    /// Валидатор для ObjectProperty
    /// </summary>
    public class ObjectPropertyValidator : AbstractValidator<ObjectProperty>
    {
        public ObjectPropertyValidator()
        {
            RuleFor(x => x.Key)
                .NotEmpty()
                .WithMessage("Ключ свойства обязателен")
                .MaximumLength(100)
                .WithMessage("Ключ свойства не может быть длиннее 100 символов")
                .Matches(@"^[a-zA-Z0-9_\-\.]+$")
                .WithMessage("Ключ свойства может содержать только латинские буквы, цифры, _, - и .");

            RuleFor(x => x.Value)
                .NotEmpty()
                .WithMessage("Значение свойства обязательно")
                .MaximumLength(1000)
                .WithMessage("Значение свойства не может быть длиннее 1000 символов");

            RuleFor(x => x.ObjectId)
                .GreaterThan(0)
                .When(x => x.ObjectId > 0)
                .WithMessage("Некорректный ID объекта");
        }
    }
}
