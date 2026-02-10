using Microsoft.EntityFrameworkCore;
using GraphVisualizationApp.Models;

namespace GraphVisualizationApp
{
    public class GraphDbContext : DbContext
    {
        public GraphDbContext(DbContextOptions<GraphDbContext> options) : base(options) { }

        public DbSet<ObjectType> ObjectTypes { get; set; }
        public DbSet<RelationType> RelationTypes { get; set; }
        public DbSet<GraphObject> GraphObjects { get; set; }
        public DbSet<ObjectProperty> ObjectProperties { get; set; }
        public DbSet<GraphRelation> GraphRelations { get; set; }
        public DbSet<RelationProperty> RelationProperties { get; set; }
        public DbSet<GraphLayout> GraphLayouts { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<PropertySchema> PropertySchemas { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<GraphObject>()
                .HasMany(o => o.OutgoingRelations)
                .WithOne(r => r.SourceObject)
                .HasForeignKey(r => r.Source)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<GraphObject>()
                .HasMany(o => o.IncomingRelations)
                .WithOne(r => r.TargetObject)
                .HasForeignKey(r => r.Target)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PropertySchema>()
                .HasOne(ps => ps.ObjectType)
                .WithMany(ot => ot.PropertySchemas)
                .HasForeignKey(ps => ps.ObjectTypeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PropertySchema>()
                .HasOne(ps => ps.RelationType)
                .WithMany(rt => rt.PropertySchemas)
                .HasForeignKey(ps => ps.RelationTypeId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
