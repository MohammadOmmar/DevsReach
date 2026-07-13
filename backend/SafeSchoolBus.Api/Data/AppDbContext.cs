using Microsoft.EntityFrameworkCore;
using SafeSchoolBus.Api.Models;

namespace SafeSchoolBus.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<School> Schools => Set<School>();
        public DbSet<Driver> Drivers => Set<Driver>();
        public DbSet<Vehicle> Vehicles => Set<Vehicle>();
        public DbSet<SafeSchoolBus.Api.Models.Route> Routes => Set<SafeSchoolBus.Api.Models.Route>();
        public DbSet<Trip> Trips => Set<Trip>();
        public DbSet<Alert> Alerts => Set<Alert>();
        public DbSet<Complaint> Complaints => Set<Complaint>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
        }
    }
}
