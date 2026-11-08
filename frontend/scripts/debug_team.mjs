import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = "C:/Users/Dell5420/.gemini/antigravity/brain/f837e7d0-9c58-4e07-bb24-050493a3a25b/screenshots";

async function debugTeam() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "admin@hiradental.com");
  await page.fill('input[type="password"]', "AdminTest123!");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  await page.goto("http://localhost:3000/admin/team", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  console.log("Current URL:", page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "debug_team_current_view.png"), fullPage: true });

  const bodyText = await page.textContent("body");
  console.log("Body snippet:", bodyText.slice(0, 300));
  await browser.close();
}

debugTeam();

