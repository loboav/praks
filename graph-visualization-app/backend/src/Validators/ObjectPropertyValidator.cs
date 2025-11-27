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
                .Matches(@"^[a-zA-Zа-яА-ЯёЁ0-9_\-\.\s]+$")
                .WithMessage("Ключ свойства может содержать только буквы, цифры, пробелы, _, - и .");

            RuleFor(x => x.Value)
                .MaximumLength(1000)
                .WithMessage("Значение свойства не может быть длиннее 1000 символов");
        }
    }
}
