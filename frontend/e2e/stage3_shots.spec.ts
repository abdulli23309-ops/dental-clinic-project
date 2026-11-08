import { test } from "@playwright/test";
import path from "path";

const viewports = [
  { width: 1440, height: 900, name: "1440px" },
  { width: 375, height: 812, name: "375px" },
];

for (const vp of viewports) {
  test(`Capture Stage 3 screenshots at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    // Full page
    await page.screenshot({
      path: path.resolve(`../_scratch/shots/stage3_full_${vp.name}.png`),
      fullPage: true,
    });

    // Hero Section
    const hero = page.locator("section").first();
    if (await hero.count() > 0) {
      await hero.screenshot({
        path: path.resolve(`../_scratch/shots/stage3_hero_${vp.name}.png`),
      });
    }

    // Treatments Section
    const treatments = page.locator("#treatments");
    if (await treatments.count() > 0) {
      await treatments.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await treatments.screenshot({
        path: path.resolve(`../_scratch/shots/stage3_treatments_${vp.name}.png`),
      });
    }

    // Gallery Section
    const gallery = page.locator("#gallery");
    if (await gallery.count() > 0) {
      await gallery.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await gallery.screenshot({
        path: path.resolve(`../_scratch/shots/stage3_gallery_${vp.name}.png`),
      });
    }
  });
}
