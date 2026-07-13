using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SafeSchoolBus.Api.Models
{
    public class User
    {
        [Key]
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // parent, driver, school, rto
        public Guid? SchoolId { get; set; }
        public Guid? DriverId { get; set; }
        public string? AssignedVehicleId { get; set; } // For parents/drivers, mapping to vehicle registration or ID
    }

    public class School
    {
        [Key]
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
    }

    public class Driver
    {
        [Key]
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Attendant { get; set; } = string.Empty;
        public Guid SchoolId { get; set; }
    }

    public class Vehicle
    {
        [Key]
        public Guid Id { get; set; }
        public string Registration { get; set; } = string.Empty;
        public string Attendant { get; set; } = string.Empty;
        public Guid SchoolId { get; set; }
        public Guid? DriverId { get; set; }
        public string DocumentsStatus { get; set; } = "current"; // current, pending, expiring
        public int ComplianceScore { get; set; } = 100;
        public bool AttendantCheck { get; set; }
        public bool FirstAidCheck { get; set; }
        public bool SpeedGovernorCheck { get; set; }
        public bool DocumentsCheck { get; set; }
    }

    public class Route
    {
        [Key]
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;
        public double SpeedLimitKmh { get; set; } = 40;
        public double DeviationThresholdM { get; set; } = 120;
        public int PlannedDurationMin { get; set; } = 30;
        public string StopsJson { get; set; } = "[]"; // List of Stops: Name, Lat, Lng
        public string PathJson { get; set; } = "[]"; // List of Coords: Lat, Lng
    }

    public class Trip
    {
        [Key]
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public Guid RouteId { get; set; }
        public Guid SchoolId { get; set; }
        public Guid DriverId { get; set; }
        public string Status { get; set; } = "active"; // active, completed
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpectedArrivalAt { get; set; }
        public DateTime? EndedAt { get; set; }
        public DateTime? StoppedSince { get; set; }
        public string? LastLocationJson { get; set; } // Nullable, JSON string of last Coordinate
        public string LocationsJson { get; set; } = "[]"; // History of coordinates, JSON array of Coords
        public string PreTripChecklistJson { get; set; } = "{}"; // JSON map of checklist answers
    }

    public class Alert
    {
        [Key]
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty; // overspeed, long_stop, route_deviation, delay, gps_inactive, sos, repeated_complaint
        public string Severity { get; set; } = "medium"; // low, medium, high
        public Guid VehicleId { get; set; }
        public Guid SchoolId { get; set; }
        public Guid? TripId { get; set; }
        public string Status { get; set; } = "open"; // open, resolved, under_review
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReviewedAt { get; set; }
    }

    public class Complaint
    {
        [Key]
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public Guid SchoolId { get; set; }
        public Guid ParentId { get; set; }
        public string Type { get; set; } = string.Empty; // Unsafe driving, Route concern, Delay, Other
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = "open"; // open, resolved
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }
    }
}
