import { chromium } from "playwright";
import path from "path";

const outDir = path.resolve("../docs/screenshots/verification");

async function run() {
  const browser = await chromium.launch({ headless: true });

  for (const width of [1024, 1366, 1440, 1920]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    console.log(`Loading http://127.0.0.1:3000 at ${width}px...`);
    await page.goto("http://127.0.0.1:3000", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);

    const teamEl = await page.$("#team");
    if (teamEl) {
      await page.evaluate(() => {
        document.getElementById("team")?.scrollIntoView({ behavior: "instant" });
      });
      await page.waitForTimeout(1500);
      const teamShotPath = path.join(outDir, `desktop_${width}_our_team_3d.png`);
      await teamEl.screenshot({ path: teamShotPath });
      console.log(`[desktop_${width}] Saved team 3D screenshot: ${teamShotPath}`);
    } else {
      console.log(`[desktop_${width}] #team element not found`);
    }
    await context.close();
  }

  await browser.close();
  console.log("Team 3D carousel capture complete!");
}

run().catch((err) => {
  console.error("Team capture error:", err);
  process.exit(1);
});
