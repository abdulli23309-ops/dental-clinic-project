import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const outDir = path.resolve(process.cwd(), "docs/screenshots/verification");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: "desktop_1024_nav", width: 1024, height: 768 },
    { name: "desktop_1100_nav", width: 1100, height: 768 },
    { name: "desktop_1280_nav", width: 1280, height: 800 },
    { name: "desktop_1366_nav", width: 1366, height: 768 },
    { name: "desktop_1440_nav", width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    console.log(`Loading http://127.0.0.1:3000 at ${vp.width}px...`);
    await page.goto("http://127.0.0.1:3000", { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(1500);

    const header = await page.$("header");
    if (header) {
      const shotPath = path.join(outDir, `${vp.name}.png`);
      await header.screenshot({ path: shotPath });
      console.log(`Saved ${vp.name}.png`);
    }

    const fullAboveFoldPath = path.join(outDir, `${vp.name}_above_fold.png`);
    await page.screenshot({ path: fullAboveFoldPath, clip: { x: 0, y: 0, width: vp.width, height: 400 } });
    console.log(`Saved ${vp.name}_above_fold.png`);

    await page.close();
  }

  // Capture referral card preview
  const refPage = await browser.newPage({ viewport: { width: 1200, height: 1200 } });
  console.log("Loading http://127.0.0.1:3000/referral-preview...");
  await refPage.goto("http://127.0.0.1:3000/referral-preview", { waitUntil: "domcontentloaded", timeout: 20000 });
  await refPage.waitForTimeout(1000);
  const refPath = path.join(outDir, "referral_card_states.png");
  await refPage.screenshot({ path: refPath, fullPage: true });
  console.log("Saved referral_card_states.png");
  await refPage.close();

  await browser.close();
  console.log("All screenshots captured successfully!");
}

run().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});

