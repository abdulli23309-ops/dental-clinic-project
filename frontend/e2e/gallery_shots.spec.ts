import { test, expect } from "@playwright/test";
import path from "path";

test("Capture Public Gallery and Admin Gallery Tab at 1440px", async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Home page Gallery section screenshot
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const gallerySection = page.locator("#gallery");
  if ((await gallerySection.count()) > 0) {
    await gallerySection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await gallerySection.screenshot({
      path: path.resolve("../_scratch/shots/public_gallery_1440px.png"),
    });
  } else {
    await page.screenshot({
      path: path.resolve("../_scratch/shots/public_gallery_1440px.png"),
      fullPage: true,
    });
  }

  // 2. Admin Website Gallery Tab screenshot
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill("#login-email", "admin@marlowdental.com");
  await page.fill("#login-password", "AdminDemoPass2026!");
  await page.click("button[type='submit']");
  await page.waitForURL("**/admin", { timeout: 15000 });

  await page.goto("http://localhost:3000/admin/website", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Click the "Gallery" tab button
  const galleryTab = page.locator("button[role='tab']:has-text('Gallery')");
  await expect(galleryTab).toBeVisible({ timeout: 10000 });
  await galleryTab.click();
  await page.waitForTimeout(1200);

  await page.screenshot({
    path: path.resolve("../_scratch/shots/admin_gallery_1440px.png"),
  });
});
