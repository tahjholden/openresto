using Microsoft.EntityFrameworkCore;
using OpenRestoApi.Core.Application.DTOs;
using OpenRestoApi.Core.Application.Interfaces;
using OpenRestoApi.Core.Domain;
using OpenRestoApi.Infrastructure.Persistence;

namespace OpenRestoApi.Core.Application.Services;

public class NotificationService(AppDbContext db) : INotificationService
{
    private readonly AppDbContext _db = db;

    public async Task NotifyBookingCreatedAsync(Booking booking, string restaurantName)
    {
        _db.AdminNotifications.Add(new AdminNotification
        {
            RestaurantId = booking.RestaurantId,
            BookingId = booking.Id,
            BookingRef = booking.BookingRef,
            Type = "BookingCreated",
            CustomerName = booking.CustomerName ?? "Guest",
            BookingDate = booking.Date,
            Seats = booking.Seats,
            RestaurantName = restaurantName,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        // TODO: send Web Push to all AdminPushSubscription rows for this RestaurantId
        // 1. dotnet add package WebPush - done
        // 2. Add VapidPublicKey + VapidPrivateKey + VapidSubject to appsettings (generate with WebPushClient.GenerateVapidKeys())
        // 3. Inject IConfiguration, loop _db.AdminPushSubscriptions.Where(s => s.RestaurantId == ...), call WebPushClient.SendNotificationAsync
    }

    public async Task NotifyBookingCancelledAsync(Booking booking, string restaurantName)
    {
        _db.AdminNotifications.Add(new AdminNotification
        {
            RestaurantId = booking.RestaurantId,
            BookingId = booking.Id,
            BookingRef = booking.BookingRef,
            Type = "BookingCancelled",
            CustomerName = booking.CustomerName ?? "Guest",
            BookingDate = booking.Date,
            Seats = booking.Seats,
            RestaurantName = restaurantName,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        // TODO: send Web Push
    }

    public async Task<(List<AdminNotificationDto> Items, int TotalCount)> GetNotificationsAsync(
        int restaurantId, int page, int pageSize)
    {
        IQueryable<AdminNotification> q = _db.AdminNotifications
            .Where(n => n.RestaurantId == restaurantId)
            .OrderByDescending(n => n.CreatedAt);

        int total = await q.CountAsync();
        List<AdminNotification> items = await q
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items.Select(ToDto).ToList(), total);
    }

    public async Task<int> GetUnreadCountAsync(int restaurantId) =>
        await _db.AdminNotifications.CountAsync(n => n.RestaurantId == restaurantId && !n.IsRead);

    public async Task MarkReadAsync(int notificationId)
    {
        AdminNotification? n = await _db.AdminNotifications.FindAsync(notificationId);
        if (n is { IsRead: false })
        {
            n.IsRead = true;
            await _db.SaveChangesAsync();
        }
    }

    public async Task MarkAllReadAsync(int restaurantId) =>
        await _db.AdminNotifications
            .Where(n => n.RestaurantId == restaurantId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));

    public async Task SubscribeAsync(int restaurantId, PushSubscribeRequest request)
    {
        // Upsert by endpoint — same browser re-subscribing refreshes its keys
        AdminPushSubscription? existing = await _db.AdminPushSubscriptions
            .FirstOrDefaultAsync(s => s.Endpoint == request.Endpoint);

        if (existing is not null)
        {
            existing.P256dh = request.P256dh;
            existing.Auth = request.Auth;
            existing.UserAgent = request.UserAgent;
        }
        else
        {
            _db.AdminPushSubscriptions.Add(new AdminPushSubscription
            {
                RestaurantId = restaurantId,
                Endpoint = request.Endpoint,
                P256dh = request.P256dh,
                Auth = request.Auth,
                UserAgent = request.UserAgent,
                CreatedAt = DateTime.UtcNow,
            });
        }
        await _db.SaveChangesAsync();
    }

    public async Task UnsubscribeAsync(string endpoint)
    {
        AdminPushSubscription? sub = await _db.AdminPushSubscriptions
            .FirstOrDefaultAsync(s => s.Endpoint == endpoint);
        if (sub is not null)
        {
            _db.AdminPushSubscriptions.Remove(sub);
            await _db.SaveChangesAsync();
        }
    }

    private static AdminNotificationDto ToDto(AdminNotification n) => new(
        n.Id,
        n.RestaurantId,
        n.RestaurantName,
        n.BookingId,
        n.BookingRef,
        n.Type,
        n.CustomerName,
        n.BookingDate,
        n.Seats,
        n.IsRead,
        n.CreatedAt,
        n.PushSentAt,
        n.PushError
    );
}
