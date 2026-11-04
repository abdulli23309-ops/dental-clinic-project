import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/Dell5420/.gemini/antigravity/brain/f837e7d0-9c58-4e07-bb24-050493a3a25b/screenshots";
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log("1. Logging in as admin...");
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await page.fill("#login-email", "admin@hiradental.com");
  await page.fill("#login-password", "AdminTest123!");
  await page.click('button[type="submit"]');

  await page.waitForURL("**/admin**", { timeout: 15000 });
  console.log("Logged in. Current URL:", page.url());
  await page.waitForTimeout(3000);

  // 1. Click sidebar link to /admin/services
  console.log("2. Navigating to Services via sidebar...");
  const servicesLink = page.locator('a[href="/admin/services"]').first();
  await servicesLink.click();
  await page.waitForURL("**/admin/services**", { timeout: 10000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "v6_admin_services_catalog.png") });
  console.log("Captured v6_admin_services_catalog.png");

  // Open Edit Procedure Drawer
  console.log("3. Opening Procedure Edit Drawer...");
  const editBtn = page.locator('button:has-text("Edit")').first();
  if (await editBtn.count() > 0) {
    await editBtn.click();
    await page.waitForSelector('text=Catalog Definition', { timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "v6_admin_services_edit_drawer.png") });
    console.log("Captured v6_admin_services_edit_drawer.png");

    const closeBtn = page.locator('button[aria-label="Close drawer"]');
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // 2. Click sidebar link to /admin/team
  console.log("4. Navigating to Team via sidebar...");
  const teamLink = page.locator('a[href="/admin/team"]').first();
  await teamLink.click();
  await page.waitForURL("**/admin/team**", { timeout: 10000 });
  await page.waitForTimeout(3000);

  const manageBtn = page.locator('button:has-text("Manage Clinician")').first();
  if (await manageBtn.count() > 0) {
    await manageBtn.click();
    await page.waitForTimeout(1500);

    const tab3 = page.locator('button:has-text("3. Authorized Services")').first();
    if (await tab3.count() > 0) {
      await tab3.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "v6_admin_team_tab3_verified.png") });
      console.log("Captured v6_admin_team_tab3_verified.png");
    }
  }

  // 3. Click sidebar link to /admin/users
  console.log("5. Navigating to Staff Accounts via sidebar...");
  const usersLink = page.locator('a[href="/admin/users"]').first();
  await usersLink.click();
  await page.waitForURL("**/admin/users**", { timeout: 10000 });
  await page.waitForTimeout(3000);

  const addStaffBtn = page.locator('button:has-text("Add Staff Member")').first();
  if (await addStaffBtn.count() > 0) {
    await addStaffBtn.click();
    await page.waitForSelector('text=Create New Staff Account', { timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "v6_admin_users_role_first_modal.png") });
    console.log("Captured v6_admin_users_role_first_modal.png");
  }

  await browser.close();
  console.log("All visual verification captures complete!");
}

main().catch(console.error);
