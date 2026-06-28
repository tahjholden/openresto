using Microsoft.EntityFrameworkCore;
using OpenRestoApi.Core.Domain;
using OpenRestoApi.Infrastructure.Persistence;

namespace OpenRestoApi.Core.Application.Services;

public class MediaService(AppDbContext db, IWebHostEnvironment env)
{
    private readonly AppDbContext _db = db;
    private readonly string _mediaDir = Path.Combine(env.ContentRootPath, "wwwroot", "media");

    public async Task<string> UploadHeroAsync(Stream fileStream, string contentType)
    {
        EnsureMediaDir();
        foreach (string old in Directory.GetFiles(_mediaDir, "hero.*"))
            System.IO.File.Delete(old);

        string filename = $"hero.{GetExtension(contentType)}";
        await using (FileStream dest = System.IO.File.Create(Path.Combine(_mediaDir, filename)))
            await fileStream.CopyToAsync(dest);

        string url = $"/media/{filename}?v={DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";

        BrandSettings? brand = await _db.Set<BrandSettings>().FirstOrDefaultAsync();
        if (brand == null)
        {
            brand = new BrandSettings();
            _db.Set<BrandSettings>().Add(brand);
        }
        brand.HeaderImageUrl = url;
        await _db.SaveChangesAsync();
        return url;
    }

    public async Task DeleteHeroAsync()
    {
        BrandSettings? brand = await _db.Set<BrandSettings>().FirstOrDefaultAsync();
        if (brand?.HeaderImageUrl != null)
        {
            DeleteFile(brand.HeaderImageUrl);
            brand.HeaderImageUrl = null;
            await _db.SaveChangesAsync();
        }
    }

    public async Task<string?> UploadLocationAsync(int id, Stream fileStream, string contentType)
    {
        Restaurant? restaurant = await _db.Restaurants.FindAsync(id);
        if (restaurant == null) return null;

        EnsureMediaDir();
        foreach (string old in Directory.GetFiles(_mediaDir, $"location-{id}.*"))
            System.IO.File.Delete(old);

        string filename = $"location-{id}.{GetExtension(contentType)}";
        await using (FileStream dest = System.IO.File.Create(Path.Combine(_mediaDir, filename)))
            await fileStream.CopyToAsync(dest);

        string url = $"/media/{filename}?v={DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        restaurant.ImageUrl = url;
        await _db.SaveChangesAsync();
        return url;
    }

    public async Task<bool> DeleteLocationAsync(int id)
    {
        Restaurant? restaurant = await _db.Restaurants.FindAsync(id);
        if (restaurant == null) return false;
        if (restaurant.ImageUrl != null)
        {
            DeleteFile(restaurant.ImageUrl);
            restaurant.ImageUrl = null;
            await _db.SaveChangesAsync();
        }
        return true;
    }

    private void EnsureMediaDir() => Directory.CreateDirectory(_mediaDir);

    private void DeleteFile(string url)
    {
        string pathOnly = url.Contains('?') ? url[..url.IndexOf('?')] : url;
        string path = Path.Combine(_mediaDir, Path.GetFileName(pathOnly));
        if (System.IO.File.Exists(path))
            System.IO.File.Delete(path);
    }

    private static string GetExtension(string contentType) => contentType switch
    {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/webp" => "webp",
        _ => "bin"
    };
}
