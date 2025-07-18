﻿
using System;
using GraphVisualizationApp;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GraphVisualizationApp.Migrations
{
    [DbContext(typeof(GraphDbContext))]
    partial class GraphDbContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "7.0.11")
                .HasAnnotation("Relational:MaxIdentifierLength", 63);

            NpgsqlModelBuilderExtensions.UseIdentityByDefaultColumns(modelBuilder);

            modelBuilder.Entity("GraphVisualizationApp.Models.GraphObject", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<string>("Color")
                        .HasColumnType("text");

                    b.Property<string>("Icon")
                        .HasColumnType("text");

                    b.Property<string>("Name")
                        .HasColumnType("text");

                    b.Property<int>("ObjectTypeId")
                        .HasColumnType("integer");

                    b.Property<double?>("PositionX")
                        .HasColumnType("double precision");

                    b.Property<double?>("PositionY")
                        .HasColumnType("double precision");

                    b.HasKey("Id");

                    b.HasIndex("ObjectTypeId");

                    b.ToTable("GraphObjects");
                });

            modelBuilder.Entity("GraphVisualizationApp.Models.GraphRelation", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<string>("Color")
                        .HasColumnType("text");

                    b.Property<int>("RelationTypeId")
                        .HasColumnType("integer");

                    b.Property<int>("Source")
                        .HasColumnType("integer");

                    b.Property<int>("Target")
                        .HasColumnType("integer");

                    b.HasKey("Id");

                    b.HasIndex("RelationTypeId");

                    b.HasIndex("Source");

                    b.HasIndex("Target");

                    b.ToTable("GraphRelations");
                });

            modelBuilder.Entity("GraphVisualizationApp.Models.ObjectProperty", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<string>("Key")
                        .HasColumnType("text");

                    b.Property<int>("ObjectId")
                        .HasColumnType("integer");

                    b.Property<string>("Value")
                        .HasColumnType("text");

                    b.HasKey("Id");

                    b.HasIndex("ObjectId");

                    b.ToTable("ObjectProperties");
                });

            modelBuilder.Entity("GraphVisualizationApp.Models.ObjectType", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<string>("Color")
                        .HasColumnType("text");

                    b.Property<string>("Description")
                        .HasColumnType("text");

                    b.Property<string>("Icon")
                        .HasColumnType("text");

                    b.Property<string>("ImageUrl")
                        .HasColumnType("text");

                    b.Property<string>("Name")
                        .HasColumnType("text");

                    b.Property<string>("Shape")
                        .HasColumnType("text");

                    b.HasKey("Id");

                    b.ToTable("ObjectTypes");
                });

            modelBuilder.Entity("GraphVisualizationApp.Models.RelationProperty", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<string>("Key")
                        .HasColumnType("text");

                    b.Property<int>("RelationId")
                        .HasColumnType("integer");

                    b.Property<string>("Value")
                        .HasColumnType("text");

                    b.HasKey("Id");

                    b.HasIndex("RelationId");

                    b.ToTable("RelationProperties");
                });

            modelBuilder.Entity("GraphVisualizationApp.Models.RelationType", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<string>("Color")
                        .HasColumnType("text");

                    b.Property<string>("Description")
                        .HasColumnType("text");

                    b.Property<string>("Name")
                        .HasColumnType("text");

                    b.Property<int>("ObjectTypeId")
                        .HasColumnType("integer");

                    b.HasKey("Id");

                    b.HasIndex("ObjectTypeId");

                    b.ToTable("RelationTypes");
                });

            modelBuilder.Entity("GraphVisualizationApp.Models.GraphObject", b =>
                {
                    b.HasOne("GraphVisualizationApp.Models.ObjectType", "ObjectType")
                        .WithMany("Objects")
                        .HasForeignKey("ObjectTypeId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("ObjectType");
                });

            modelBuilder.Entity("GraphVisualizationApp.Models.GraphRelation", b =>
                {
                    b.HasOne("GraphVisualizationApp.Models.RelationType", "RelationType")
                        .WithMany("Relations")
                        .HasForeignKey("RelationTypeId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("GraphVisualizationApp.Models.GraphObject", "SourceObject")
                        .WithMany("OutgoingRelations")
                        .HasForeignKey("Source")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("GraphVisualizationApp.Models.GraphObject", "TargetObject")
                        .WithMany("IncomingRelations")
                        .HasForeignKey("Target")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("RelationType");

                    b.Navigation("SourceObject");

                    b.Navigation("TargetObject");
                });

            modelBuilder.Entity("GraphVisualizationApp.Models.ObjectProperty", b =>
                {
                    b.HasOne("GraphVisualizationApp.Models.GraphObject", "Object")
                        .WithMany("Properties")
                        .HasForeignKey("ObjectId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Object");
                });

            modelBuilder.Entity("GraphVisualizationApp.Models.RelationProperty", b =>
                {
                    b.HasOne("GraphVisualizationApp.Models.GraphRelation", "Relation")
                        .WithMany("Properties")
                        .HasForeignKey("RelationId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Relation");
                });

            modelBuilder.Entity("GraphVisualizationApp.Models.RelationType", b =>
                {
                    b.HasOne("GraphVisualizationApp.Models.ObjectType", "ObjectType")
                        .WithMany("RelationTypes")
                        .HasForeignKey("ObjectTypeId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("ObjectType");
                });

            modelBuilder.Entity("GraphVisualizationApp.Models.GraphObject", b =>
                {
                    b.Navigation("IncomingRelations");

                    b.Navigation("OutgoingRelations");

                    b.Navigation("Properties");
                });

            modelBuilder.Entity("GraphVisualizationApp.Models.GraphRelation", b =>
                {
                    b.Navigation("Properties");
                });

            modelBuilder.Entity("GraphVisualizationApp.Models.ObjectType", b =>
                {
                    b.Navigation("Objects");

                    b.Navigation("RelationTypes");
                });

            modelBuilder.Entity("GraphVisualizationApp.Models.RelationType", b =>
                {
                    b.Navigation("Relations");
                });
#pragma warning restore 612, 618
        }
    }
}
