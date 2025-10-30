using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GraphVisualizationApp.Migrations
{
    /// <summary>
    /// Добавляет индексы для улучшения производительности запросов к графу
    /// </summary>
    public partial class AddPerformanceIndexes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Индексы для GraphRelations - критично для поиска путей
            migrationBuilder.CreateIndex(
                name: "IX_GraphRelations_Source",
                table: "GraphRelations",
                column: "Source");

            migrationBuilder.CreateIndex(
                name: "IX_GraphRelations_Target",
                table: "GraphRelations",
                column: "Target");

            migrationBuilder.CreateIndex(
                name: "IX_GraphRelations_Source_Target",
                table: "GraphRelations",
                columns: new[] { "Source", "Target" });

            migrationBuilder.CreateIndex(
                name: "IX_GraphRelations_RelationTypeId",
                table: "GraphRelations",
                column: "RelationTypeId");

            // Индексы для GraphObjects
            migrationBuilder.CreateIndex(
                name: "IX_GraphObjects_ObjectTypeId",
                table: "GraphObjects",
                column: "ObjectTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_GraphObjects_Name",
                table: "GraphObjects",
                column: "Name");

            // Индексы для Properties - ускоряют поиск по свойствам
            migrationBuilder.CreateIndex(
                name: "IX_ObjectProperties_ObjectId",
                table: "ObjectProperties",
                column: "ObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ObjectProperties_Key",
                table: "ObjectProperties",
                column: "Key");

            migrationBuilder.CreateIndex(
                name: "IX_RelationProperties_RelationId",
                table: "RelationProperties",
                column: "RelationId");

            migrationBuilder.CreateIndex(
                name: "IX_RelationProperties_Key",
                table: "RelationProperties",
                column: "Key");

            // Индекс для GraphLayout - ускоряет загрузку layout
            migrationBuilder.CreateIndex(
                name: "IX_GraphLayouts_GraphId_UserId",
                table: "GraphLayouts",
                columns: new[] { "GraphId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_GraphLayouts_UpdatedAt",
                table: "GraphLayouts",
                column: "UpdatedAt");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_GraphRelations_Source", table: "GraphRelations");
            migrationBuilder.DropIndex(name: "IX_GraphRelations_Target", table: "GraphRelations");
            migrationBuilder.DropIndex(name: "IX_GraphRelations_Source_Target", table: "GraphRelations");
            migrationBuilder.DropIndex(name: "IX_GraphRelations_RelationTypeId", table: "GraphRelations");
            migrationBuilder.DropIndex(name: "IX_GraphObjects_ObjectTypeId", table: "GraphObjects");
            migrationBuilder.DropIndex(name: "IX_GraphObjects_Name", table: "GraphObjects");
            migrationBuilder.DropIndex(name: "IX_ObjectProperties_ObjectId", table: "ObjectProperties");
            migrationBuilder.DropIndex(name: "IX_ObjectProperties_Key", table: "ObjectProperties");
            migrationBuilder.DropIndex(name: "IX_RelationProperties_RelationId", table: "RelationProperties");
            migrationBuilder.DropIndex(name: "IX_RelationProperties_Key", table: "RelationProperties");
            migrationBuilder.DropIndex(name: "IX_GraphLayouts_GraphId_UserId", table: "GraphLayouts");
            migrationBuilder.DropIndex(name: "IX_GraphLayouts_UpdatedAt", table: "GraphLayouts");
        }
    }
}
