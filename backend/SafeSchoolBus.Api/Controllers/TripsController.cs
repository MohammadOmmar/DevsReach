using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SafeSchoolBus.Api.Data;
using SafeSchoolBus.Api.Hubs;
using SafeSchoolBus.Api.Models;
using SafeSchoolBus.Api.Services;
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
    public class TripsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<LocationHub> _hubContext;
        private readonly SafetyRuleEvaluator _ruleEvaluator;

        public TripsController(AppDbContext context, IHubContext<LocationHub> hubContext, SafetyRuleEvaluator ruleEvaluator)
        {
            _context = context;
            _hubContext = hubContext;
            _ruleEvaluator = ruleEvaluator;
        }

        [HttpPost("start")]
        [Authorize(Roles = "driver")]
        public async Task<IActionResult> StartTrip([FromBody] StartTripRequest request)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            {
                return Unauthorized();
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null || string.IsNullOrEmpty(user.AssignedVehicleId) || !Guid.TryParse(user.AssignedVehicleId, out var vehicleId))
            {
                return BadRequest(new { error = "No driver vehicle is linked to this account." });
            }

            var activeTrip = await _context.Trips
                .FirstOrDefaultAsync(t => t.VehicleId == vehicleId && t.Status == "active");
            if (activeTrip != null)
            {
                return Ok(new { trip = activeTrip, alreadyActive = true });
            }

            var route = await _context.Routes.FindAsync(request.RouteId);
            if (route == null || route.SchoolId != user.SchoolId)
            {
                return BadRequest(new { error = "Select a registered route for this vehicle." });
            }

            if (request.Checklist == null || 
                !request.Checklist.Attendant || 
                !request.Checklist.FirstAid || 
                !request.Checklist.SpeedGovernor || 
                !request.Checklist.Documents)
            {
                return BadRequest(new { error = "Complete all vehicle safety checks before starting the trip." });
            }

            var vehicle = await _context.Vehicles.FindAsync(vehicleId);
            if (vehicle != null)
            {
                vehicle.AttendantCheck = request.Checklist.Attendant;
                vehicle.FirstAidCheck = request.Checklist.FirstAid;
                vehicle.SpeedGovernorCheck = request.Checklist.SpeedGovernor;
                vehicle.DocumentsCheck = request.Checklist.Documents;
            }

            var trip = new Trip
            {
                Id = Guid.NewGuid(),
                VehicleId = vehicleId,
                RouteId = route.Id,
                SchoolId = user.SchoolId ?? Guid.Empty,
                DriverId = user.DriverId ?? Guid.Empty,
                Status = "active",
                StartedAt = DateTime.UtcNow,
                ExpectedArrivalAt = DateTime.UtcNow.AddMinutes(route.PlannedDurationMin),
                LocationsJson = "[]",
                PreTripChecklistJson = JsonSerializer.Serialize(request.Checklist)
            };

            _context.Trips.Add(trip);
            await _context.SaveChangesAsync();

            var tripSummary = new
            {
                id = trip.Id,
                status = trip.Status,
                vehicleId = trip.VehicleId,
                vehicleRegistration = vehicle?.Registration,
                startedAt = trip.StartedAt,
                expectedArrivalAt = trip.ExpectedArrivalAt,
                route = new
                {
                    id = route.Id,
                    name = route.Name,
                    stops = JsonSerializer.Deserialize<object>(route.StopsJson),
                    path = JsonSerializer.Deserialize<object>(route.PathJson),
                    speedLimitKmh = route.SpeedLimitKmh
                }
            };

            await _hubContext.Clients.Group($"school:{trip.SchoolId}").SendAsync("trip:started", tripSummary);

            return StatusCode(201, new { trip = tripSummary });
        }

        [HttpPost("{tripId}/end")]
        [Authorize(Roles = "driver")]
        public async Task<IActionResult> EndTrip(Guid tripId)
        {
            var trip = await _context.Trips.FindAsync(tripId);
            if (trip == null || trip.Status != "active")
            {
                return NotFound(new { error = "Active driver trip not found." });
            }

            trip.Status = "completed";
            trip.EndedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var vehicle = await _context.Vehicles.FindAsync(trip.VehicleId);
            var updatePayload = new { tripId = trip.Id, vehicleId = trip.VehicleId, vehicleRegistration = vehicle?.Registration };

            await _hubContext.Clients.Group($"school:{trip.SchoolId}").SendAsync("trip:ended", updatePayload);

            var parentUserIds = _context.Users
                .Where(u => u.Role == "parent" && u.AssignedVehicleId == trip.VehicleId.ToString())
                .Select(u => u.Id)
                .ToList();

            foreach (var userId in parentUserIds)
            {
                await _hubContext.Clients.Group($"user:{userId}").SendAsync("trip:ended", updatePayload);
            }

            return Ok(new { trip });
        }

        [HttpPost("{tripId}/locations")]
        [Authorize(Roles = "driver")]
        public async Task<IActionResult> PostLocation(Guid tripId, [FromBody] LocationUpdatePayload location)
        {
            var trip = await _context.Trips.FindAsync(tripId);
            if (trip == null || trip.Status != "active")
            {
                return NotFound(new { error = "Active driver trip not found." });
            }

            if (location == null || location.Lat < -90 || location.Lat > 90 || location.Lng < -180 || location.Lng > 180 || location.SpeedKmh < 0)
            {
                return BadRequest(new { error = "Location must include valid latitude, longitude, and speed in km/h." });
            }

            var recordedAt = location.RecordedAt ?? DateTime.UtcNow;
            var newPoint = new
            {
                lat = location.Lat,
                lng = location.Lng,
                speedKmh = location.SpeedKmh,
                accuracy = location.Accuracy,
                recordedAt = recordedAt
            };

            trip.LastLocationJson = JsonSerializer.Serialize(newPoint);

            List<object> points = new List<object>();
            if (!string.IsNullOrEmpty(trip.LocationsJson))
            {
                points = JsonSerializer.Deserialize<List<object>>(trip.LocationsJson) ?? new List<object>();
            }
            points.Add(newPoint);
            if (points.Count > 200)
            {
                points.RemoveAt(0);
            }
            trip.LocationsJson = JsonSerializer.Serialize(points);

            await _context.SaveChangesAsync();

            var update = new
            {
                tripId = trip.Id,
                vehicleId = trip.VehicleId,
                location = newPoint,
                recordedAt = recordedAt
            };

            await _hubContext.Clients.Group($"school:{trip.SchoolId}").SendAsync("location:update", update);

            var parentUserIds = _context.Users
                .Where(u => u.Role == "parent" && u.AssignedVehicleId == trip.VehicleId.ToString())
                .Select(u => u.Id)
                .ToList();

            foreach (var userId in parentUserIds)
            {
                await _hubContext.Clients.Group($"user:{userId}").SendAsync("location:update", update);
            }

            await _ruleEvaluator.EvaluateTripRulesAsync(trip, location.Lat, location.Lng, location.SpeedKmh, location.Accuracy, recordedAt);
            await _context.SaveChangesAsync();

            return Accepted(new { accepted = true });
        }

        [HttpPost("{tripId}/sos")]
        [Authorize(Roles = "driver")]
        public async Task<IActionResult> TriggerSOS(Guid tripId)
        {
            var trip = await _context.Trips.FindAsync(tripId);
            if (trip == null || trip.Status != "active")
            {
                return NotFound(new { error = "Active driver trip not found." });
            }

            var vehicle = await _context.Vehicles.FindAsync(trip.VehicleId);
            
            var alert = new Alert
            {
                Id = Guid.NewGuid(),
                Type = "sos",
                Severity = "high",
                VehicleId = trip.VehicleId,
                SchoolId = trip.SchoolId,
                TripId = trip.Id,
                Status = "open",
                Title = "SOS / emergency",
                Message = $"SOS received from {vehicle?.Registration ?? "assigned vehicle"}. School transport team must review immediately.",
                CreatedAt = DateTime.UtcNow
            };

            await _ruleEvaluator.CreateAlertAsync(alert);

            return StatusCode(201, new { alert });
        }
    }

    public class StartTripRequest
    {
        public Guid RouteId { get; set; }
        public PreTripChecklist Checklist { get; set; } = null!;
    }

    public class PreTripChecklist
    {
        public bool Attendant { get; set; }
        public bool FirstAid { get; set; }
        public bool SpeedGovernor { get; set; }
        public bool Documents { get; set; }
    }

    public class LocationUpdatePayload
    {
        public double Lat { get; set; }
        public double Lng { get; set; }
        public double SpeedKmh { get; set; }
        public double? Accuracy { get; set; }
        public DateTime? RecordedAt { get; set; }
    }
}
