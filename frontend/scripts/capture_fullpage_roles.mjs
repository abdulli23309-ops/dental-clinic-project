import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/Dell5420/.gemini/antigravity/brain/f837e7d0-9c58-4e07-bb24-050493a3a25b/screenshots";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
  });
  const page = await context.newPage();

  console.log("1. Logging in as admin...");
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await page.fill("#login-email", "admin@hiradental.com");
  await page.fill("#login-password", "AdminTest123!");
  await page.click('button[type="submit"]');

  await page.waitForURL("**/admin**", { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Navigating to Roles
  console.log("2. Navigating to Roles...");
  const rolesLink = page.locator('a[href="/admin/roles"]').first();
  await rolesLink.click();
  await page.waitForURL("**/admin/roles**", { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Capture light page 1
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "verified_roles_page1_light_full.png"), fullPage: true });
  console.log("Captured verified_roles_page1_light_full.png");

  // Click page 2 button
  const page2Btn = page.locator('button:has-text("2")').last();
  if (await page2Btn.count() > 0) {
    await page2Btn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "verified_roles_page2_light_full.png"), fullPage: true });
    console.log("Captured verified_roles_page2_light_full.png");
  }

  // Switch to Dark Mode via script
  console.log("3. Switching to dark mode...");
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('marlow_theme_preference', 'dark');
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "verified_roles_page2_dark_full.png"), fullPage: true });
  console.log("Captured verified_roles_page2_dark_full.png");

  // Go back to page 1 in dark mode
  const page1Btn = page.locator('button:has-text("1")').first();
  if (await page1Btn.count() > 0) {
    await page1Btn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "verified_roles_page1_dark_full.png"), fullPage: true });
    console.log("Captured verified_roles_page1_dark_full.png");
  }

  // Also re-capture team tab 3 with updated branch name
  console.log("4. Navigating to Team to check branch dropdown...");
  const teamLink = page.locator('a[href="/admin/team"]').first();
  await teamLink.click();
  await page.waitForURL("**/admin/team**", { timeout: 10000 });
  await page.waitForTimeout(2000);

  const manageBtn = page.locator('button:has-text("Manage Clinician")').first();
  if (await manageBtn.count() > 0) {
    await manageBtn.click();
    await page.waitForTimeout(1500);

    const tab3 = page.locator('button:has-text("3. Authorized Services")').first();
    if (await tab3.count() > 0) {
      await tab3.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "verified_team_tab3_dhdc_branch.png"), fullPage: true });
      console.log("Captured verified_team_tab3_dhdc_branch.png");
    }
  }

  await browser.close();
  console.log("All fullPage screenshots captured successfully.");
}

main().catch((err) => {
  console.error("Error capturing fullPage screenshots:", err);
  process.exit(1);
});

