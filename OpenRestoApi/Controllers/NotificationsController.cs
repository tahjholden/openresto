using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenRestoApi.Core.Application.DTOs;
using OpenRestoApi.Core.Application.Interfaces;

namespace OpenRestoApi.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize]
public class NotificationsController(INotificationService notificationService) : ControllerBase
{
    private readonly INotificationService _notifications = notificationService;

    /// <summary>
    /// List notification history for a restaurant, newest first.
    /// GET /api/admin/notifications?restaurantId=1&amp;page=1&amp;pageSize=20
    /// </summary>
    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications(
        [FromQuery] int restaurantId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (restaurantId <= 0)
            return BadRequest(new { error = "restaurantId is required." });

        var (items, total) = await _notifications.GetNotificationsAsync(restaurantId, page, pageSize);
        return Ok(new { items, total, page, pageSize });
    }

    /// <summary>
    /// Unread notification count badge.
    /// GET /api/admin/notifications/unread-count?restaurantId=1
    /// </summary>
    [HttpGet("notifications/unread-count")]
    public async Task<IActionResult> GetUnreadCount([FromQuery] int restaurantId)
    {
        if (restaurantId <= 0)
            return BadRequest(new { error = "restaurantId is required." });

        int count = await _notifications.GetUnreadCountAsync(restaurantId);
        return Ok(new { count });
    }

    /// <summary>
    /// Mark a single notification as read.
    /// PATCH /api/admin/notifications/{id}/read
    /// </summary>
    [HttpPatch("notifications/{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        await _notifications.MarkReadAsync(id);
        return NoContent();
    }

    /// <summary>
    /// Mark all notifications for a restaurant as read.
    /// PATCH /api/admin/notifications/read-all?restaurantId=1
    /// </summary>
    [HttpPatch("notifications/read-all")]
    public async Task<IActionResult> MarkAllRead([FromQuery] int restaurantId)
    {
        if (restaurantId <= 0)
            return BadRequest(new { error = "restaurantId is required." });

        await _notifications.MarkAllReadAsync(restaurantId);
        return NoContent();
    }

    /// <summary>
    /// Register a browser push subscription for this restaurant's admin.
    /// POST /api/admin/push/subscribe?restaurantId=1
    /// Body: { endpoint, p256dh, auth, userAgent? }
    /// </summary>
    [HttpPost("push/subscribe")]
    public async Task<IActionResult> Subscribe(
        [FromQuery] int restaurantId,
        [FromBody] PushSubscribeRequest request)
    {
        if (restaurantId <= 0)
            return BadRequest(new { error = "restaurantId is required." });

        await _notifications.SubscribeAsync(restaurantId, request);
        return Ok();
    }

    /// <summary>
    /// Remove a push subscription (e.g. on logout or permission revoke).
    /// DELETE /api/admin/push/subscribe
    /// Body: "https://fcm.googleapis.com/..."
    /// </summary>
    [HttpDelete("push/subscribe")]
    public async Task<IActionResult> Unsubscribe([FromBody] string endpoint)
    {
        await _notifications.UnsubscribeAsync(endpoint);
        return NoContent();
    }
}
