import { test, expect } from "@playwright/test";
import { futureDateStr } from "./helpers";

// Known seeded restaurant IDs
const PASTA_PLACE_ID = 1;

/**
 * Full customer journey: home → restaurant → fill form → hold acquired → confirm.
 *
 * We navigate directly to the booking page and pick the last available date (29 days
 * out) from the DatePicker to avoid conflicts with bookings left by previous test runs.
 */
test.describe("Customer booking end to end", () => {
  test.skip("search → hold → confirm shows booking reference", async ({ page }) => {
    // ── 1. Navigate directly to the booking page ─────────────────────────────
    await page.goto(`/book?restaurantId=${PASTA_PLACE_ID}`);
    await expect(page.getByText("Book a table")).toBeVisible({ timeout: 15_000 });

    // ── 2. Set a date with no accumulated bookings via the native web date input ──
    // On web, DatePicker.web.tsx renders as <input type="date"> (max = today+29 days).
    // Use 7 days out — within the picker's max and far enough to avoid accumulated bookings.
    await page.locator('input[type="date"]').fill(futureDateStr(7));

    // ── 3. Fill customer details to trigger the hold (debounce = 2 s) ────────
    await page.getByPlaceholder("Your full name").fill("E2E Booking Flow");
    await page.getByPlaceholder("your@email.com").fill("e2e-booking-flow@example.com");

    // ── 4. Hold banner appears (allow 30 s to handle any slot re-selection) ──
    await expect(page.locator("text=Table held")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("text=/expires in \\d+:\\d+/")).toBeVisible();

    // ── 5. Confirm the booking ────────────────────────────────────────────────
    const confirmBtn = page.getByText("Confirm Booking");
    await expect(confirmBtn).toBeEnabled({ timeout: 5_000 });
    await confirmBtn.click();

    // ── 6. Confirmation page ──────────────────────────────────────────────────
    await page.waitForURL(/.*booking-confirmation\/.*/, { timeout: 15_000 });
    await expect(page.getByText("Booking Confirmed")).toBeVisible();
    await expect(page.getByText("e2e-booking-flow@example.com")).toBeVisible();

    const bookingRef = page.url().split("/booking-confirmation/")[1].split("?")[0];
    expect(bookingRef.length).toBeGreaterThan(0);
    await expect(page.getByText(bookingRef)).toBeVisible();
  });

  test("My Bookings link in navbar navigates to the lookup page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "My Bookings" }).click();
    await page.waitForURL(/.*lookup.*/, { timeout: 10_000 });
    await expect(page.getByText("Find My Booking")).toBeVisible();
  });
});
