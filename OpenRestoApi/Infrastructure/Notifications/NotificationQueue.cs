using System.Threading.Channels;
using CustomAccessibility.Attributes;
using OpenRestoApi.Core.Application.Interfaces;
using OpenRestoApi.Core.Domain;

namespace OpenRestoApi.Infrastructure.Notifications;

[OnlyAccessibleBy("OpenRestoApi.Extensions.ServiceCollectionExtensions")]
[OnlyAccessibleBy("OpenRestoApi.Infrastructure.Notifications.*")]
[OnlyAccessibleBy("OpenRestoApi.Tests.Infrastructure.NotificationQueueTests")]
[OnlyAccessibleBy("OpenRestoApi.Tests.Infrastructure.NotificationWorkerTests")]
[ExternalAccessAllowed]
internal sealed class NotificationQueue : INotificationQueue
{
    internal readonly Channel<NotificationWorkItem> Channel =
        System.Threading.Channels.Channel.CreateBounded<NotificationWorkItem>(
            new BoundedChannelOptions(200)
            {
                FullMode = BoundedChannelFullMode.DropOldest,
                SingleReader = true,
                SingleWriter = false,
            });

    public void EnqueueBookingCreated(Booking booking, string restaurantName) =>
        Channel.Writer.TryWrite(new BookingCreatedWork(booking, restaurantName));

    public void EnqueueBookingCancelled(Booking booking, string restaurantName) =>
        Channel.Writer.TryWrite(new BookingCancelledWork(booking, restaurantName));

    public void EnqueueCapacityCheck(int restaurantId, string restaurantName, DateTime bookingDate) =>
        Channel.Writer.TryWrite(new CapacityCheckWork(restaurantId, restaurantName, bookingDate));

    // The CustomAccessibility analyzer's [OnlyAccessibleBy]/[ExternalAccessAllowed]
    // pair on this class permits calling members like these from the whitelisted
    // test classes above, but doesn't extend that permission to the internal
    // `Channel` field itself when accessed directly from another project — so
    // tests go through these instead of `queue.Channel...`.
    internal bool TryReadForTests(out NotificationWorkItem? item) => Channel.Reader.TryRead(out item);

    internal bool TryWriteForTests(NotificationWorkItem item) => Channel.Writer.TryWrite(item);

    internal void CompleteForTests() => Channel.Writer.Complete();
}
