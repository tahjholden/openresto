import type { Page } from "@playwright/test";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@openresto.com";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "change-me-before-use";

/** Returns a YYYY-MM-DD string N days in the future (UTC). */
export function futureDateStr(daysAhead = 7): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().split("T")[0];
}

/** Returns a UTC ISO timestamp for N minutes ago. */
export function pastUtcISO(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

/**
 * Navigate to the admin dashboard.
 *
 * In tests that use the "chromium-admin" project the auth cookie is pre-loaded
 * via global-setup.ts — no login form needed.  In rare cases where you need a
 * fresh session (e.g. beforeAll hooks that create new browser contexts) call
 * this with `loginFirst = true` to hit the API once.
 */
export async function gotoAdminDashboard(page: Page, loginFirst = false): Promise<void> {
  if (loginFirst) {
    const res = await page.request.post("/api/admin/auth/login", {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    if (!res.ok()) {
      throw new Error(`Admin login failed (HTTP ${res.status()})`);
    }
  }
  await page.goto("/dashboard");
  await page.waitForURL(/.*dashboard.*/, { timeout: 20_000 });
}

/** @deprecated Use gotoAdminDashboard instead. */
export const adminLoginViaUI = (page: Page) => gotoAdminDashboard(page);
