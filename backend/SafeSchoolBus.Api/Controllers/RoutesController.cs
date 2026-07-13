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
    public class RoutesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RoutesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetRoutes()
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var schoolIdString = User.FindFirst("schoolId")?.Value;

            List<Route> routes;

            if (role == "rto")
            {
                routes = await _context.Routes.ToListAsync();
            }
            else if (Guid.TryParse(schoolIdString, out var schoolId))
            {
                routes = await _context.Routes.Where(r => r.SchoolId == schoolId).ToListAsync();
            }
            else
            {
                routes = new List<Route>();
            }

            var formatted = routes.Select(r => new
            {
                id = r.Id,
                schoolId = r.SchoolId,
                name = r.Name,
                speedLimitKmh = r.SpeedLimitKmh,
                deviationThresholdM = r.DeviationThresholdM,
                plannedDurationMin = r.PlannedDurationMin,
                stops = JsonSerializer.Deserialize<object>(r.StopsJson),
                path = JsonSerializer.Deserialize<object>(r.PathJson)
            });

            return Ok(formatted);
        }

        [HttpPost]
        [Authorize(Roles = "school,rto")]
        public async Task<IActionResult> CreateRoute([FromBody] CreateRouteRequest request)
        {
            if (string.IsNullOrEmpty(request.Name) || request.Stops == null || request.Stops.Count < 2 || request.Path == null || request.Path.Count < 2)
            {
                return BadRequest(new { error = "Route name, at least two stops, and a route path are required." });
            }

            var schoolIdString = User.FindFirst("schoolId")?.Value;
            Guid schoolId;

            if (User.IsInRole("school"))
            {
                if (string.IsNullOrEmpty(schoolIdString) || !Guid.TryParse(schoolIdString, out schoolId))
                {
                    return BadRequest(new { error = "School ID missing on user profile." });
                }
            }
            else // rto
            {
                if (!request.SchoolId.HasValue)
                {
                    return BadRequest(new { error = "A valid school is required." });
                }
                schoolId = request.SchoolId.Value;
            }

            var route = new Route
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Name = request.Name,
                SpeedLimitKmh = request.SpeedLimitKmh ?? 40,
                DeviationThresholdM = request.DeviationThresholdM ?? 120,
                PlannedDurationMin = request.PlannedDurationMin ?? 30,
                StopsJson = JsonSerializer.Serialize(request.Stops),
                PathJson = JsonSerializer.Serialize(request.Path)
            };

            _context.Routes.Add(route);
            await _context.SaveChangesAsync();

            return StatusCode(201, new
            {
                id = route.Id,
                schoolId = route.SchoolId,
                name = route.Name,
                speedLimitKmh = route.SpeedLimitKmh,
                deviationThresholdM = route.DeviationThresholdM,
                plannedDurationMin = route.PlannedDurationMin,
                stops = request.Stops,
                path = request.Path
            });
        }

        [HttpPatch("{routeId}")]
        [Authorize(Roles = "school,rto")]
        public async Task<IActionResult> UpdateRoute(Guid routeId, [FromBody] UpdateRouteRequest request)
        {
            var route = await _context.Routes.FindAsync(routeId);
            if (route == null)
            {
                return NotFound(new { error = "Route not found." });
            }

            if (User.IsInRole("school"))
            {
                var schoolIdString = User.FindFirst("schoolId")?.Value;
                if (string.IsNullOrEmpty(schoolIdString) || !Guid.TryParse(schoolIdString, out var schoolId) || route.SchoolId != schoolId)
                {
                    return Forbid();
                }
            }

            if (request.Name != null) route.Name = request.Name;
            if (request.SpeedLimitKmh.HasValue) route.SpeedLimitKmh = request.SpeedLimitKmh.Value;
            if (request.DeviationThresholdM.HasValue) route.DeviationThresholdM = request.DeviationThresholdM.Value;
            if (request.PlannedDurationMin.HasValue) route.PlannedDurationMin = request.PlannedDurationMin.Value;
            if (request.Stops != null) route.StopsJson = JsonSerializer.Serialize(request.Stops);
            if (request.Path != null) route.PathJson = JsonSerializer.Serialize(request.Path);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                id = route.Id,
                schoolId = route.SchoolId,
                name = route.Name,
                speedLimitKmh = route.SpeedLimitKmh,
                deviationThresholdM = route.DeviationThresholdM,
                plannedDurationMin = route.PlannedDurationMin,
                stops = JsonSerializer.Deserialize<object>(route.StopsJson),
                path = JsonSerializer.Deserialize<object>(route.PathJson)
            });
        }
    }

    public class CreateRouteRequest
    {
        public string Name { get; set; } = string.Empty;
        public Guid? SchoolId { get; set; }
        public double? SpeedLimitKmh { get; set; }
        public double? DeviationThresholdM { get; set; }
        public int? PlannedDurationMin { get; set; }
        public List<object>? Stops { get; set; }
        public List<object>? Path { get; set; }
    }

    public class UpdateRouteRequest
    {
        public string? Name { get; set; }
        public double? SpeedLimitKmh { get; set; }
        public double? DeviationThresholdM { get; set; }
        public int? PlannedDurationMin { get; set; }
        public List<object>? Stops { get; set; }
        public List<object>? Path { get; set; }
    }
}
