using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GraphVisualizationApp.Migrations
{

    public partial class InitialCreate : Migration
    {

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ObjectTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Color = table.Column<string>(type: "text", nullable: true),
                    Icon = table.Column<string>(type: "text", nullable: true),
                    Shape = table.Column<string>(type: "text", nullable: true),
                    ImageUrl = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ObjectTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GraphObjects",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: true),
                    ObjectTypeId = table.Column<int>(type: "integer", nullable: false),
                    PositionX = table.Column<double>(type: "double precision", nullable: true),
                    PositionY = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GraphObjects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GraphObjects_ObjectTypes_ObjectTypeId",
                        column: x => x.ObjectTypeId,
                        principalTable: "ObjectTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RelationTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    ObjectTypeId = table.Column<int>(type: "integer", nullable: false),
                    Color = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RelationTypes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RelationTypes_ObjectTypes_ObjectTypeId",
                        column: x => x.ObjectTypeId,
                        principalTable: "ObjectTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ObjectProperties",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ObjectId = table.Column<int>(type: "integer", nullable: false),
                    Key = table.Column<string>(type: "text", nullable: true),
                    Value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ObjectProperties", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ObjectProperties_GraphObjects_ObjectId",
                        column: x => x.ObjectId,
                        principalTable: "GraphObjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GraphRelations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    Target = table.Column<int>(type: "integer", nullable: false),
                    RelationTypeId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GraphRelations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GraphRelations_GraphObjects_Source",
                        column: x => x.Source,
                        principalTable: "GraphObjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GraphRelations_GraphObjects_Target",
                        column: x => x.Target,
                        principalTable: "GraphObjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GraphRelations_RelationTypes_RelationTypeId",
                        column: x => x.RelationTypeId,
                        principalTable: "RelationTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RelationProperties",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RelationId = table.Column<int>(type: "integer", nullable: false),
                    Key = table.Column<string>(type: "text", nullable: true),
                    Value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RelationProperties", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RelationProperties_GraphRelations_RelationId",
                        column: x => x.RelationId,
                        principalTable: "GraphRelations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GraphObjects_ObjectTypeId",
                table: "GraphObjects",
                column: "ObjectTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_GraphRelations_RelationTypeId",
                table: "GraphRelations",
                column: "RelationTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_GraphRelations_Source",
                table: "GraphRelations",
                column: "Source");

            migrationBuilder.CreateIndex(
                name: "IX_GraphRelations_Target",
                table: "GraphRelations",
                column: "Target");

            migrationBuilder.CreateIndex(
                name: "IX_ObjectProperties_ObjectId",
                table: "ObjectProperties",
                column: "ObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_RelationProperties_RelationId",
                table: "RelationProperties",
                column: "RelationId");

            migrationBuilder.CreateIndex(
                name: "IX_RelationTypes_ObjectTypeId",
                table: "RelationTypes",
                column: "ObjectTypeId");
        }


        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ObjectProperties");

            migrationBuilder.DropTable(
                name: "RelationProperties");

            migrationBuilder.DropTable(
                name: "GraphRelations");

            migrationBuilder.DropTable(
                name: "GraphObjects");

            migrationBuilder.DropTable(
                name: "RelationTypes");

            migrationBuilder.DropTable(
                name: "ObjectTypes");
        }
    }
}
