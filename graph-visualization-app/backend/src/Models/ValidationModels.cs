using System.ComponentModel.DataAnnotations;

namespace GraphVisualizationApp.Models.Validation
{
    public class CreateObjectTypeDto
    {
        [Required(ErrorMessage = "Name is required")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 100 characters")]
        public string Name { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        public string? Description { get; set; }

        [RegularExpression(@"^#[0-9A-Fa-f]{6}$", ErrorMessage = "Color must be a valid hex color (e.g., #FF5733)")]
        public string? Color { get; set; }

        [StringLength(50, ErrorMessage = "Icon cannot exceed 50 characters")]
        public string? Icon { get; set; }

        [StringLength(50, ErrorMessage = "Shape cannot exceed 50 characters")]
        public string? Shape { get; set; }

        [Url(ErrorMessage = "ImageUrl must be a valid URL")]
        public string? ImageUrl { get; set; }
    }

    public class UpdateObjectTypeDto
    {
        [Required]
        public int Id { get; set; }

        [StringLength(100, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 100 characters")]
        public string? Name { get; set; }

        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        public string? Description { get; set; }

        [RegularExpression(@"^#[0-9A-Fa-f]{6}$", ErrorMessage = "Color must be a valid hex color (e.g., #FF5733)")]
        public string? Color { get; set; }

        [StringLength(50, ErrorMessage = "Icon cannot exceed 50 characters")]
        public string? Icon { get; set; }

        [StringLength(50, ErrorMessage = "Shape cannot exceed 50 characters")]
        public string? Shape { get; set; }

        [Url(ErrorMessage = "ImageUrl must be a valid URL")]
        public string? ImageUrl { get; set; }
    }

    public class CreateRelationTypeDto
    {
        [Required(ErrorMessage = "Name is required")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 100 characters")]
        public string Name { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        public string? Description { get; set; }

        [Required(ErrorMessage = "ObjectTypeId is required")]
        [Range(1, int.MaxValue, ErrorMessage = "ObjectTypeId must be a positive integer")]
        public int ObjectTypeId { get; set; }

        [RegularExpression(@"^#[0-9A-Fa-f]{6}$", ErrorMessage = "Color must be a valid hex color (e.g., #FF5733)")]
        public string? Color { get; set; }
    }

    public class CreateGraphObjectDto
    {
        [Required(ErrorMessage = "Name is required")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 100 characters")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "ObjectTypeId is required")]
        [Range(1, int.MaxValue, ErrorMessage = "ObjectTypeId must be a positive integer")]
        public int ObjectTypeId { get; set; }

        public double? PositionX { get; set; }
        public double? PositionY { get; set; }

        [RegularExpression(@"^#[0-9A-Fa-f]{6}$", ErrorMessage = "Color must be a valid hex color (e.g., #FF5733)")]
        public string? Color { get; set; }

        [StringLength(50, ErrorMessage = "Icon cannot exceed 50 characters")]
        public string? Icon { get; set; }

        public Dictionary<string, string>? Properties { get; set; }
    }

    public class UpdateGraphObjectDto
    {
        [Required]
        public int Id { get; set; }

        [StringLength(100, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 100 characters")]
        public string? Name { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "ObjectTypeId must be a positive integer")]
        public int? ObjectTypeId { get; set; }

        public double? PositionX { get; set; }
        public double? PositionY { get; set; }

        [RegularExpression(@"^#[0-9A-Fa-f]{6}$", ErrorMessage = "Color must be a valid hex color (e.g., #FF5733)")]
        public string? Color { get; set; }

        [StringLength(50, ErrorMessage = "Icon cannot exceed 50 characters")]
        public string? Icon { get; set; }
    }

    public class CreateGraphRelationDto
    {
        [Required(ErrorMessage = "Source is required")]
        [Range(1, int.MaxValue, ErrorMessage = "Source must be a positive integer")]
        public int Source { get; set; }

        [Required(ErrorMessage = "Target is required")]
        [Range(1, int.MaxValue, ErrorMessage = "Target must be a positive integer")]
        public int Target { get; set; }

        [Required(ErrorMessage = "RelationTypeId is required")]
        [Range(1, int.MaxValue, ErrorMessage = "RelationTypeId must be a positive integer")]
        public int RelationTypeId { get; set; }

        [RegularExpression(@"^#[0-9A-Fa-f]{6}$", ErrorMessage = "Color must be a valid hex color (e.g., #FF5733)")]
        public string? Color { get; set; }

        public Dictionary<string, string>? Properties { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (Source == Target)
            {
                yield return new ValidationResult(
                    "Source and Target cannot be the same (self-loops not allowed)",
                    new[] { nameof(Source), nameof(Target) }
                );
            }
        }
    }

    public class UpdateGraphRelationDto
    {
        [Required]
        public int Id { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Source must be a positive integer")]
        public int? Source { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Target must be a positive integer")]
        public int? Target { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "RelationTypeId must be a positive integer")]
        public int? RelationTypeId { get; set; }

        [RegularExpression(@"^#[0-9A-Fa-f]{6}$", ErrorMessage = "Color must be a valid hex color (e.g., #FF5733)")]
        public string? Color { get; set; }
    }

    public class AddPropertyDto
    {
        [Required(ErrorMessage = "Key is required")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Key must be between 1 and 100 characters")]
        public string Key { get; set; } = string.Empty;

        [Required(ErrorMessage = "Value is required")]
        [StringLength(1000, ErrorMessage = "Value cannot exceed 1000 characters")]
        public string Value { get; set; } = string.Empty;
    }

    public class FindPathRequestDto
    {
        [Required(ErrorMessage = "FromId is required")]
        [Range(1, int.MaxValue, ErrorMessage = "FromId must be a positive integer")]
        public int FromId { get; set; }

        [Required(ErrorMessage = "ToId is required")]
        [Range(1, int.MaxValue, ErrorMessage = "ToId must be a positive integer")]
        public int ToId { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (FromId == ToId)
            {
                yield return new ValidationResult(
                    "FromId and ToId cannot be the same",
                    new[] { nameof(FromId), nameof(ToId) }
                );
            }
        }
    }

    public class BatchUpdateRequestDto
    {
        [Required(ErrorMessage = "Ids are required")]
        [MinLength(1, ErrorMessage = "At least one ID must be provided")]
        public List<int> Ids { get; set; } = new List<int>();

        [Required(ErrorMessage = "Fields are required")]
        [MinLength(1, ErrorMessage = "At least one field must be provided")]
        public Dictionary<string, object> Fields { get; set; } = new Dictionary<string, object>();

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (Ids.Any(id => id <= 0))
            {
                yield return new ValidationResult(
                    "All IDs must be positive integers",
                    new[] { nameof(Ids) }
                );
            }
        }
    }

    public class SaveLayoutDto
    {
        [Required(ErrorMessage = "LayoutJson is required")]
        public string LayoutJson { get; set; } = string.Empty;

        public int? GraphId { get; set; }

        [StringLength(100, ErrorMessage = "UserId cannot exceed 100 characters")]
        public string? UserId { get; set; }
    }
}
