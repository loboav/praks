using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GraphVisualizationApp.Migrations
{

    public partial class AddColorAndIconToGraphObjects : Migration
    {

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Color",
                table: "GraphRelations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Color",
                table: "GraphObjects",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Icon",
                table: "GraphObjects",
                type: "text",
                nullable: true);
        }


        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Color",
                table: "GraphRelations");

            migrationBuilder.DropColumn(
                name: "Color",
                table: "GraphObjects");

            migrationBuilder.DropColumn(
                name: "Icon",
                table: "GraphObjects");
        }
    }
}
