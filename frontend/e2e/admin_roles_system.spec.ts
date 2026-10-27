import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Dynamic Role Management System", () => {
  test.setTimeout(90000);

  test("verifies full role lifecycle, dynamic team dropdown, and takes screenshots", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

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
    await page.waitForURL("**/admin", { timeout: 15000 });

    // 2. Go to /admin/roles
    await page.goto("/admin/roles");
    await page.waitForLoadState("networkidle");

    const rolesTable = page.locator("#roles-table");
    await expect(rolesTable).toBeVisible({ timeout: 10000 });

    // Assert 13 default roles exist
    const defaultRoles = [
      "Dentist",
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

    for (const r of defaultRoles) {
      await expect(page.locator(`text=${r}`).first()).toBeVisible();
    }

    // Take screenshot of /admin/roles at 1440px
    const rolesShotPath = path.resolve(process.cwd(), "..", "_scratch", "shots", "admin-roles.png");
    await page.screenshot({ path: rolesShotPath, fullPage: false });
    console.log("Screenshot saved to:", rolesShotPath);

    // 3. Add a new role "Sleep Dentist"
    await page.click("#add-role-btn");
    await expect(page.locator("#role-name-input")).toBeVisible();
    await page.fill("#role-name-input", "Sleep Dentist");
    await page.fill("#role-display-name-input", "Sleep Dentist");
    await page.fill("#role-description-input", "Specialized in sleep apnea oral appliances");
    await page.click("#save-role-btn");

    // Wait for role to appear
    await expect(page.locator("text=Sleep Dentist").first()).toBeVisible({ timeout: 10000 });

    // 4. Go to /admin/team and open Add Team Member modal
    await page.goto("/admin/team");
    await page.waitForLoadState("networkidle");

    const addMemberBtn = page.locator("button:has-text('Add Team Member')");
    await expect(addMemberBtn).toBeVisible({ timeout: 10000 });
    await addMemberBtn.click();

    const roleDropdown = page.locator("#member-role");
    await expect(roleDropdown).toBeVisible({ timeout: 10000 });

    // Verify "Sleep Dentist" is in the dropdown
    const options = await roleDropdown.locator("option").allInnerTexts();
    console.log("Team form role options:", options);
    expect(options).toContain("Sleep Dentist");

    // Select "Sleep Dentist" so it's visibly active in the screenshot
    await roleDropdown.selectOption("Sleep Dentist");

    // Take screenshot of add-member form showing dynamic role dropdown
    const teamRoleShotPath = path.resolve(process.cwd(), "..", "_scratch", "shots", "admin-team-role-dropdown.png");
    await page.screenshot({ path: teamRoleShotPath, fullPage: false });
    console.log("Screenshot saved to:", teamRoleShotPath);

    // Close the add member modal
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // 5. Delete "Sleep Dentist" from /admin/roles
    await page.goto("/admin/roles");
    await page.waitForLoadState("networkidle");

    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    const sleepRow = page.locator("tr", { hasText: "Sleep Dentist" }).first();
    const deleteBtn = sleepRow.locator("button[title='Deactivate role']");
    await deleteBtn.click();

    await page.waitForTimeout(1000);
    // Verify it is marked Inactive
    await expect(sleepRow.locator("text=Inactive")).toBeVisible({ timeout: 10000 });

    // 6. Go back to /admin/team and verify it disappeared from active dropdown
    await page.goto("/admin/team");
    await page.waitForLoadState("networkidle");
    await page.click("button:has-text('Add Team Member')");
    await expect(page.locator("#member-role")).toBeVisible({ timeout: 10000 });

    const updatedOptions = await page.locator("#member-role option").allInnerTexts();
    console.log("Updated team form role options after delete:", updatedOptions);
    expect(updatedOptions).not.toContain("Sleep Dentist");
  });
});
