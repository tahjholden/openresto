using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using OpenRestoApi.Core.Application.DTOs;
using OpenRestoApi.Core.Application.Interfaces;
using OpenRestoApi.Core.Application.Mappings;
using OpenRestoApi.Core.Application.Services;
using OpenRestoApi.Core.Domain;
using OpenRestoApi.Infrastructure.Persistence;
using OpenRestoApi.Infrastructure.Persistence.Repositories;

namespace OpenRestoApi.Tests.Services;

public class WalkInTests
{
    private static AppDbContext CreateDb(string name)
    {
        DbContextOptions<AppDbContext> opts = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(name)
            .Options;
        return new AppDbContext(opts);
    }

    /// <summary>Next future occurrence of the given weekday, at 12:00 UTC.</summary>
    private static DateTime NextUtc(DayOfWeek dayOfWeek)
    {
        DateTime d = DateTime.UtcNow.Date.AddDays(1);
        while (d.DayOfWeek != dayOfWeek)
        {
            d = d.AddDays(1);
        }

        return d.AddHours(12);
    }

    // ── WalkInHelper ──────────────────────────────────────────────────────────

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void ParseWalkInDays_ReturnsEmpty_ForNullOrBlank(string? input)
    {
        Assert.Empty(WalkInHelper.ParseWalkInDays(input));
    }

    [Fact]
    public void ParseWalkInDays_ParsesValidDays_AndIgnoresJunk()
    {
        HashSet<int> days = WalkInHelper.ParseWalkInDays(" 6 ,7,0,8,abc,6");
        Assert.True(days.SetEquals([6, 7]));
    }

    [Fact]
    public void NormalizeWalkInDays_SortsAndDeduplicates()
    {
        Assert.Equal("2,6,7", WalkInHelper.NormalizeWalkInDays("7, 2,6,2"));
    }

    [Fact]
    public void NormalizeWalkInDays_ReturnsNull_WhenEmpty()
    {
        Assert.Null(WalkInHelper.NormalizeWalkInDays(""));
        Assert.Null(WalkInHelper.NormalizeWalkInDays(" , "));
    }

    [Theory]
    [InlineData("0")]
    [InlineData("8")]
    [InlineData("monday")]
    public void NormalizeWalkInDays_Throws_ForInvalidEntries(string input)
    {
        Assert.Throws<ArgumentException>(() => WalkInHelper.NormalizeWalkInDays(input));
    }

    [Fact]
    public void IsWalkInOnlyAt_ReturnsTrue_WhenLocationIsWalkInOnly()
    {
        var r = new Restaurant { Name = "T", WalkInOnly = true };
        Assert.True(WalkInHelper.IsWalkInOnlyAt(r, DateTime.UtcNow));
    }

    [Fact]
    public void IsWalkInOnlyAt_ReturnsFalse_WhenNoWalkInDays()
    {
        var r = new Restaurant { Name = "T" };
        Assert.False(WalkInHelper.IsWalkInOnlyAt(r, DateTime.UtcNow));
    }

    [Fact]
    public void IsWalkInOnlyAt_UsesRestaurantTimezone_ForDayBoundary()
    {
        // Sunday 02:00 UTC is still Saturday evening in Los Angeles.
        var r = new Restaurant { Name = "T", Timezone = "America/Los_Angeles", WalkInDays = "6" };
        var sundayUtc = new DateTime(2026, 10, 11, 2, 0, 0, DateTimeKind.Utc);

        Assert.True(WalkInHelper.IsWalkInOnlyAt(r, sundayUtc));
    }

    [Fact]
    public void IsWalkInOnlyAt_FallsBackToUtc_ForUnknownTimezone()
    {
        var r = new Restaurant { Name = "T", Timezone = "Not/AZone", WalkInDays = "7" };
        var sundayUtc = new DateTime(2026, 10, 11, 12, 0, 0, DateTimeKind.Utc);

        Assert.True(WalkInHelper.IsWalkInOnlyAt(r, sundayUtc));
    }

    [Fact]
    public void IsWalkInOnlyOn_MatchesDay()
    {
        var r = new Restaurant { Name = "T", WalkInDays = "6,7" };
        Assert.True(WalkInHelper.IsWalkInOnlyOn(r, 6));
        Assert.False(WalkInHelper.IsWalkInOnlyOn(r, 3));
    }

    // ── BookingService ────────────────────────────────────────────────────────

    private static BookingService CreateBookingService(AppDbContext db)
    {
        var config = new Mock<IConfiguration>();
        return new BookingService(
            new BookingRepository(db),
            new TableRepository(db),
            new SectionRepository(db),
            new RestaurantRepository(db),
            new Mock<IHoldService>().Object,
            new BookingMapper(),
            new BrandService(db, config.Object));
    }

