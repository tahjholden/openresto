using Microsoft.EntityFrameworkCore;
using OpenRestoApi.Core.Application.DTOs;
using OpenRestoApi.Core.Domain;
using OpenRestoApi.Infrastructure.Persistence;

namespace OpenRestoApi.Core.Application.Services;

public class HighlightService(AppDbContext db)
{
    private readonly AppDbContext _db = db;

    public async Task<List<HighlightDto>> GetAllAsync()
    {
        List<RestaurantHighlight> items = await _db.Highlights
            .OrderBy(h => h.SortOrder)
            .ThenBy(h => h.Id)
            .ToListAsync();
        return items.Select(ToDto).ToList();
    }

    public async Task<HighlightDto> CreateAsync(CreateHighlightRequest req)
    {
        var entity = new RestaurantHighlight
        {
            Title = req.Title,
            Body = req.Body,
            IconKey = req.IconKey,
            SortOrder = req.SortOrder,
        };
        _db.Highlights.Add(entity);
        await _db.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task<HighlightDto?> UpdateAsync(int id, UpdateHighlightRequest req)
    {
        RestaurantHighlight? entity = await _db.Highlights.FindAsync(id);
        if (entity == null)
        {
            return null;
        }
        entity.Title = req.Title;
        entity.Body = req.Body;
        entity.IconKey = req.IconKey;
        entity.SortOrder = req.SortOrder;
        await _db.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        RestaurantHighlight? entity = await _db.Highlights.FindAsync(id);
        if (entity == null)
        {
            return false;
        }
        _db.Highlights.Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }

    private static HighlightDto ToDto(RestaurantHighlight h) => new()
    {
        Id = h.Id,
        Title = h.Title,
        Body = h.Body,
        IconKey = h.IconKey,
        SortOrder = h.SortOrder,
    };
}
