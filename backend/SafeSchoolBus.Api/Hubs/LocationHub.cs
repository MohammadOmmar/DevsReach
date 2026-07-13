using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SafeSchoolBus.Api.Hubs
{
    [Authorize]
    public class LocationHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;
            var schoolId = Context.User?.FindFirst("schoolId")?.Value;

            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");
            }

            if (!string.IsNullOrEmpty(role))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"role:{role}");
            }

            if (!string.IsNullOrEmpty(schoolId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"school:{schoolId}");
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(System.Exception? exception)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;
            var schoolId = Context.User?.FindFirst("schoolId")?.Value;

            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user:{userId}");
            }

            if (!string.IsNullOrEmpty(role))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"role:{role}");
            }

            if (!string.IsNullOrEmpty(schoolId))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"school:{schoolId}");
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}
