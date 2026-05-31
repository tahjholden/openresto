import { test, expect } from "@playwright/test";
import { gotoAdminDashboard } from "./helpers";
import { ADMIN_STATE_FILE } from "./global-setup";

const TEST_COLOR = "#dc2626"; // Tailwind red-600 — distinct enough to detect reliably

interface BrandDto {
  appName: string;
  primaryColor: string;
  accentColor?: string;
  faviconIcon?: string;
}

/**
 * Brand colour change propagates to the customer-facing UI.
 *
 * We save the original colour in beforeAll and restore it in afterAll so the
 * test leaves the app unchanged.  Both hooks use the auth cookie from the global
 * setup (storageState) to avoid burning the 5-per-minute auth rate limit.
 */
test.describe("Brand colour", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(60_000);

  let originalBrand: BrandDto;

  test.beforeAll(async ({ browser }) => {
    // Reuse the global-setup auth cookie — no extra login request needed
    const ctx = await browser.newContext({ storageState: ADMIN_STATE_FILE });
    const page = await ctx.newPage();
    await gotoAdminDashboard(page);

    const res = await page.request.get("/api/brand");
    originalBrand = await res.json();

    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!originalBrand) return;
    const ctx = await browser.newContext({ storageState: ADMIN_STATE_FILE });
    const page = await ctx.newPage();
    await gotoAdminDashboard(page);

    await page.request.post("/api/brand", { data: originalBrand });
    await ctx.close();
  });

  test("changing primary colour in settings is reflected on the home page", async ({ page }) => {
    await gotoAdminDashboard(page); // auth cookie already in storageState

    // ── Navigate to Settings → Brand Identity card ─────────────────────────
    await page.goto("/settings");
    await expect(page.getByText("Location Manager")).toBeVisible({ timeout: 10_000 });

    // Expand the Brand Identity accordion
    await page.getByText("Brand Identity").click();
    await expect(page.getByPlaceholder("#0a7ea4")).toBeVisible({ timeout: 5_000 });

    // Type the hex value into the colour input (always works regardless of swatch state)
    await page.getByPlaceholder("#0a7ea4").fill(TEST_COLOR);

    // Verify the input reflects the new value
    await expect(page.getByPlaceholder("#0a7ea4")).toHaveValue(TEST_COLOR);

    // The Save button text "Save" is inside a Pressable (div) that itself may have the text.
    // Use force:true to click even if the inner text element has pointer-events:none.
    await page.getByText("Save", { exact: true }).first().click({ force: true });
    await expect(page.getByText("Brand settings saved.")).toBeVisible({ timeout: 10_000 });

    // ── Verify the API returns the new colour ─────────────────────────────
    const brandRes = await page.request.get("/api/brand");
    const brand: BrandDto = await brandRes.json();
    expect(brand.primaryColor.toLowerCase()).toBe(TEST_COLOR);

    // ── Verify the home page renders the new colour ───────────────────────
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible({ timeout: 10_000 });

    // The app-name link in the Navbar uses `color: primaryColor` as an inline style.
    const appName = brand.appName || "Open Resto";
    const brandTextEl = page.getByText(appName, { exact: true }).first();
    await expect(brandTextEl).toBeVisible();

    const appliedColor = await brandTextEl.evaluate(
      (el: Element) => window.getComputedStyle(el).color
    );

    const [rHex, gHex, bHex] = [
      TEST_COLOR.slice(1, 3),
      TEST_COLOR.slice(3, 5),
      TEST_COLOR.slice(5, 7),
    ].map((h) => parseInt(h, 16));
    const expectedRgb = `rgb(${rHex}, ${gHex}, ${bHex})`;

    expect(appliedColor).toBe(expectedRgb);
  });
});
