import { test, expect } from "@playwright/test";
import { gotoAdminDashboard, futureDateStr } from "./helpers";

/**
 * Booking lookup:
 *  1. Customer lookup at /lookup — requires booking ref + email.
 *  2. Admin lookup at /admin/bookings — single search field accepts email OR ref.
 *
 * The test booking is created via API (no UI) to avoid competing for tables with
 * the booking-flow spec running in parallel.
 */
test.describe("Booking lookup", () => {
  test.describe.configure({ mode: "serial" });

  const lookupEmail = "e2e-lookup@example.com";
  const lookupDate = futureDateStr(21); // 3 weeks out — no conflict with other tests
  let bookingRef = "";

  // ── Create the test booking via API ──────────────────────────────────────
  test("setup: create a booking via API to obtain a booking reference", async ({ request }) => {
    // Get the first restaurant and a table — fall back to seeded IDs on rate-limit
    const restRes = await request.get("/api/restaurants");
    const restaurants = restRes.ok() ? await restRes.json() : [];
    const restaurant = restaurants[0] ?? { id: 1, sections: [{ id: 1, tables: [{ id: 1 }] }] };
    const section = restaurant.sections[0];
    const table = section.tables[0];

    // Get an available slot for the test date (retry once if rate-limited)
    let availRes = await request.get(
      `/api/availability/${restaurant.id}?date=${lookupDate}&seats=2`
    );
    if (!availRes.ok()) {
      availRes = await request.get(`/api/availability/${restaurant.id}?date=${lookupDate}&seats=2`);
    }
    expect(availRes.ok()).toBeTruthy();
    const { slots } = await availRes.json();
    const slot = (
      slots as Array<{ time: string; isAvailable: boolean; availableTableIds: number[] }>
    ).find((s) => s.isAvailable);
    expect(slot).toBeTruthy();

    // Build UTC ISO datetime for the slot
    const [h, m] = slot!.time.split(":").map(Number);
    const slotUtc = new Date(
      `${lookupDate}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00.000Z`
    );

    // Use the first available table from the availability response
    const availableTableId = slot!.availableTableIds[0] ?? table.id;
    // Find which section this table belongs to
    const allSections: Array<{ id: number; tables: Array<{ id: number }> }> =
      restaurant.sections ?? [];
    const tableSection =
      allSections.find((s) => s.tables.some((t: { id: number }) => t.id === availableTableId)) ??
      section;

    // Acquire a hold
    const holdRes = await request.post("/api/holds", {
      data: {
        restaurantId: restaurant.id,
        tableId: availableTableId,
        sectionId: tableSection.id,
        date: slotUtc.toISOString(),
      },
    });
    expect(holdRes.ok()).toBeTruthy();
    const { holdId } = await holdRes.json();

    // Create the booking
    const bookingRes = await request.post("/api/bookings", {
      data: {
        restaurantId: restaurant.id,
        tableId: availableTableId,
        sectionId: tableSection.id,
        customerEmail: lookupEmail,
        customerName: "Lookup Test User",
        seats: 2,
        date: slotUtc.toISOString(),
        holdId,
      },
    });
    expect(bookingRes.ok()).toBeTruthy();
    const booking = await bookingRes.json();
    bookingRef = booking.bookingRef ?? booking.BookingRef;
    expect(bookingRef.length).toBeGreaterThan(0);
  });

  // ── Customer lookup by reference + email ──────────────────────────────────
  test("customer can look up a booking by reference and email", async ({ page }) => {
    expect(bookingRef).toBeTruthy();

    await page.goto("/lookup");
    await expect(page.getByText("Find My Booking")).toBeVisible();

    await page.getByPlaceholder("e.g. crispy-basil-thyme").fill(bookingRef);
    await page.getByPlaceholder("The email used when booking").fill(lookupEmail);
    await page.getByText("Look Up", { exact: true }).click();

    // Result card appears with booking details
    await expect(page.getByText("Booking Found")).toBeVisible({ timeout: 10_000 });
    // The booking email is shown in the detail rows — more reliable than the ref badge
    await expect(page.getByText(lookupEmail)).toBeVisible({ timeout: 10_000 });
  });

  test("wrong email returns no-booking-found message", async ({ page }) => {
    expect(bookingRef).toBeTruthy();

    await page.goto("/lookup");
    await page.getByPlaceholder("e.g. crispy-basil-thyme").fill(bookingRef);
    await page.getByPlaceholder("The email used when booking").fill("wrong@example.com");
    await page.getByText("Look Up", { exact: true }).click();

    await expect(page.getByText("No booking found matching that reference and email.")).toBeVisible(
      { timeout: 10_000 }
    );
  });

  // ── Admin lookup by email ──────────────────────────────────────────────────
  test("admin can look up a booking by email", async ({ page }) => {
    expect(bookingRef).toBeTruthy();

    await gotoAdminDashboard(page);
    await page.goto("/bookings");

    // .nth(1) = the bookings-page header search input (AdminSidebar has its own at nth(0))
    const searchInput = page.getByPlaceholder("Email or reference…").nth(1);
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    await searchInput.fill(lookupEmail);
    await page.getByText("Find", { exact: true }).click();

    await expect(page.getByText(lookupEmail).first()).toBeVisible({ timeout: 20_000 });
  });

  // ── Admin lookup by reference ─────────────────────────────────────────────
  test("admin can look up a booking by booking reference", async ({ page }) => {
    expect(bookingRef).toBeTruthy();

    await gotoAdminDashboard(page);
    await page.goto("/bookings");

    // .nth(1) = the bookings-page header search input (AdminSidebar has its own at nth(0))
    const searchInput = page.getByPlaceholder("Email or reference…").nth(1);
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    await searchInput.fill(bookingRef);
    await page.getByText("Find", { exact: true }).click();

    await expect(page.getByText(bookingRef).first()).toBeVisible({ timeout: 10_000 });
  });
});
