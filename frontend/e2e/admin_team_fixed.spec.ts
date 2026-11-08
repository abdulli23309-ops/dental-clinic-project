import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Admin Team Search, Filter, Sort and Pagination", () => {
  test.setTimeout(60000);

  test("verifies search, sort, and takes 1440px screenshot", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Log in as Admin
    await page.goto("/login");
    await page.fill("#login-email", "admin@marlowdental.com");
    await page.fill(
      "#login-password",
      process.env.ADMIN_PASSWORD ||
        process.env.DEMO_ADMIN_PASSWORD ||
        "AdminDemoPass2026!"
    );
    await page.click("button[type='submit']");
    await page.waitForURL("**/admin", { timeout: 15000 });

    // 2. Navigate to /admin/team
    await page.goto("/admin/team");
    await page.waitForLoadState("networkidle");

    const searchInput = page.locator("#team-search");
    const roleSelect = page.locator("#role-filter");
    const branchSelect = page.locator("#branch-filter");
    const sortSelect = page.locator("#sort-by");
    const countText = page.locator("text=/Showing \\d+ of \\d+ clinicians/").first();

    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await expect(roleSelect).toBeVisible();
    await expect(branchSelect).toBeVisible();
    await expect(sortSelect).toBeVisible();
    await expect(countText).toBeVisible();

    // 3. Take screenshot at 1440px
    const shotPath = path.resolve(process.cwd(), "..", "_scratch", "shots", "admin-team-fixed.png");
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log("Screenshot saved to:", shotPath);

    // 4. Test search for 'Ozki'
    await searchInput.fill("Ozki");
    await page.waitForTimeout(300);
    await expect(page.locator("text=/Showing 1 of \\d+ clinicians/").first()).toBeVisible();
    const doctorCardsOzki = page.locator("h3");
    await expect(doctorCardsOzki.first()).toContainText("Meral Ozki");
    expect(await doctorCardsOzki.count()).toBe(1);

    // 5. Test search for 'Meral Ozki'
    await searchInput.fill("Meral Ozki");
    await page.waitForTimeout(300);
    await expect(page.locator("text=/Showing 1 of \\d+ clinicians/").first()).toBeVisible();
    const doctorCardsMeralOzki = page.locator("h3");
    await expect(doctorCardsMeralOzki.first()).toContainText("Meral Ozki");
    expect(await doctorCardsMeralOzki.count()).toBe(1);

    // 6. Clear search
    await searchInput.fill("");
    await page.waitForTimeout(300);
    const initialCount = await page.locator("h3").count();
    expect(initialCount).toBeGreaterThan(1);

    // 7. Test sort by Name (A–Z)
    await sortSelect.selectOption("name");
    await page.waitForTimeout(300);
    const names = await page.locator("h3").allInnerTexts();
    console.log("Names sorted:", names);
    const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sortedNames);

    // 8. Test sort by Role (A–Z)
    await sortSelect.selectOption("role");
    await page.waitForTimeout(300);
    const roleBadges = await page.locator("span.text-forest").allInnerTexts();
    console.log("Role badges:", roleBadges.slice(0, 10));
    // Verify first items start with the alphabetically earliest role
    expect(roleBadges.length).toBeGreaterThan(0);
    const sortedBadges = [...roleBadges].sort((a, b) => a.localeCompare(b));
    expect(roleBadges).toEqual(sortedBadges);
  });
});