    private static void SeedBookable(AppDbContext db, Restaurant restaurant)
    {
        db.Restaurants.Add(restaurant);
        db.Sections.Add(new Section { Id = 1, Name = "Main", RestaurantId = restaurant.Id });
        db.Tables.Add(new Table { Id = 1, Name = "T1", Seats = 4, SectionId = 1 });
        db.SaveChanges();
    }

    [Fact]
    public async Task CreateBookingAsync_Throws_WhenLocationIsWalkInOnly()
    {
        using AppDbContext db = CreateDb(nameof(CreateBookingAsync_Throws_WhenLocationIsWalkInOnly));
        SeedBookable(db, new Restaurant { Id = 1, Name = "T", WalkInOnly = true });

        BookingService svc = CreateBookingService(db);
        var dto = new BookingDto
        {
            RestaurantId = 1,
            SectionId = 1,
            TableId = 1,
            CustomerEmail = "guest@example.com",
            Seats = 2,
            Date = DateTime.UtcNow.AddDays(7)
        };

        InvalidOperationException ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.CreateBookingAsync(dto));
        Assert.Contains("walk-ins only", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateBookingAsync_Throws_WhenDateFallsOnWalkInDay()
    {
        using AppDbContext db = CreateDb(nameof(CreateBookingAsync_Throws_WhenDateFallsOnWalkInDay));
        SeedBookable(db, new Restaurant { Id = 1, Name = "T", Timezone = "UTC", WalkInDays = "6" });

        BookingService svc = CreateBookingService(db);
        var dto = new BookingDto
        {
            RestaurantId = 1,
            SectionId = 1,
            TableId = 1,
            CustomerEmail = "guest@example.com",
            Seats = 2,
            Date = NextUtc(DayOfWeek.Saturday)
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateBookingAsync(dto));
    }

    [Fact]
    public async Task CreateBookingAsync_Succeeds_OnNonWalkInDay()
    {
        using AppDbContext db = CreateDb(nameof(CreateBookingAsync_Succeeds_OnNonWalkInDay));
        SeedBookable(db, new Restaurant { Id = 1, Name = "T", Timezone = "UTC", WalkInDays = "6" });

        BookingService svc = CreateBookingService(db);
        var dto = new BookingDto
        {
            RestaurantId = 1,
            SectionId = 1,
            TableId = 1,
            CustomerEmail = "guest@example.com",
            Seats = 2,
            Date = NextUtc(DayOfWeek.Wednesday)
        };

        BookingDto result = await svc.CreateBookingAsync(dto);
        Assert.NotEmpty(result.BookingRef!);
    }

    // ── AvailabilityService ───────────────────────────────────────────────────

    private static AvailabilityService CreateAvailabilityService(AppDbContext db)
        => new(new BookingRepository(db), new RestaurantRepository(db), new Mock<IHoldService>().Object);

    private static void SeedAvailability(AppDbContext db, Restaurant restaurant)
    {
        db.Restaurants.Add(restaurant);
        db.Sections.Add(new Section { Id = 1, Name = "Main", RestaurantId = restaurant.Id });
        db.Tables.Add(new Table { Id = 1, Name = "T1", Seats = 4, SectionId = 1 });
        db.SaveChanges();
    }

    [Fact]
    public async Task GetAvailabilityAsync_ReturnsNoSlots_WhenLocationIsWalkInOnly()
    {
        using AppDbContext db = CreateDb(nameof(GetAvailabilityAsync_ReturnsNoSlots_WhenLocationIsWalkInOnly));
        SeedAvailability(db, new Restaurant
        {
            Id = 1, Name = "T", OpenTime = "11:00", CloseTime = "13:00", Timezone = "UTC", WalkInOnly = true
        });

        AvailabilityService svc = CreateAvailabilityService(db);
        AvailabilityResponseDto result = await svc.GetAvailabilityAsync(
            1, new DateTime(2026, 10, 9, 0, 0, 0, DateTimeKind.Utc), 2);

        Assert.Empty(result.Slots);
    }

    [Fact]
    public async Task GetAvailabilityAsync_ReturnsNoSlots_OnWalkInDay()
    {
        using AppDbContext db = CreateDb(nameof(GetAvailabilityAsync_ReturnsNoSlots_OnWalkInDay));
        SeedAvailability(db, new Restaurant
        {
            Id = 1, Name = "T", OpenTime = "11:00", CloseTime = "13:00", Timezone = "UTC", WalkInDays = "6"
        });

        AvailabilityService svc = CreateAvailabilityService(db);

        // 2026-10-10 is a Saturday (ISO day 6) — walk-in only, no slots.
        AvailabilityResponseDto saturday = await svc.GetAvailabilityAsync(
            1, new DateTime(2026, 10, 10, 0, 0, 0, DateTimeKind.Utc), 2);
        Assert.Empty(saturday.Slots);

        // 2026-10-11 is a Sunday — bookings still allowed, 4 half-hour slots.
        AvailabilityResponseDto sunday = await svc.GetAvailabilityAsync(
            1, new DateTime(2026, 10, 11, 0, 0, 0, DateTimeKind.Utc), 2);
        Assert.Equal(4, sunday.Slots.Count);
    }

    // ── RestaurantManagementService ───────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_SetsAndNormalizesWalkInFields()
    {
        using AppDbContext db = CreateDb(nameof(UpdateAsync_SetsAndNormalizesWalkInFields));
        db.Restaurants.Add(new Restaurant { Id = 1, Name = "T" });
        db.SaveChanges();

        var svc = new RestaurantManagementService(db);
        RestaurantDto? dto = await svc.UpdateAsync(1, new UpdateRestaurantRequest
        {
            Name = "T",
            WalkInOnly = true,
            WalkInDays = "7, 6"
        });

        Assert.NotNull(dto);
        Assert.True(dto.WalkInOnly);
        Assert.Equal("6,7", dto.WalkInDays);

        Restaurant? entity = await db.Restaurants.FindAsync(1);
        Assert.True(entity!.WalkInOnly);
        Assert.Equal("6,7", entity.WalkInDays);
    }

    [Fact]
    public async Task UpdateAsync_ClearsWalkInDays_WithEmptyString()
    {
        using AppDbContext db = CreateDb(nameof(UpdateAsync_ClearsWalkInDays_WithEmptyString));
        db.Restaurants.Add(new Restaurant { Id = 1, Name = "T", WalkInOnly = true, WalkInDays = "6,7" });
        db.SaveChanges();

        var svc = new RestaurantManagementService(db);
        RestaurantDto? dto = await svc.UpdateAsync(1, new UpdateRestaurantRequest
        {
            Name = "T",
            WalkInOnly = false,
            WalkInDays = ""
        });

        Assert.NotNull(dto);
        Assert.False(dto.WalkInOnly);
        Assert.Equal("", dto.WalkInDays);

        Restaurant? entity = await db.Restaurants.FindAsync(1);
        Assert.False(entity!.WalkInOnly);
        Assert.Null(entity.WalkInDays);
    }

    [Fact]
    public async Task UpdateAsync_Throws_ForInvalidWalkInDays()
    {
        using AppDbContext db = CreateDb(nameof(UpdateAsync_Throws_ForInvalidWalkInDays));
        db.Restaurants.Add(new Restaurant { Id = 1, Name = "T" });
        db.SaveChanges();

        var svc = new RestaurantManagementService(db);
        await Assert.ThrowsAsync<ArgumentException>(() => svc.UpdateAsync(1, new UpdateRestaurantRequest
        {
            Name = "T",
            WalkInDays = "8"
        }));
    }

    [Fact]
    public async Task UpdateAsync_LeavesWalkInFieldsUntouched_WhenOmitted()
    {
        using AppDbContext db = CreateDb(nameof(UpdateAsync_LeavesWalkInFieldsUntouched_WhenOmitted));
        db.Restaurants.Add(new Restaurant { Id = 1, Name = "T", WalkInOnly = true, WalkInDays = "6" });
        db.SaveChanges();

        var svc = new RestaurantManagementService(db);
        RestaurantDto? dto = await svc.UpdateAsync(1, new UpdateRestaurantRequest { Name = "T2" });

        Assert.NotNull(dto);
        Assert.True(dto.WalkInOnly);
        Assert.Equal("6", dto.WalkInDays);
    }

    [Fact]
    public async Task GetByIdAsync_ExposesWalkInFields()
    {
        using AppDbContext db = CreateDb(nameof(GetByIdAsync_ExposesWalkInFields));
        db.Restaurants.Add(new Restaurant { Id = 1, Name = "T", WalkInDays = "6,7" });
        db.SaveChanges();

        var svc = new RestaurantManagementService(db);
        RestaurantDto? dto = await svc.GetByIdAsync(1);

        Assert.NotNull(dto);
        Assert.False(dto.WalkInOnly);
        Assert.Equal("6,7", dto.WalkInDays);
    }
}
