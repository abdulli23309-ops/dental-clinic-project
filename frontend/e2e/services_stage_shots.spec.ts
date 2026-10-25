import { test, expect } from "@playwright/test";
import path from "path";

test("Capture Treatments carousel and Admin Services modal at 1440px", async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Home page Treatments carousel screenshot
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const treatments = page.locator("#treatments");
  if (await treatments.count() > 0) {
    await treatments.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await treatments.screenshot({
      path: path.resolve("../_scratch/shots/treatments_carousel_1440px.png"),
    });
  }

  // 2. Admin Services Modal screenshot
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill("#login-email", "admin@marlowdental.com");
  await page.fill("#login-password", "AdminDemoPass2026!");
  await page.click("button[type='submit']");
  await page.waitForURL("**/admin", { timeout: 15000 });

  await page.goto("http://localhost:3000/admin/services", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Click the Edit button on the first service card
  const editButton = page.locator("button:has-text('Edit')").first();
  await expect(editButton).toBeVisible({ timeout: 10000 });
  await editButton.click();
  await page.waitForTimeout(600);

  // Scroll the modal to show the Service Image section
  const modal = page.locator("div.fixed.inset-0").first();
  const imageSection = page.locator("text=Service Image").first();
  if (await imageSection.count() > 0) {
    await imageSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  }

  await page.screenshot({
    path: path.resolve("../_scratch/shots/admin_services_modal_1440px.png"),
  });
});
