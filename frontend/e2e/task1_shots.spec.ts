import { test } from "@playwright/test";
import path from "path";

const viewports = [
  { width: 375, height: 812, name: "375px" },
  { width: 768, height: 1024, name: "768px" },
  { width: 1440, height: 900, name: "1440px" },
];

for (const vp of viewports) {
  test(`Capture Locations and Footer at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

    // 1. Locations Section
    const locationsHeading = page.getByRole("heading", { name: /location|practice|clinic/i }).first();
    const locationsSection = locationsHeading.locator("xpath=ancestor::section").first();
    if (await locationsSection.count() > 0) {
      await locationsSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      await locationsSection.screenshot({
        path: path.resolve(`../_scratch/shots/locations_${vp.name}.png`),
      });
    } else {
      const fallback = page.locator("section:has-text('Weekly Schedule')").first();
      await fallback.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      await fallback.screenshot({
        path: path.resolve(`../_scratch/shots/locations_${vp.name}.png`),
      });
    }

    // 2. Footer Section
    const footer = page.locator("footer").first();
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await footer.screenshot({
      path: path.resolve(`../_scratch/shots/footer_${vp.name}.png`),
    });
  });
}
