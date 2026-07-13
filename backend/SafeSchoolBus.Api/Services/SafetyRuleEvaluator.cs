using Microsoft.AspNetCore.SignalR;
using SafeSchoolBus.Api.Data;
using SafeSchoolBus.Api.Hubs;
using SafeSchoolBus.Api.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace SafeSchoolBus.Api.Services
{
    public class SafetyRuleEvaluator
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<LocationHub> _hubContext;

        public SafetyRuleEvaluator(AppDbContext context, IHubContext<LocationHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        public async Task EvaluateTripRulesAsync(Trip trip, double lat, double lng, double speedKmh, double? accuracy, DateTime recordedAt)
        {
            var vehicle = await _context.Vehicles.FindAsync(trip.VehicleId);
            var route = await _context.Routes.FindAsync(trip.RouteId);

            if (vehicle == null || route == null) return;

            // 1. Overspeed check
            if (speedKmh > route.SpeedLimitKmh)
            {
                await CreateAlertAsync(new Alert
                {
                    Id = Guid.NewGuid(),
                    Type = "overspeed",
                    Severity = "high",
                    VehicleId = vehicle.Id,
                    SchoolId = vehicle.SchoolId,
                    TripId = trip.Id,
                    Status = "open",
                    Title = "Overspeeding",
                    Message = $"{vehicle.Registration} exceeded the {route.SpeedLimitKmh} km/h route speed limit. Current speed: {Math.Round(speedKmh)} km/h.",
                    CreatedAt = DateTime.UtcNow
                });
            }

            // 2. Route deviation check
            var pathPoints = ParseCoordinates(route.PathJson);
            if (pathPoints.Any())
            {
                var minDistance = pathPoints.Min(pt => DistanceMeters(lat, lng, pt.Lat, pt.Lng));
                if (minDistance > route.DeviationThresholdM)
                {
                    await CreateAlertAsync(new Alert
                    {
                        Id = Guid.NewGuid(),
                        Type = "route_deviation",
                        Severity = "high",
                        VehicleId = vehicle.Id,
                        SchoolId = vehicle.SchoolId,
                        TripId = trip.Id,
                        Status = "open",
                        Title = "Route deviation",
                        Message = $"{vehicle.Registration} is {Math.Round(minDistance)} m outside its planned route corridor.",
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            // 3. Long stop check
            var stops = ParseStops(route.StopsJson);
            var closeToStop = stops.Any(s => DistanceMeters(lat, lng, s.Lat, s.Lng) < 80);
            if (speedKmh < 2)
            {
                if (trip.StoppedSince == null)
                {
                    trip.StoppedSince = recordedAt;
                }
                else
                {
                    var stoppedDuration = DateTime.UtcNow - trip.StoppedSince.Value;
                    if (stoppedDuration.TotalMinutes > 7 && !closeToStop)
                    {
                        await CreateAlertAsync(new Alert
                        {
                            Id = Guid.NewGuid(),
                            Type = "long_stop",
                            Severity = "medium",
                            VehicleId = vehicle.Id,
                            SchoolId = vehicle.SchoolId,
                            TripId = trip.Id,
                            Status = "open",
                            Title = "Long / unexpected stop",
                            Message = $"{vehicle.Registration} has remained stopped away from a registered stop.",
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
            }
            else
            {
                trip.StoppedSince = null;
            }

            // 4. Delay check
            if (DateTime.UtcNow > trip.ExpectedArrivalAt)
            {
                await CreateAlertAsync(new Alert
                {
                    Id = Guid.NewGuid(),
                    Type = "delay",
                    Severity = "medium",
                    VehicleId = vehicle.Id,
                    SchoolId = vehicle.SchoolId,
                    TripId = trip.Id,
                    Status = "open",
                    Title = "Delayed bus",
                    Message = $"{vehicle.Registration} is behind its planned route schedule.",
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        public async Task CreateAlertAsync(Alert alert)
        {
            // Check if there is already an open alert of this type for this vehicle
            var exists = _context.Alerts.Any(a => a.VehicleId == alert.VehicleId && a.Type == alert.Type && a.Status == "open");
            if (exists) return;

            _context.Alerts.Add(alert);
            await _context.SaveChangesAsync();

            var vehicle = await _context.Vehicles.FindAsync(alert.VehicleId);

            // SignalR Live Update broadcasts
            // 1. To the school's channel
            await _hubContext.Clients.Group($"school:{alert.SchoolId}").SendAsync("alert:new", alert);

            // 2. To the RTO channel
            var rtoUpdate = new
            {
                id = alert.Id,
                type = alert.Type,
                severity = alert.Severity,
                title = alert.Title,
                vehicleRegistration = vehicle?.Registration,
                schoolId = alert.SchoolId
            };
            await _hubContext.Clients.Group("role:rto").SendAsync("alert:summary", rtoUpdate);

            // 3. To parents monitoring this vehicle
            var parentUserIds = _context.Users
                .Where(u => u.Role == "parent" && u.AssignedVehicleId == alert.VehicleId.ToString())
                .Select(u => u.Id)
                .ToList();

            foreach (var userId in parentUserIds)
            {
                await _hubContext.Clients.Group($"user:{userId}").SendAsync("alert:new", alert);
            }
        }

        private static double DistanceMeters(double lat1, double lng1, double lat2, double lng2)
        {
            var rad = Math.PI / 180;
            var dLat = (lat2 - lat1) * rad;
            var dLng = (lng2 - lng1) * rad;
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(lat1 * rad) * Math.Cos(lat2 * rad) *
                    Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return 6371000 * c;
        }

        private static List<Coordinate> ParseCoordinates(string json)
        {
            try
            {
                return JsonSerializer.Deserialize<List<Coordinate>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<Coordinate>();
            }
            catch
            {
                return new List<Coordinate>();
            }
        }

        private static List<StopCoordinate> ParseStops(string json)
        {
            try
            {
                return JsonSerializer.Deserialize<List<StopCoordinate>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<StopCoordinate>();
            }
            catch
            {
                return new List<StopCoordinate>();
            }
        }

        public class Coordinate
        {
            public double Lat { get; set; }
            public double Lng { get; set; }
        }

        public class StopCoordinate
        {
            public string Name { get; set; } = string.Empty;
            public double Lat { get; set; }
            public double Lng { get; set; }
        }
    }
}
