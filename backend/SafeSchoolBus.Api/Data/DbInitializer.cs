using BCrypt.Net;
using SafeSchoolBus.Api.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace SafeSchoolBus.Api.Data
{
    public static class DbInitializer
    {
        public static void Initialize(AppDbContext context)
        {
            context.Database.EnsureCreated();

            if (context.Users.Any())
            {
                return; // DB has already been seeded
            }

            // Define GUIDs
            var schoolId1 = Guid.Parse("11111111-1111-1111-1111-111111111111");
            var schoolId2 = Guid.Parse("22222222-2222-2222-2222-222222222222");
            var schoolId3 = Guid.Parse("33333333-3333-3333-3333-333333333333");

            var driverId1 = Guid.Parse("d1111111-1111-1111-1111-111111111111");
            var driverId2 = Guid.Parse("d2222222-2222-2222-2222-222222222222");
            var driverId3 = Guid.Parse("d3333333-3333-3333-3333-333333333333");

            var vehicleId1 = Guid.Parse("e1111111-1111-1111-1111-111111111111");
            var vehicleId2 = Guid.Parse("e2222222-2222-2222-2222-222222222222");
            var vehicleId3 = Guid.Parse("e3333333-3333-3333-3333-333333333333");
            var vehicleId4 = Guid.Parse("e4444444-4444-4444-4444-444444444444");

            var routeId1 = Guid.Parse("c1111111-1111-1111-1111-111111111111");
            var routeId2 = Guid.Parse("c2222222-2222-2222-2222-222222222222");
            var routeId3 = Guid.Parse("c3333333-3333-3333-3333-333333333333");

            // Hash password
            var passwordHash = BCrypt.Net.BCrypt.HashPassword("Demo@123");

            // Schools
            context.Schools.AddRange(
                new School { Id = schoolId1, Name = "Pine Valley School", District = "Srinagar" },
                new School { Id = schoolId2, Name = "Lakeview Public School", District = "Srinagar" },
                new School { Id = schoolId3, Name = "Northgate School", District = "Srinagar" }
            );

            // Drivers
            context.Drivers.AddRange(
                new Driver { Id = driverId1, SchoolId = schoolId1, Name = "Firdous Ahmad", Phone = "7000000001", Attendant = "Shabir Bhat" },
                new Driver { Id = driverId2, SchoolId = schoolId1, Name = "Imran Khan", Phone = "7000000002", Attendant = "Aamir Lone" },
                new Driver { Id = driverId3, SchoolId = schoolId2, Name = "Yawar Mir", Phone = "7000000003", Attendant = "Arif Dar" }
            );

            // Vehicles
            context.Vehicles.AddRange(
                new Vehicle { Id = vehicleId1, SchoolId = schoolId1, DriverId = driverId1, Registration = "JK01 AB 2411", Attendant = "Shabir Bhat", DocumentsStatus = "current", ComplianceScore = 93, AttendantCheck = true, FirstAidCheck = true, SpeedGovernorCheck = true, DocumentsCheck = true },
                new Vehicle { Id = vehicleId2, SchoolId = schoolId1, DriverId = driverId2, Registration = "JK01 CD 5527", Attendant = "Aamir Lone", DocumentsStatus = "pending", ComplianceScore = 61, AttendantCheck = true, FirstAidCheck = true, SpeedGovernorCheck = true, DocumentsCheck = true },
                new Vehicle { Id = vehicleId3, SchoolId = schoolId2, DriverId = driverId3, Registration = "JK01 EF 8849", Attendant = "Arif Dar", DocumentsStatus = "expiring", ComplianceScore = 65, AttendantCheck = true, FirstAidCheck = false, SpeedGovernorCheck = true, DocumentsCheck = false },
                new Vehicle { Id = vehicleId4, SchoolId = schoolId1, DriverId = null, Registration = "JK01 GH 3116", Attendant = "Pending", DocumentsStatus = "current", ComplianceScore = 80, AttendantCheck = false, FirstAidCheck = false, SpeedGovernorCheck = true, DocumentsCheck = true }
            );

            // Routes Paths & Stops
            var pathA = new[] {
                new { lat = 34.0923, lng = 74.8485 },
                new { lat = 34.0943, lng = 74.8516 },
                new { lat = 34.0978, lng = 74.8564 },
                new { lat = 34.1012, lng = 74.8602 }
            };
            var stopsA = new[] {
                new { name = "Home stop", lat = 34.0923, lng = 74.8485 },
                new { name = "Hazratbal stop", lat = 34.0978, lng = 74.8564 },
                new { name = "Pine Valley School", lat = 34.1012, lng = 74.8602 }
            };

            var pathB = new[] {
                new { lat = 34.1048, lng = 74.8592 },
                new { lat = 34.1031, lng = 74.8599 },
                new { lat = 34.1012, lng = 74.8602 }
            };
            var stopsB = new[] {
                new { name = "Nigeen stop", lat = 34.1048, lng = 74.8592 },
                new { name = "Pine Valley School", lat = 34.1012, lng = 74.8602 }
            };

            var pathC = new[] {
                new { lat = 34.0747, lng = 74.8742 },
                new { lat = 34.0775, lng = 74.8759 },
                new { lat = 34.0812, lng = 74.8781 }
            };
            var stopsC = new[] {
                new { name = "Dalgate stop", lat = 34.0747, lng = 74.8742 },
                new { name = "Lakeview Public School", lat = 34.0812, lng = 74.8781 }
            };

            context.Routes.AddRange(
                new Route { Id = routeId1, SchoolId = schoolId1, Name = "Morning route A", SpeedLimitKmh = 40, DeviationThresholdM = 120, PlannedDurationMin = 32, PathJson = JsonSerializer.Serialize(pathA), StopsJson = JsonSerializer.Serialize(stopsA) },
                new Route { Id = routeId2, SchoolId = schoolId1, Name = "Morning route B", SpeedLimitKmh = 40, DeviationThresholdM = 120, PlannedDurationMin = 35, PathJson = JsonSerializer.Serialize(pathB), StopsJson = JsonSerializer.Serialize(stopsB) },
                new Route { Id = routeId3, SchoolId = schoolId2, Name = "Morning route C", SpeedLimitKmh = 40, DeviationThresholdM = 120, PlannedDurationMin = 30, PathJson = JsonSerializer.Serialize(pathC), StopsJson = JsonSerializer.Serialize(stopsC) }
            );

            // Users
            var parentUserId = Guid.Parse("f0000000-0000-0000-0000-000000000001");
            var driverUserId = Guid.Parse("f0000000-0000-0000-0000-000000000002");
            var schoolUserId = Guid.Parse("f0000000-0000-0000-0000-000000000003");
            var rtoUserId = Guid.Parse("f0000000-0000-0000-0000-000000000004");

            context.Users.AddRange(
                new User { Id = parentUserId, Name = "Amina Khan", Email = "parent@demo.local", PasswordHash = passwordHash, Role = "parent", SchoolId = schoolId1, AssignedVehicleId = vehicleId1.ToString() },
                new User { Id = driverUserId, Name = "Firdous Ahmad", Email = "driver@demo.local", PasswordHash = passwordHash, Role = "driver", SchoolId = schoolId1, DriverId = driverId1, AssignedVehicleId = vehicleId1.ToString() },
                new User { Id = schoolUserId, Name = "Pine Valley Transport Team", Email = "school@demo.local", PasswordHash = passwordHash, Role = "school", SchoolId = schoolId1 },
                new User { Id = rtoUserId, Name = "RTO Kashmir Administrator", Email = "rto@demo.local", PasswordHash = passwordHash, Role = "rto" }
            );

            // Active Trip
            var tripId1 = Guid.Parse("71111111-1111-1111-1111-111111111111");
            var startedAt = DateTime.UtcNow.AddMinutes(-14);
            var expectedArrival = DateTime.UtcNow.AddMinutes(18);

            var lastLoc = new { lat = 34.0978, lng = 74.8564, speedKmh = 31.0, accuracy = 12.0, recordedAt = DateTime.UtcNow };
            var trip = new Trip
            {
                Id = tripId1,
                VehicleId = vehicleId1,
                RouteId = routeId1,
                SchoolId = schoolId1,
                DriverId = driverId1,
                Status = "active",
                StartedAt = startedAt,
                ExpectedArrivalAt = expectedArrival,
                LastLocationJson = JsonSerializer.Serialize(lastLoc),
                LocationsJson = JsonSerializer.Serialize(new[] { lastLoc }),
                PreTripChecklistJson = JsonSerializer.Serialize(new { attendant = true, firstAid = true, speedGovernor = true, documents = true })
            };
            context.Trips.Add(trip);

            // Alerts
            context.Alerts.AddRange(
                new Alert { Id = Guid.NewGuid(), Type = "overspeed", Severity = "high", VehicleId = vehicleId2, SchoolId = schoolId1, Status = "open", Title = "Overspeeding", Message = "JK01 CD 5527 exceeded the configured route speed limit.", CreatedAt = DateTime.UtcNow.AddMinutes(-6) },
                new Alert { Id = Guid.NewGuid(), Type = "long_stop", Severity = "medium", VehicleId = vehicleId4, SchoolId = schoolId1, Status = "open", Title = "Long / unexpected stop", Message = "JK01 GH 3116 remained stopped away from a registered stop.", CreatedAt = DateTime.UtcNow.AddMinutes(-11) },
                new Alert { Id = Guid.NewGuid(), Type = "route_deviation", Severity = "high", VehicleId = vehicleId3, SchoolId = schoolId2, Status = "open", Title = "Route deviation", Message = "JK01 EF 8849 moved outside its permitted route corridor.", CreatedAt = DateTime.UtcNow.AddMinutes(-4) },
                new Alert { Id = Guid.NewGuid(), Type = "delay", Severity = "medium", VehicleId = vehicleId4, SchoolId = schoolId1, Status = "open", Title = "Delayed bus", Message = "JK01 GH 3116 is behind the planned route schedule.", CreatedAt = DateTime.UtcNow.AddMinutes(-14) },
                new Alert { Id = Guid.NewGuid(), Type = "gps_inactive", Severity = "medium", VehicleId = vehicleId4, SchoolId = schoolId1, Status = "open", Title = "App inactive / GPS off", Message = "JK01 GH 3116 has no current driver app location signal.", CreatedAt = DateTime.UtcNow.AddMinutes(-9) },
                new Alert { Id = Guid.NewGuid(), Type = "sos", Severity = "high", VehicleId = vehicleId3, SchoolId = schoolId2, Status = "open", Title = "SOS / emergency", Message = "SOS received for JK01 EF 8849.", CreatedAt = DateTime.UtcNow.AddMinutes(-3) },
                new Alert { Id = Guid.NewGuid(), Type = "repeated_complaint", Severity = "high", VehicleId = vehicleId2, SchoolId = schoolId1, Status = "open", Title = "Repeated complaint flag", Message = "JK01 CD 5527 has three unresolved parent reports.", CreatedAt = DateTime.UtcNow.AddMinutes(-20) }
            );

            // Complaints
            context.Complaints.AddRange(
                new Complaint { Id = Guid.NewGuid(), VehicleId = vehicleId2, SchoolId = schoolId1, ParentId = parentUserId, Type = "Unsafe driving", Description = "Please review driving behaviour.", Status = "open", CreatedAt = DateTime.UtcNow.AddMinutes(-90) },
                new Complaint { Id = Guid.NewGuid(), VehicleId = vehicleId2, SchoolId = schoolId1, ParentId = parentUserId, Type = "Unsafe driving", Description = "Second report for review.", Status = "open", CreatedAt = DateTime.UtcNow.AddMinutes(-80) },
                new Complaint { Id = Guid.NewGuid(), VehicleId = vehicleId2, SchoolId = schoolId1, ParentId = parentUserId, Type = "Route concern", Description = "Route concern for review.", Status = "open", CreatedAt = DateTime.UtcNow.AddMinutes(-70) },
                new Complaint { Id = Guid.NewGuid(), VehicleId = vehicleId4, SchoolId = schoolId1, ParentId = parentUserId, Type = "Delay", Description = "Delay report for review.", Status = "open", CreatedAt = DateTime.UtcNow.AddMinutes(-30) }
            );

            context.SaveChanges();
        }
    }
}
