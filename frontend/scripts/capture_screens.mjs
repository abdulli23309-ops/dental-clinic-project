import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const outDir = path.resolve("../docs/screenshots/verification");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const viewports = [
  { name: "mobile_360", width: 360, height: 780 },
  { name: "mobile_390", width: 390, height: 844 },
  { name: "tablet_768", width: 768, height: 1024 },
  { name: "desktop_1024", width: 1024, height: 768 },
  { name: "laptop_1366", width: 1366, height: 768 },
  { name: "desktop_1440", width: 1440, height: 900 },
  { name: "desktop_1920", width: 1920, height: 1080 },
];

async function run() {
  const browser = await chromium.launch({ headless: true });

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    console.log(`Navigating to http://localhost:3000 at ${vp.width}x${vp.height}...`);
    try {
      await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 20000 });
    } catch {
      await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 15000 });
    }

    await page.waitForTimeout(2000);

    // Check announcement region
    const marquee = await page.$('aside[aria-label="Practice Announcements"], [role="region"][aria-label="Practice Announcements"]');
    console.log(`[${vp.name}] Marquee region present:`, !!marquee);

    // First viewport shot
    const shotPath = path.join(outDir, `${vp.name}_above_fold.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`[${vp.name}] Saved: ${shotPath}`);

    // If mobile, check phone text
    if (vp.width <= 430) {
      const callBtnText = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('a, button'));
        const callBtn = btns.find(b => b.textContent && b.textContent.includes('Call'));
        return callBtn ? callBtn.textContent.trim().replace(/\s+/g, ' ') : 'NOT_FOUND';
      });
      console.log(`[${vp.name}] Call button text: "${callBtnText}"`);
    }

    await context.close();
  }

  await browser.close();
  console.log("All viewport screenshots captured successfully!");
}

run().catch(err => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});

