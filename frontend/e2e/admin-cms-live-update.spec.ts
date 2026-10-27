import { test, expect } from "@playwright/test";

test.describe("Admin CMS Live Update & Public Propagation", () => {
  test.setTimeout(60000);

  test("Changes clinic name in /admin/website and asserts home page shows it within 3 seconds without reload", async ({
    context,
  }) => {
    // 1. Open public home page in Tab 1
    const publicPage = await context.newPage();
    await publicPage.goto("/");
    await publicPage.waitForLoadState("domcontentloaded");

    // 2. Open admin website page in Tab 2 and log in
    const adminPage = await context.newPage();
    await adminPage.goto("/login");
    await adminPage.fill("#login-email", "admin@marlowdental.com");
    await adminPage.fill(
      "#login-password",
      process.env.ADMIN_PASSWORD ||
        process.env.DEMO_ADMIN_PASSWORD ||
        "AdminDemoPass2026!"
    );
    await adminPage.click("button[type='submit']");
    await adminPage.waitForURL("**/admin", { timeout: 15000 });

    await adminPage.goto("/admin/website");
    await adminPage.waitForLoadState("domcontentloaded");

    // 3. Update the Clinic Practice Name in Admin Website CMS
    const newClinicName = `Apex Modern Dental ${Date.now().toString().slice(-4)}`;
    const practiceNameInput = adminPage.locator("#practice-name");
    await expect(practiceNameInput).toBeVisible({ timeout: 10000 });
    await practiceNameInput.fill(newClinicName);

    // 4. Click Save
    const saveButton = adminPage.locator("button:has-text('Save General Settings')");
    await saveButton.click();

    // 5. Assert confirmation feedback in Admin
    await expect(
      adminPage.locator("text=Saved. Live on the website now.").or(
        adminPage.locator("text=updated successfully")
      )
    ).toBeVisible({ timeout: 10000 });

    // 6. Switch to Tab 1 (bring to focus) and assert the public home page shows the new name within 3s without manual reload
    await publicPage.bringToFront();

    // Assert that without any page.reload(), the live public header/body reflects the new clinic name within 3 seconds
    await expect(publicPage.locator("header")).toContainText(newClinicName, {
      timeout: 3000,
    });
  });
});
