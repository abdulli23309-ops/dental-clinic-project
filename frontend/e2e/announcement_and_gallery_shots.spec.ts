import { test, expect } from "@playwright/test";
import path from "path";

test("Capture Homepage Announcement Bar and Admin Gallery Tab at 1440px", async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Capture top of homepage showing announcement bar
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Verify announcement marquee region is visible
  const announcementRegion = page.locator("[role='region'][aria-label='Practice Announcements']");
  await expect(announcementRegion).toBeVisible({ timeout: 10000 });

  // Take screenshot of top of homepage (1440px viewport)
  const homeShotPath = path.resolve("../_scratch/shots/homepage_announcement_1440px.png");
  await page.screenshot({
    path: homeShotPath,
    fullPage: false,
  });

  // 2. Capture Admin Website CMS with Gallery tab active
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
  await page.waitForTimeout(1000);

  // Ensure active tab content is visible
  const galleryHeading = page.locator("h2:has-text('Upload Clinic Gallery Photo')");
  await expect(galleryHeading).toBeVisible({ timeout: 10000 });

  const adminShotPath = path.resolve("../_scratch/shots/admin_gallery_active_1440px.png");
  await page.screenshot({
    path: adminShotPath,
    fullPage: false,
  });
});
