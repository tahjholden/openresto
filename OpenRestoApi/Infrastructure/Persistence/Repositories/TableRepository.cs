using CustomAccessibility.Attributes;
using OpenRestoApi.Core.Application.Interfaces;
using OpenRestoApi.Core.Domain;

namespace OpenRestoApi.Infrastructure.Persistence.Repositories;

[OnlyAccessibleBy("OpenRestoApi.Extensions.ServiceCollectionExtensions")]
[OnlyAccessibleBy("OpenRestoApi.Tests.**")]
internal class TableRepository(AppDbContext db) : ITableRepository
{
    private readonly AppDbContext _db = db;

    public async Task<Table?> GetByIdAsync(int id)
    {
        return await _db.Tables.FindAsync(id);
    }
}
