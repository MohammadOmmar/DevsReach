using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SafeSchoolBus.Api.Data;
using SafeSchoolBus.Api.Models;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SafeSchoolBus.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AlertsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AlertsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPatch("{alertId}")]
        [Authorize(Roles = "school")]
        public async Task<IActionResult> ResolveAlert(Guid alertId, [FromBody] ResolveAlertRequest request)
        {
            var alert = await _context.Alerts.FindAsync(alertId);
            if (alert == null)
            {
                return NotFound(new { error = "Alert not found." });
            }

            var schoolIdString = User.FindFirst("schoolId")?.Value;
            if (string.IsNullOrEmpty(schoolIdString) || !Guid.TryParse(schoolIdString, out var schoolId) || alert.SchoolId != schoolId)
            {
                return Forbid();
            }

            if (request.Status == "resolved")
            {
                alert.Status = "resolved";
            }
            else if (request.Status == "under_review")
            {
                alert.Status = "under_review";
            }
            
            alert.ReviewedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { alert });
        }
    }

    public class ResolveAlertRequest
    {
        public string Status { get; set; } = string.Empty;
    }
}
