import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/Dell5420/.gemini/antigravity/brain/f837e7d0-9c58-4e07-bb24-050493a3a25b/screenshots";

async function main() {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("1. Capturing Split-Screen Login Page...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500); // allow floating animations to settle
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "showcase_login_split_screen.png") });

  console.log("Logging into Admin portal...");
  await page.fill('input[type="email"]', "admin@hiradental.com");
  await page.fill('input[type="password"]', "AdminTest123!");
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(2000);

  console.log("2. Capturing Staff Accounts with Pagination...");
  await page.goto("http://localhost:3000/admin/users", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "showcase_staff_users_pagination.png"), fullPage: true });

  console.log("3. Capturing Settings Theming with Live Preview...");
  await page.goto("http://localhost:3000/admin/settings", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  // Click Appearance & Theming tab
  const appearanceBtn = page.locator('button:has-text("Appearance & Theming")');
  if (await appearanceBtn.count() > 0) {
    await appearanceBtn.first().click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "showcase_settings_theming_preview.png"), fullPage: true });

  console.log("4. Capturing Team Page Tab 3 Contrast & Overhauled Modal...");
  await page.goto("http://localhost:3000/admin/team", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Click on a clinician card to see 5 tabs
  const clinicianCards = page.locator('.group\\/card');
  if (await clinicianCards.count() > 0) {
    // Click edit on the first clinician
    const editBtn = page.locator('button:has-text("Edit / Assign")').first();
    if (await editBtn.count() > 0) {
      await editBtn.click();
      await page.waitForTimeout(1000);
      // Click Tab 3
      const tab3 = page.locator('button:has-text("3. Authorized Services")');
      if (await tab3.count() > 0) {
        await tab3.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, "showcase_team_tab3_high_contrast.png") });
      }
    }
  }

  // Back to team list and open Add Team Member Modal
  await page.goto("http://localhost:3000/admin/team", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const addClinicianBtn = page.locator('button:has-text("Add Clinician")');
  if (await addClinicianBtn.count() > 0) {
    await addClinicianBtn.first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "showcase_team_add_modal_overhauled.png") });
  }

  console.log("All showcase screenshots captured successfully.");
  await browser.close();
}

main().catch((err) => {
  console.error("Error capturing showcase screenshots:", err);
  process.exit(1);
});
