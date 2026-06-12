namespace OpenRestoApi.Core.Domain;

public class AdminPushSubscription
{
    public int Id { get; set; }
    public int RestaurantId { get; set; }
    public Restaurant Restaurant { get; set; } = null!;

    // Web Push subscription fields from the browser's PushSubscription object
    public string Endpoint { get; set; } = string.Empty;
    public string P256dh { get; set; } = string.Empty;
    public string Auth { get; set; } = string.Empty;

    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; }
}
