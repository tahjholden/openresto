namespace OpenRestoApi.Core.Domain;

public class RestaurantHighlight
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Body { get; set; } = null!;
    public string IconKey { get; set; } = "star-outline";
    public int SortOrder { get; set; }
}
