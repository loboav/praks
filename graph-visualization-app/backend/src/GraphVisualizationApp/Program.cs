using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;
using GraphVisualizationApp.Services;
using GraphVisualizationApp;
using GraphVisualizationApp.Middleware;
using GraphVisualizationApp.Data;
using FluentValidation;
using FluentValidation.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();

// Add FluentValidation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddFluentValidationClientsideAdapters();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddEndpointsApiExplorer();

// Configure Swagger with detailed documentation
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Version = "v1",
        Title = "Graph Visualization API",
        Description = "API for managing and visualizing directed graphs with objects, relations, and pathfinding capabilities",
        Contact = new OpenApiContact
        {
            Name = "Support",
            Email = "support@example.com"
        },
        License = new OpenApiLicense
        {
            Name = "MIT License",
            Url = new Uri("https://opensource.org/licenses/MIT")
        }
    });
});

// Configure CORS
var corsOrigins = builder.Configuration.GetSection("CorsOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3000" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy => policy
            .WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

// Configure Database
builder.Services.AddDbContext<GraphDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    options.UseNpgsql(connectionString);

    // Enable detailed errors in development
    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
    }
});

// Register application services
builder.Services.AddScoped<IGraphService, GraphService>();
builder.Services.AddScoped<IExportService, ExportService>();
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();

// Add health checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<GraphDbContext>("database");

// Add memory cache for performance
builder.Services.AddMemoryCache();

// Configure response compression
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
});

var app = builder.Build();

// Configure the HTTP request pipeline

// Add validation exception handling middleware (должен быть перед ExceptionHandlingMiddleware)
app.UseValidationExceptionHandler();

// Add global exception handling middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Enable response compression
app.UseResponseCompression();

// Database migration and initialization
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<GraphDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        logger.LogInformation("Applying database migrations...");
        db.Database.Migrate();
        logger.LogInformation("Database migrations applied successfully");

        // Seed database with initial data
        logger.LogInformation("Starting database seeding...");
        await DatabaseSeeder.SeedAsync(db, configuration);
        logger.LogInformation("Database seeding completed");
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating or seeding the database");
        throw;
    }
}

// Swagger UI (enabled in both Development and Production for demo purposes)
if (app.Environment.IsDevelopment() || app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Graph Visualization API v1");
        c.RoutePrefix = "swagger";
        c.DocumentTitle = "Graph Visualization API";
        c.DisplayRequestDuration();
    });
}

// Enable CORS before authentication and authorization
app.UseCors("AllowFrontend");

// Redirect root to Swagger UI
app.MapGet("/", () => Results.Redirect("/swagger")).ExcludeFromDescription();

// Health check endpoint
app.MapHealthChecks("/health");

app.UseAuthorization();

app.MapControllers();

// Log application start
app.Logger.LogInformation("Graph Visualization API starting...");
app.Logger.LogInformation("Environment: {Environment}", app.Environment.EnvironmentName);
app.Logger.LogInformation("Swagger UI available at: /swagger");

app.Run();
