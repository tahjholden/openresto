using Microsoft.AspNetCore.Mvc;
using Moq;
using OpenRestoApi.Controllers;
using OpenRestoApi.Core.Application.DTOs;
using OpenRestoApi.Core.Application.Interfaces;

namespace OpenRestoApi.Tests.Controllers;

public class HoldsControllerUnitTests
{
    private readonly Mock<IHoldService> _mockService;
    private readonly Mock<IRestaurantRepository> _mockRestaurantRepo;
    private readonly Mock<IBookingRepository> _mockBookingRepo;
    private readonly HoldsController _controller;

    public HoldsControllerUnitTests()
    {
        _mockService = new Mock<IHoldService>();
        _mockRestaurantRepo = new Mock<IRestaurantRepository>();
        _mockBookingRepo = new Mock<IBookingRepository>();
        _controller = new HoldsController(_mockService.Object, _mockRestaurantRepo.Object, _mockBookingRepo.Object);
    }

    [Fact]
    public async Task PlaceHold_ReturnsConflict_WhenResultNull()
    {
        var testDate = DateTime.UtcNow.Date.AddDays(1).AddHours(12); // Always 12:00 PM tomorrow UTC
        _mockRestaurantRepo.Setup(r => r.GetByIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new OpenRestoApi.Core.Domain.Restaurant
            {
                Id = 1,
                Timezone = "UTC",
                OpenTime = "00:00",
                CloseTime = "23:59"
            });
        _mockBookingRepo.Setup(b => b.IsTableBookedOnDateAsync(It.IsAny<int>(), It.IsAny<DateTime>()))
            .ReturnsAsync(false);
        _mockService.Setup(s => s.PlaceHold(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime>()))
            .Returns((HoldResult?)null);

        var result = await _controller.PlaceHold(new PlaceHoldRequest { Date = testDate });

        Assert.IsType<ConflictObjectResult>(result);
    }

    [Fact]
    public async Task PlaceHold_ReturnsBadRequest_WhenModelStateInvalid()
    {
        _controller.ModelState.AddModelError("Error", "Message");
        var result = await _controller.PlaceHold(new PlaceHoldRequest());
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task PlaceHold_PassesRestaurantConfiguredDuration_ToBookingConflictCheck()
    {
        var testDate = DateTime.UtcNow.Date.AddDays(1).AddHours(12);
        _mockRestaurantRepo.Setup(r => r.GetByIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new OpenRestoApi.Core.Domain.Restaurant
            {
                Id = 1,
                Timezone = "UTC",
                OpenTime = "00:00",
                CloseTime = "23:59",
                DefaultBookingDurationMinutes = 90
            });
        _mockBookingRepo.Setup(b => b.IsTableBookedOnDateAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<int>()))
            .ReturnsAsync(false);
        _mockService.Setup(s => s.PlaceHold(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<string?>(), It.IsAny<int>()))
            .Returns(new HoldResult("hold-1", DateTime.UtcNow.AddMinutes(5)));

        await _controller.PlaceHold(new PlaceHoldRequest { Date = testDate });

        _mockBookingRepo.Verify(b => b.IsTableBookedOnDateAsync(It.IsAny<int>(), It.IsAny<DateTime>(), 90), Times.Once);
        _mockService.Verify(s => s.PlaceHold(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<string?>(), 90), Times.Once);
    }

