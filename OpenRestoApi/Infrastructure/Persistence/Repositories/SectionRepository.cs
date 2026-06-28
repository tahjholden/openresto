using CustomAccessibility.Attributes;
using OpenRestoApi.Core.Application.Interfaces;
using OpenRestoApi.Core.Domain;

namespace OpenRestoApi.Infrastructure.Persistence.Repositories;

[OnlyAccessibleBy("OpenRestoApi.Extensions.ServiceCollectionExtensions")]
[OnlyAccessibleBy("OpenRestoApi.Tests.**")]
internal class SectionRepository(AppDbContext db) : ISectionRepository
{
    private readonly AppDbContext _db = db;

    public async Task<Section?> GetByIdAsync(int id)
    {
        return await _db.Sections.FindAsync(id);
    }
}
