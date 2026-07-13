using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SafeSchoolBus.Api.Data;
using SafeSchoolBus.Api.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;

namespace SafeSchoolBus.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DashboardController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetDashboard()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var schoolIdString = User.FindFirst("schoolId")?.Value;

            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            {
                return Unauthorized(new { error = "Session is no longer valid." });
            }

            if (role == "parent")
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null || string.IsNullOrEmpty(user.AssignedVehicleId) || !Guid.TryParse(user.AssignedVehicleId, out var vehicleId))
                {
                    return Ok(new { role = "parent", vehicle = (object?)null, trip = (object?)null, alerts = new List<object>(), complaintCount = 0 });
                }

                var vehicle = await _context.Vehicles.FindAsync(vehicleId);
                var trip = await _context.Trips
                    .FirstOrDefaultAsync(t => t.VehicleId == vehicleId && t.Status == "active");

                var alerts = await _context.Alerts
                    .Where(a => a.VehicleId == vehicleId && a.Status == "open")
                    .OrderByDescending(a => a.CreatedAt)
                    .ToListAsync();

                var complaintCount = await _context.Complaints
                    .CountAsync(c => c.VehicleId == vehicleId && c.Status == "open");

                object? safeTrip = null;
                if (trip != null)
                {
                    var route = await _context.Routes.FindAsync(trip.RouteId);
                    safeTrip = new
                    {
                        id = trip.Id,
                        status = trip.Status,
                        vehicleId = trip.VehicleId,
                        vehicleRegistration = vehicle?.Registration,
                        startedAt = trip.StartedAt,
                        expectedArrivalAt = trip.ExpectedArrivalAt,
                        lastLocation = trip.LastLocationJson != null ? JsonSerializer.Deserialize<object>(trip.LastLocationJson) : null,
                        route = route != null ? new
                        {
                            id = route.Id,
                            name = route.Name,
                            stops = JsonSerializer.Deserialize<object>(route.StopsJson),
                            path = JsonSerializer.Deserialize<object>(route.PathJson),
                            speedLimitKmh = route.SpeedLimitKmh
                        } : null
                    };
                }

                return Ok(new
                {
                    role = "parent",
                    vehicle = vehicle != null ? new
                    {
                        id = vehicle.Id,
                        registration = vehicle.Registration,
                        attendant = vehicle.Attendant,
                        documentsStatus = vehicle.DocumentsStatus,
                        complianceScore = vehicle.ComplianceScore
                    } : null,
                    trip = safeTrip,
                    alerts,
                    complaintCount
                });
            }

            if (role == "driver")
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null || string.IsNullOrEmpty(user.AssignedVehicleId) || !Guid.TryParse(user.AssignedVehicleId, out var vehicleId))
                {
                    return Ok(new { role = "driver", vehicle = (object?)null, trip = (object?)null });
                }

                var vehicle = await _context.Vehicles.FindAsync(vehicleId);
                var trip = await _context.Trips
                    .FirstOrDefaultAsync(t => t.VehicleId == vehicleId && t.Status == "active");

                object? safeTrip = null;
                if (trip != null)
                {
                    var route = await _context.Routes.FindAsync(trip.RouteId);
                    safeTrip = new
                    {
                        id = trip.Id,
                        status = trip.Status,
                        vehicleId = trip.VehicleId,
                        vehicleRegistration = vehicle?.Registration,
                        startedAt = trip.StartedAt,
                        expectedArrivalAt = trip.ExpectedArrivalAt,
                        lastLocation = trip.LastLocationJson != null ? JsonSerializer.Deserialize<object>(trip.LastLocationJson) : null,
                        locations = trip.LocationsJson != null ? JsonSerializer.Deserialize<object>(trip.LocationsJson) : new List<object>(),
                        route = route != null ? new
                        {
                            id = route.Id,
                            name = route.Name,
                            stops = JsonSerializer.Deserialize<object>(route.StopsJson),
                            path = JsonSerializer.Deserialize<object>(route.PathJson),
                            speedLimitKmh = route.SpeedLimitKmh
                        } : null
                    };
                }

                return Ok(new
                {
                    role = "driver",
                    vehicle = vehicle != null ? new
                    {
                        id = vehicle.Id,
                        registration = vehicle.Registration,
                        attendant = vehicle.Attendant,
                        documentsStatus = vehicle.DocumentsStatus,
                        complianceScore = vehicle.ComplianceScore,
                        checklist = new
                        {
                            attendant = vehicle.AttendantCheck,
                            firstAid = vehicle.FirstAidCheck,
                            speedGovernor = vehicle.SpeedGovernorCheck,
                            documents = vehicle.DocumentsCheck
                        }
                    } : null,
                    trip = safeTrip
                });
            }

            if (role == "school")
            {
                if (string.IsNullOrEmpty(schoolIdString) || !Guid.TryParse(schoolIdString, out var schoolId))
                {
                    return BadRequest(new { error = "School ID missing on user profile." });
                }

                var vehicles = await _context.Vehicles
                    .Where(v => v.SchoolId == schoolId)
                    .ToListAsync();

                var vehicleIds = vehicles.Select(v => v.Id).ToList();

                var activeTrips = await _context.Trips
                    .Where(t => vehicleIds.Contains(t.VehicleId) && t.Status == "active")
                    .ToListAsync();

                var alerts = await _context.Alerts
                    .Where(a => a.SchoolId == schoolId && a.Status == "open")
                    .OrderByDescending(a => a.CreatedAt)
                    .ToListAsync();

                var complaints = await _context.Complaints
                    .Where(c => c.SchoolId == schoolId && c.Status == "open")
                    .OrderByDescending(c => c.CreatedAt)
                    .ToListAsync();

                var routes = await _context.Routes
                    .Where(r => r.SchoolId == schoolId)
                    .ToListAsync();

                var drivers = await _context.Drivers
                    .Where(d => d.SchoolId == schoolId)
                    .ToListAsync();

                var formattedVehicles = vehicles.Select(v =>
                {
                    var driver = drivers.FirstOrDefault(d => d.Id == v.DriverId);
                    var trip = activeTrips.FirstOrDefault(t => t.VehicleId == v.Id);
                    return new
                    {
                        id = v.Id,
                        registration = v.Registration,
                        attendant = v.Attendant,
                        documentsStatus = v.DocumentsStatus,
                        complianceScore = v.ComplianceScore,
                        checklist = new
                        {
                            attendant = v.AttendantCheck,
                            firstAid = v.FirstAidCheck,
                            speedGovernor = v.SpeedGovernorCheck,
                            documents = v.DocumentsCheck
                        },
                        driver = driver != null ? new { id = driver.Id, name = driver.Name, phone = driver.Phone, attendant = driver.Attendant } : null,
                        activeTrip = trip != null ? new
                        {
                            id = trip.Id,
                            routeId = trip.RouteId,
                            startedAt = trip.StartedAt,
                            lastLocation = trip.LastLocationJson != null ? JsonSerializer.Deserialize<object>(trip.LastLocationJson) : null
                        } : null
                    };
                }).ToList();

                var formattedRoutes = routes.Select(r => new
                {
                    id = r.Id,
                    schoolId = r.SchoolId,
                    name = r.Name,
                    speedLimitKmh = r.SpeedLimitKmh,
                    deviationThresholdM = r.DeviationThresholdM,
                    plannedDurationMin = r.PlannedDurationMin,
                    stops = JsonSerializer.Deserialize<object>(r.StopsJson),
                    path = JsonSerializer.Deserialize<object>(r.PathJson)
                }).ToList();

                var checklistRemindersCount = vehicles.Count(v => !v.AttendantCheck || !v.FirstAidCheck || !v.SpeedGovernorCheck || !v.DocumentsCheck);

                return Ok(new
                {
                    role = "school",
                    stats = new
                    {
                        registeredVehicles = vehicles.Count,
                        activeTrips = activeTrips.Count,
                        activeAlerts = alerts.Count,
                        unresolvedComplaints = complaints.Count,
                        checklistReminders = checklistRemindersCount
                    },
                    vehicles = formattedVehicles,
                    routes = formattedRoutes,
                    alerts,
                    complaints,
                    checklist = vehicles.Select(v => new
                    {
                        vehicleId = v.Id,
                        registration = v.Registration,
                        checklist = new
                        {
                            attendant = v.AttendantCheck,
                            firstAid = v.FirstAidCheck,
                            speedGovernor = v.SpeedGovernorCheck,
                            documents = v.DocumentsCheck
                        }
                    })
                });
            }

            if (role == "rto")
            {
                var vehicles = await _context.Vehicles.ToListAsync();
                var schools = await _context.Schools.ToListAsync();
                var alerts = await _context.Alerts.Where(a => a.Status == "open").ToListAsync();
                var complaints = await _context.Complaints.ToListAsync();
                var activeTrips = await _context.Trips.Where(t => t.Status == "active").ToListAsync();
                var drivers = await _context.Drivers.ToListAsync();

                var scored = vehicles.Select(v =>
                {
                    var vehicleAlerts = alerts.Where(a => a.VehicleId == v.Id).ToList();

                    var repeatSignals = vehicleAlerts
                        .Where(a => new[] { "overspeed", "route_deviation", "repeated_complaint", "gps_inactive" }.Contains(a.Type))
                        .Select(a => a.Type)
                        .Distinct()
                        .ToList();

                    var priority = (100 - v.ComplianceScore) + vehicleAlerts.Sum(a => a.Severity == "high" ? 25 : 12);
                    var school = schools.FirstOrDefault(s => s.Id == v.SchoolId);
                    var driver = drivers.FirstOrDefault(d => d.Id == v.DriverId);
                    var trip = activeTrips.FirstOrDefault(t => t.VehicleId == v.Id);

                    return new
                    {
                        id = v.Id,
                        registration = v.Registration,
                        attendant = v.Attendant,
                        documentsStatus = v.DocumentsStatus,
                        complianceScore = v.ComplianceScore,
                        school = school?.Name,
                        schoolId = v.SchoolId,
                        openAlerts = vehicleAlerts,
                        repeatSignals,
                        priority,
                        driver = driver != null ? new { id = driver.Id, name = driver.Name, attendant = driver.Attendant } : null,
                        activeTrip = trip != null ? new
                        {
                            id = trip.Id,
                            routeId = trip.RouteId,
                            startedAt = trip.StartedAt,
                            lastLocation = trip.LastLocationJson != null ? JsonSerializer.Deserialize<object>(trip.LastLocationJson) : null
                        } : null
                    };
                }).OrderByDescending(x => x.priority).ToList();

                var avgCompliance = vehicles.Any() ? (int)Math.Round(vehicles.Average(v => v.ComplianceScore)) : 0;
                var inspectionDueCount = scored.Count(v => v.priority >= 45);
                var pendingDocsCount = vehicles.Count(v => v.DocumentsStatus != "current");

                var weekAgo = DateTime.UtcNow.AddDays(-7);
                var weeklyComplaints = complaints.Where(c => c.CreatedAt >= weekAgo).ToList();
                var unresolvedCount = complaints.Count(c => c.Status == "open");

                return Ok(new
                {
                    role = "rto",
                    stats = new
                    {
                        registeredFleet = vehicles.Count,
                        pilotSchools = schools.Count,
                        averageCompliance = avgCompliance,
                        inspectionDue = inspectionDueCount,
                        pendingDocuments = pendingDocsCount
                    },
                    highRiskVehicles = scored.Where(v => v.priority >= 35).ToList(),
                    vehicles = scored,
                    complaintTrend = new
                    {
                        received = weeklyComplaints.Count,
                        resolved = weeklyComplaints.Count(c => c.Status == "resolved"),
                        open = unresolvedCount
                    }
                });
            }

            return BadRequest(new { error = "Invalid user role." });
        }
    }
}
