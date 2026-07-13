using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SafeSchoolBus.Api.Data;
using SafeSchoolBus.Api.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SafeSchoolBus.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class VehiclesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public VehiclesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetVehicles()
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var schoolIdString = User.FindFirst("schoolId")?.Value;

            List<Vehicle> vehicles;

            if (role == "rto")
            {
                vehicles = await _context.Vehicles.ToListAsync();
            }
            else if (role == "school" && Guid.TryParse(schoolIdString, out var schoolId))
            {
                vehicles = await _context.Vehicles.Where(v => v.SchoolId == schoolId).ToListAsync();
            }
            else
            {
                var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userIdString) && Guid.TryParse(userIdString, out var userId))
                {
                    var user = await _context.Users.FindAsync(userId);
                    if (user != null && !string.IsNullOrEmpty(user.AssignedVehicleId) && Guid.TryParse(user.AssignedVehicleId, out var vehicleId))
                    {
                        vehicles = await _context.Vehicles.Where(v => v.Id == vehicleId).ToListAsync();
                    }
                    else
                    {
                        vehicles = new List<Vehicle>();
                    }
                }
                else
                {
                    vehicles = new List<Vehicle>();
                }
            }

            return Ok(vehicles);
        }

        [HttpPost]
        [Authorize(Roles = "school,rto")]
        public async Task<IActionResult> CreateVehicle([FromBody] CreateVehicleRequest request)
        {
            if (string.IsNullOrEmpty(request.Registration) || request.Registration.Length < 5)
            {
                return BadRequest(new { error = "A valid vehicle registration is required." });
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

            var schoolExists = await _context.Schools.AnyAsync(s => s.Id == schoolId);
            if (!schoolExists)
            {
                return BadRequest(new { error = "School does not exist." });
            }

            var vehicle = new Vehicle
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Registration = request.Registration.Trim().ToUpper(),
                DriverId = request.DriverId,
                Attendant = request.Attendant ?? "Pending",
                DocumentsStatus = request.DocumentsStatus ?? "pending",
                ComplianceScore = 100,
                AttendantCheck = request.Checklist?.Attendant ?? false,
                FirstAidCheck = request.Checklist?.FirstAid ?? false,
                SpeedGovernorCheck = request.Checklist?.SpeedGovernor ?? false,
                DocumentsCheck = request.Checklist?.Documents ?? false
            };

            _context.Vehicles.Add(vehicle);
            await _context.SaveChangesAsync();

            return StatusCode(201, vehicle);
        }

        [HttpPatch("{vehicleId}")]
        [Authorize(Roles = "school,rto")]
        public async Task<IActionResult> UpdateVehicle(Guid vehicleId, [FromBody] UpdateVehicleRequest request)
        {
            var vehicle = await _context.Vehicles.FindAsync(vehicleId);
            if (vehicle == null)
            {
                return NotFound(new { error = "Vehicle not found." });
            }

            if (User.IsInRole("school"))
            {
                var schoolIdString = User.FindFirst("schoolId")?.Value;
                if (string.IsNullOrEmpty(schoolIdString) || !Guid.TryParse(schoolIdString, out var schoolId) || vehicle.SchoolId != schoolId)
                {
                    return Forbid();
                }
            }

            if (request.DriverId.HasValue) vehicle.DriverId = request.DriverId.Value;
            if (request.Attendant != null) vehicle.Attendant = request.Attendant;
            if (request.DocumentsStatus != null) vehicle.DocumentsStatus = request.DocumentsStatus;
            if (request.ComplianceScore.HasValue) vehicle.ComplianceScore = request.ComplianceScore.Value;

            if (request.Checklist != null)
            {
                if (request.Checklist.Attendant.HasValue) vehicle.AttendantCheck = request.Checklist.Attendant.Value;
                if (request.Checklist.FirstAid.HasValue) vehicle.FirstAidCheck = request.Checklist.FirstAid.Value;
                if (request.Checklist.SpeedGovernor.HasValue) vehicle.SpeedGovernorCheck = request.Checklist.SpeedGovernor.Value;
                if (request.Checklist.Documents.HasValue) vehicle.DocumentsCheck = request.Checklist.Documents.Value;
            }

            await _context.SaveChangesAsync();
            return Ok(vehicle);
        }
    }

    public class CreateVehicleRequest
    {
        public string Registration { get; set; } = string.Empty;
        public Guid? SchoolId { get; set; }
        public Guid? DriverId { get; set; }
        public string? Attendant { get; set; }
        public string? DocumentsStatus { get; set; }
        public VehicleChecklist? Checklist { get; set; }
    }

    public class UpdateVehicleRequest
    {
        public Guid? DriverId { get; set; }
        public string? Attendant { get; set; }
        public string? DocumentsStatus { get; set; }
        public int? ComplianceScore { get; set; }
        public UpdateVehicleChecklist? Checklist { get; set; }
    }

    public class VehicleChecklist
    {
        public bool Attendant { get; set; }
        public bool FirstAid { get; set; }
        public bool SpeedGovernor { get; set; }
        public bool Documents { get; set; }
    }

    public class UpdateVehicleChecklist
    {
        public bool? Attendant { get; set; }
        public bool? FirstAid { get; set; }
        public bool? SpeedGovernor { get; set; }
        public bool? Documents { get; set; }
    }
}
