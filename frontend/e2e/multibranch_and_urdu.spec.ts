import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test("Capture Locations section, Team section, and Gallery in Urdu mode at 1440px", async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 900 });

  const shotsDir = path.resolve(__dirname, "../../_scratch/shots");
  if (!fs.existsSync(shotsDir)) {
    fs.mkdirSync(shotsDir, { recursive: true });
  }

  // Navigate to homepage
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Dismiss cookie banner if present
  const acceptCookiesBtn = page.locator("button:has-text('Accept Essential Cookies'), button:has-text('Accept')").first();
  if (await acceptCookiesBtn.isVisible()) {
    await acceptCookiesBtn.click();
    await page.waitForTimeout(500);
  }

  // 1. Locations Section with tabs and expanded card
  const locationsSection = page.locator("#locations");
  await expect(locationsSection).toBeVisible({ timeout: 15000 });
  await locationsSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);

  // Expand the first location card details
  const viewDetailsBtn = locationsSection.locator("button:has-text('View Hours & Details')").first();
  if (await viewDetailsBtn.isVisible()) {
    await viewDetailsBtn.click();
    await page.waitForTimeout(600);
  }

  const locationsShotPath = path.join(shotsDir, "locations_section_1440px.png");
  await locationsSection.screenshot({ path: locationsShotPath });
  console.log("Locations screenshot saved to:", locationsShotPath);

  // 2. Team Section with City Filter tabs
  const teamSection = page.locator("#team");
  await expect(teamSection).toBeVisible({ timeout: 15000 });
  await teamSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);

  const teamShotPath = path.join(shotsDir, "team_section_1440px.png");
  await teamSection.screenshot({ path: teamShotPath });
  console.log("Team screenshot saved to:", teamShotPath);

  // 3. Switch to Urdu Mode and capture Gallery section
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

  // Dismiss cookie banner if it reappears
  if (await acceptCookiesBtn.isVisible()) {
    await acceptCookiesBtn.click();
    await page.waitForTimeout(500);
  }

  const gallerySection = page.locator("#gallery");
  await expect(gallerySection).toBeVisible({ timeout: 15000 });
  await gallerySection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);

  const galleryShotPath = path.join(shotsDir, "gallery_urdu_1440px.png");
  await gallerySection.screenshot({ path: galleryShotPath });
  console.log("Gallery Urdu screenshot saved to:", galleryShotPath);
});
