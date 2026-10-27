import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Admin Roles Sidebar and Role-Title Match Verification", () => {
  test.setTimeout(90000);

  test("verifies sidebar link, navigation to roles, and matched role filter options", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const shotsDir = path.resolve(process.cwd(), "..", "_scratch", "shots");

    // 1. Log in as admin
    await page.goto("/login");
    await page.fill("#login-email", "admin@marlowdental.com");
    await page.fill(
      "#login-password",
      process.env.ADMIN_PASSWORD ||
        process.env.DEMO_ADMIN_PASSWORD ||
        "AdminDemoPass2026!"
    );
    await page.click("button[type='submit']");
    await page.waitForURL("**/admin**", { timeout: 15000 });

    // 2. Go to /admin/team
    await page.goto("/admin/team");
    await page.waitForLoadState("networkidle");

    // Verify "Roles" sidebar link is visible
    const rolesSidebarLink = page.locator('aside a[href="/admin/roles"]');
    await expect(rolesSidebarLink).toBeVisible({ timeout: 10000 });

    // Step 8.3: Screenshot of /admin/team showing sidebar with "Roles" link visible
    const sidebarShotPath = path.join(shotsDir, "sidebar-with-roles.png");
    await page.screenshot({ path: sidebarShotPath, fullPage: false });
    console.log("Screenshot saved:", sidebarShotPath);

    // Step 8.4: Click the "Roles" sidebar link and verify /admin/roles loads
    await rolesSidebarLink.click();
    await page.waitForURL("**/admin/roles", { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#roles-table")).toBeVisible({ timeout: 10000 });

    const adminRolesShotPath = path.join(shotsDir, "admin-roles-via-sidebar.png");
    await page.screenshot({ path: adminRolesShotPath, fullPage: false });
    console.log("Screenshot saved:", adminRolesShotPath);

    // Step 8.5: Go back to /admin/team and inspect role filter dropdown
    await page.goto("/admin/team");
    await page.waitForLoadState("networkidle");
    const roleFilter = page.locator("#role-filter");
    await expect(roleFilter).toBeVisible({ timeout: 10000 });

    // Extract all option labels
    const options = await roleFilter.locator("option").allTextContents();
    console.log("Role filter options:", options);

    const requiredRoles = [
      "Dentist",
      "General Dentist",
      "Orthodontist",
      "Endodontist",
      "Periodontist",
      "Prosthodontist",
      "Pediatric Dentist",
      "Oral Surgeon",
      "Implantologist",
      "Cosmetic Dentist",
      "Hygienist",
      "Dental Assistant",
      "Receptionist",
      "Practice Manager",
    ];

    for (const r of requiredRoles) {
      expect(options).toContain(r);
    }

    // Scroll to the filter area and take screenshot
    await roleFilter.scrollIntoViewIfNeeded();
    await roleFilter.focus();

    const rolesTitlesMatchedShotPath = path.join(shotsDir, "roles-titles-matched.png");
    await page.screenshot({ path: rolesTitlesMatchedShotPath, fullPage: false });
    console.log("Screenshot saved:", rolesTitlesMatchedShotPath);
  });
});
