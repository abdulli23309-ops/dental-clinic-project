import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test("Capture Admin Locations Branch Photo Upload and Fixed Urdu Gallery at 1440px", async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 900 });

  const shotsDir = path.resolve(__dirname, "../../_scratch/shots");
  if (!fs.existsSync(shotsDir)) {
    fs.mkdirSync(shotsDir, { recursive: true });
  }

  // 1. Admin Locations Branch Photo Upload Modal
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill("#login-email", "admin@marlowdental.com");
  await page.fill("#login-password", "AdminDemoPass2026!");
  await page.click("button[type='submit']");
  await page.waitForURL("**/admin", { timeout: 15000 });

  await page.goto("http://localhost:3000/admin/locations", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Click "Add Practice Facility" or "Edit" on the first location
  const editBtn = page.locator("button:has-text('Edit')").first();
  if (await editBtn.isVisible()) {
    await editBtn.click();
  } else {
    await page.click("button:has-text('Add Practice Facility')");
  }
  await page.waitForTimeout(800);

  // Ensure "Branch Photo" section is visible
  const branchPhotoLabel = page.locator("label:has-text('Branch Photo')");
  await expect(branchPhotoLabel).toBeVisible({ timeout: 10000 });

  const photoInput = page.locator("#branch-photo-input");
  await expect(photoInput).toBeVisible({ timeout: 10000 });

  // Scroll photo input into view inside the modal
  await photoInput.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  const adminShotPath = path.join(shotsDir, "admin_location_image_upload.png");
  await page.screenshot({ path: adminShotPath, fullPage: false });
  console.log("Admin location image upload screenshot saved to:", adminShotPath);

  // 2. Gallery in Urdu Mode
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Dismiss cookie banner
  const acceptCookiesBtn = page.locator("button:has-text('Accept Essential Cookies'), button:has-text('Accept')").first();
  if (await acceptCookiesBtn.isVisible()) {
    await acceptCookiesBtn.click();
    await page.waitForTimeout(500);
  }

  // Switch to Urdu
  const urduToggle = page.locator("header button:has-text('اردو'), nav button:has-text('اردو')").first();
  if (await urduToggle.isVisible()) {
    await urduToggle.click();
    await page.waitForTimeout(1500);
  } else {
    await page.evaluate(() => {
      localStorage.setItem("marlow_locale", "ur");
      window.location.reload();
    });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
  }

  if (await acceptCookiesBtn.isVisible()) {
    await acceptCookiesBtn.click();
    await page.waitForTimeout(500);
  }

  const gallerySection = page.locator("#gallery");
  await expect(gallerySection).toBeVisible({ timeout: 15000 });
  await gallerySection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  const galleryShotPath = path.join(shotsDir, "gallery_urdu_fixed.png");
  await gallerySection.screenshot({ path: galleryShotPath });
  console.log("Fixed Gallery Urdu screenshot saved to:", galleryShotPath);
});
