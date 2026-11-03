import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = "C:/Users/Dell5420/.gemini/antigravity/brain/f837e7d0-9c58-4e07-bb24-050493a3a25b/screenshots";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to login...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "admin@hiradental.com");
  await page.fill('input[type="password"]', "AdminTest123!");
  await page.click('button[type="submit"]');

  console.log("Waiting for /admin dashboard...");
  await page.waitForURL("**/admin", { timeout: 15000 });
  await page.waitForTimeout(2000);

  console.log("Navigating to /admin/team via sidebar link...");
  await page.click('a[href="/admin/team"]');
  await page.waitForURL("**/admin/team**");
  await page.waitForTimeout(2000);

  // 1. Open Add Team Member Modal
  console.log("Opening Add Team Member modal...");
  const addBtn = page.getByRole("button", { name: /Add Clinician/i }).first();
  await addBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "showcase_team_add_modal_overhauled.png") });

  // Close modal
  console.log("Closing modal...");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);

  // 2. Click Manage Clinician and inspect Tab 3 contrast
  console.log("Clicking Manage Clinician on first card...");
  const manageBtn = page.getByRole("button", { name: /Manage Clinician/i }).first();
  await manageBtn.click();
  await page.waitForTimeout(1000);

  // Click Tab 3: Authorized Services
  console.log("Clicking Tab 3: Authorized Services...");
  const tab3 = page.getByRole("button", { name: /3\. Authorized Services/i });
  await tab3.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "showcase_team_tab3_high_contrast.png") });

  console.log("Team showcase captured successfully.");
  await browser.close();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
