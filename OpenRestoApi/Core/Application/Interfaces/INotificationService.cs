using OpenRestoApi.Core.Application.DTOs;
using OpenRestoApi.Core.Domain;

namespace OpenRestoApi.Core.Application.Interfaces;

public interface INotificationService
{
    Task NotifyBookingCreatedAsync(Booking booking, string restaurantName);
    Task NotifyBookingCancelledAsync(Booking booking, string restaurantName);

    Task<(List<AdminNotificationDto> Items, int TotalCount)> GetNotificationsAsync(
        int restaurantId, int page, int pageSize);

    Task<int> GetUnreadCountAsync(int restaurantId);
    Task MarkReadAsync(int notificationId);
    Task MarkAllReadAsync(int restaurantId);

    Task SubscribeAsync(int restaurantId, PushSubscribeRequest request);
    Task UnsubscribeAsync(string endpoint);
}
