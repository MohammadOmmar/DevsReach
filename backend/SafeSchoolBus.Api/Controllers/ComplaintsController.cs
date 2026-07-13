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
using System.Threading.Tasks;

namespace SafeSchoolBus.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ComplaintsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<LocationHub> _hubContext;
        private readonly SafetyRuleEvaluator _ruleEvaluator;

        public ComplaintsController(AppDbContext context, IHubContext<LocationHub> hubContext, SafetyRuleEvaluator ruleEvaluator)
        {
            _context = context;
            _hubContext = hubContext;
            _ruleEvaluator = ruleEvaluator;
        }

        [HttpPost]
        [Authorize(Roles = "parent")]
        public async Task<IActionResult> FileComplaint([FromBody] FileComplaintRequest request)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            {
                return Unauthorized();
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null || string.IsNullOrEmpty(user.AssignedVehicleId) || !Guid.TryParse(user.AssignedVehicleId, out var vehicleId))
            {
                return BadRequest(new { error = "No assigned vehicle linked to this parent." });
            }

            if (request.VehicleId != vehicleId)
            {
                return BadRequest(new { error = "Parents may report concerns only for an assigned vehicle." });
            }

            if (string.IsNullOrEmpty(request.Type) || string.IsNullOrEmpty(request.Description) || request.Description.Trim().Length < 5)
            {
                return BadRequest(new { error = "A concern type and a short description are required." });
            }

            var vehicle = await _context.Vehicles.FindAsync(vehicleId);
            if (vehicle == null)
            {
                return BadRequest(new { error = "Assigned vehicle not found." });
            }

            var complaint = new Complaint
            {
                Id = Guid.NewGuid(),
                VehicleId = vehicleId,
                SchoolId = vehicle.SchoolId,
                ParentId = userId,
                Type = request.Type,
                Description = request.Description.Trim(),
                Status = "open",
                CreatedAt = DateTime.UtcNow
            };

            _context.Complaints.Add(complaint);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.Group($"school:{vehicle.SchoolId}").SendAsync("complaint:new", complaint);

            var unresolvedCount = await _context.Complaints
                .CountAsync(c => c.VehicleId == vehicleId && c.Status == "open");

            if (unresolvedCount >= 3)
            {
                var alert = new Alert
                {
                    Id = Guid.NewGuid(),
                    Type = "repeated_complaint",
                    Severity = "high",
                    VehicleId = vehicleId,
                    SchoolId = vehicle.SchoolId,
                    Status = "open",
                    Title = "Repeated complaint flag",
                    Message = $"{vehicle.Registration} has {unresolvedCount} unresolved parent reports.",
                    CreatedAt = DateTime.UtcNow
                };
                await _ruleEvaluator.CreateAlertAsync(alert);
            }

            return StatusCode(201, new { complaint });
        }

        [HttpPatch("{complaintId}")]
        [Authorize(Roles = "school")]
        public async Task<IActionResult> ResolveComplaint(Guid complaintId, [FromBody] ResolveComplaintRequest request)
        {
            var complaint = await _context.Complaints.FindAsync(complaintId);
            if (complaint == null)
            {
                return NotFound(new { error = "Complaint not found." });
            }

            var schoolIdString = User.FindFirst("schoolId")?.Value;
            if (string.IsNullOrEmpty(schoolIdString) || !Guid.TryParse(schoolIdString, out var schoolId) || complaint.SchoolId != schoolId)
            {
                return Forbid();
            }

            if (request.Status == "resolved")
            {
                complaint.Status = "resolved";
                complaint.ResolvedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return Ok(new { complaint });
        }
    }

    public class FileComplaintRequest
    {
        public Guid VehicleId { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    public class ResolveComplaintRequest
    {
        public string Status { get; set; } = string.Empty;
    }
}