    private void SetupPerDayHoursRestaurant()
    {
        // Uniform hours 09:00–17:00, but the requested day's override is 12:00–14:00.
        _mockRestaurantRepo.Setup(r => r.GetByIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new OpenRestoApi.Core.Domain.Restaurant
            {
                Id = 1,
                Timezone = "UTC",
                OpenTime = "09:00",
                CloseTime = "17:00",
                OpenHoursJson = """{"1":{"open":"12:00","close":"14:00"},"2":{"open":"12:00","close":"14:00"},"3":{"open":"12:00","close":"14:00"},"4":{"open":"12:00","close":"14:00"},"5":{"open":"12:00","close":"14:00"},"6":{"open":"12:00","close":"14:00"},"7":{"open":"12:00","close":"14:00"}}"""
            });
        _mockBookingRepo.Setup(b => b.IsTableBookedOnDateAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<int>()))
            .ReturnsAsync(false);
        _mockService.Setup(s => s.PlaceHold(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<string?>(), It.IsAny<int>()))
            .Returns(new HoldResult("hold-1", DateTime.UtcNow.AddMinutes(5)));
    }

    [Fact]
    public async Task PlaceHold_ReturnsBadRequest_WhenOutsidePerDayHours()
    {
        SetupPerDayHoursRestaurant();

        // 10:00 is inside the uniform 09:00–17:00 but outside the per-day 12:00–14:00
        var testDate = DateTime.UtcNow.Date.AddDays(1).AddHours(10);
        var result = await _controller.PlaceHold(new PlaceHoldRequest { Date = testDate });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task PlaceHold_Succeeds_WithinPerDayHours()
    {
        SetupPerDayHoursRestaurant();

        var testDate = DateTime.UtcNow.Date.AddDays(1).AddHours(12).AddMinutes(30);
        var result = await _controller.PlaceHold(new PlaceHoldRequest { Date = testDate });

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task PlaceHold_ReturnsBadRequest_WhenLocationIsWalkInOnly()
    {
        _mockRestaurantRepo.Setup(r => r.GetByIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new OpenRestoApi.Core.Domain.Restaurant
            {
                Id = 1,
                Timezone = "UTC",
                OpenTime = "00:00",
                CloseTime = "23:59",
                WalkInOnly = true
            });

        var testDate = DateTime.UtcNow.Date.AddDays(1).AddHours(12);
        var result = await _controller.PlaceHold(new PlaceHoldRequest { Date = testDate });

        Assert.IsType<BadRequestObjectResult>(result);
        _mockService.Verify(
            s => s.PlaceHold(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<string?>(), It.IsAny<int>()),
            Times.Never);
    }

    [Fact]
    public async Task PlaceHold_ReturnsBadRequest_ForPastDate()
    {
        _mockRestaurantRepo.Setup(r => r.GetByIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new OpenRestoApi.Core.Domain.Restaurant
            {
                Id = 1,
                Timezone = "UTC",
                OpenTime = "00:00",
                CloseTime = "23:59",
            });

        var result = await _controller.PlaceHold(
            new PlaceHoldRequest { Date = DateTime.UtcNow.AddDays(-1) });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task PlaceHold_ReturnsBadRequest_WhenBookingsArePaused()
    {
        _mockRestaurantRepo.Setup(r => r.GetByIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new OpenRestoApi.Core.Domain.Restaurant
            {
                Id = 1,
                Timezone = "UTC",
                OpenTime = "00:00",
                CloseTime = "23:59",
                BookingsPausedUntil = DateTime.UtcNow.AddDays(7),
            });

        var testDate = DateTime.UtcNow.Date.AddDays(1).AddHours(12);
        var result = await _controller.PlaceHold(new PlaceHoldRequest { Date = testDate });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task PlaceHold_ReturnsConflict_WhenAlreadyBooked()
    {
        _mockRestaurantRepo.Setup(r => r.GetByIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new OpenRestoApi.Core.Domain.Restaurant
            {
                Id = 1,
                Timezone = "UTC",
                OpenTime = "00:00",
                CloseTime = "23:59",
            });
        _mockBookingRepo.Setup(b => b.IsTableBookedOnDateAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<int>()))
            .ReturnsAsync(true);

        var testDate = DateTime.UtcNow.Date.AddDays(1).AddHours(12);
        var result = await _controller.PlaceHold(new PlaceHoldRequest { Date = testDate });

        Assert.IsType<ConflictObjectResult>(result);
        _mockService.Verify(
            s => s.PlaceHold(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<string?>(), It.IsAny<int>()),
            Times.Never);
    }

    [Fact]
    public async Task PlaceHold_FallsBackToUtc_WhenTimezoneIsInvalid()
    {
        _mockRestaurantRepo.Setup(r => r.GetByIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new OpenRestoApi.Core.Domain.Restaurant
            {
                Id = 1,
                Timezone = "Not/A/Real/Timezone",
                OpenTime = "00:00",
                CloseTime = "23:59",
            });
        _mockBookingRepo.Setup(b => b.IsTableBookedOnDateAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<int>()))
            .ReturnsAsync(false);
        _mockService.Setup(s => s.PlaceHold(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<string?>(), It.IsAny<int>()))
            .Returns(new HoldResult("hold-1", DateTime.UtcNow.AddMinutes(5)));

        // Unspecified-kind date forces the timezone-conversion branch.
        var testDate = DateTime.SpecifyKind(DateTime.UtcNow.Date.AddDays(1).AddHours(12), DateTimeKind.Unspecified);
        var result = await _controller.PlaceHold(new PlaceHoldRequest { Date = testDate });

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task PlaceHold_ReturnsBadRequest_WhenDayNotInOpenDays()
    {
        DateTime testDate = DateTime.UtcNow.Date.AddDays(1).AddHours(12);
        int isoDay = (int)testDate.DayOfWeek == 0 ? 7 : (int)testDate.DayOfWeek;
        string otherDay = isoDay == 1 ? "2" : "1";

        _mockRestaurantRepo.Setup(r => r.GetByIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new OpenRestoApi.Core.Domain.Restaurant
            {
                Id = 1,
                Timezone = "UTC",
                OpenTime = "00:00",
                CloseTime = "23:59",
                OpenDays = otherDay,
            });

        var result = await _controller.PlaceHold(new PlaceHoldRequest { Date = testDate });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task PlaceHold_UsesDefaultHours_WhenStoredTimesAreUnparseable()
    {
        _mockRestaurantRepo.Setup(r => r.GetByIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new OpenRestoApi.Core.Domain.Restaurant
            {
                Id = 1,
                Timezone = "UTC",
                OpenTime = "",
                CloseTime = "",
            });
        _mockBookingRepo.Setup(b => b.IsTableBookedOnDateAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<int>()))
            .ReturnsAsync(false);
        _mockService.Setup(s => s.PlaceHold(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<string?>(), It.IsAny<int>()))
            .Returns(new HoldResult("hold-1", DateTime.UtcNow.AddMinutes(5)));

        // Falls back to the default 09:00-22:00 window, so noon is within hours.
        var testDate = DateTime.UtcNow.Date.AddDays(1).AddHours(12);
        var result = await _controller.PlaceHold(new PlaceHoldRequest { Date = testDate });

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task PlaceHold_HandlesOvernightHours_WhenRequestedTimeIsBeforeMidnightClose()
    {
        // Open 18:00, close 02:00 (after midnight) — 23:00 should be within hours.
        _mockRestaurantRepo.Setup(r => r.GetByIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new OpenRestoApi.Core.Domain.Restaurant
            {
                Id = 1,
                Timezone = "UTC",
                OpenTime = "18:00",
                CloseTime = "02:00",
            });
        _mockBookingRepo.Setup(b => b.IsTableBookedOnDateAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<int>()))
            .ReturnsAsync(false);
        _mockService.Setup(s => s.PlaceHold(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<string?>(), It.IsAny<int>()))
            .Returns(new HoldResult("hold-1", DateTime.UtcNow.AddMinutes(5)));

        var testDate = DateTime.UtcNow.Date.AddDays(1).AddHours(23);
        var result = await _controller.PlaceHold(new PlaceHoldRequest { Date = testDate });

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task PlaceHold_ReturnsBadRequest_OutsideOvernightHoursWindow()
    {
        // Open 18:00, close 02:00 — noon falls outside both segments of the window.
        _mockRestaurantRepo.Setup(r => r.GetByIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new OpenRestoApi.Core.Domain.Restaurant
            {
                Id = 1,
                Timezone = "UTC",
                OpenTime = "18:00",
                CloseTime = "02:00",
            });

        var testDate = DateTime.UtcNow.Date.AddDays(1).AddHours(12);
        var result = await _controller.PlaceHold(new PlaceHoldRequest { Date = testDate });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task PlaceHold_TreatsEqualOpenAndCloseTimes_AsAlwaysOpen()
    {
        _mockRestaurantRepo.Setup(r => r.GetByIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new OpenRestoApi.Core.Domain.Restaurant
            {
                Id = 1,
                Timezone = "UTC",
                OpenTime = "00:00",
                CloseTime = "00:00",
            });
        _mockBookingRepo.Setup(b => b.IsTableBookedOnDateAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<int>()))
            .ReturnsAsync(false);
        _mockService.Setup(s => s.PlaceHold(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<string?>(), It.IsAny<int>()))
            .Returns(new HoldResult("hold-1", DateTime.UtcNow.AddMinutes(5)));

        var testDate = DateTime.UtcNow.Date.AddDays(1).AddHours(3);
        var result = await _controller.PlaceHold(new PlaceHoldRequest { Date = testDate });

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task PlaceHold_ReturnsBadRequest_WhenDateFallsOnWalkInDay()
    {
        // Tomorrow's ISO day (1=Mon … 7=Sun) is marked walk-in only.
        DateTime testDate = DateTime.UtcNow.Date.AddDays(1).AddHours(12);
        int isoDay = (int)testDate.DayOfWeek == 0 ? 7 : (int)testDate.DayOfWeek;

        _mockRestaurantRepo.Setup(r => r.GetByIdAsync(It.IsAny<int>()))
            .ReturnsAsync(new OpenRestoApi.Core.Domain.Restaurant
            {
                Id = 1,
                Timezone = "UTC",
                OpenTime = "00:00",
                CloseTime = "23:59",
                WalkInDays = isoDay.ToString()
            });

        var result = await _controller.PlaceHold(new PlaceHoldRequest { Date = testDate });

        Assert.IsType<BadRequestObjectResult>(result);
    }
}
