import { test, expect } from "@playwright/test";
import path from "path";

const viewports = [
  { width: 1440, height: 900, name: "1440px" },
  { width: 375, height: 812, name: "375px" },
];

for (const vp of viewports) {
  test(`Capture Header, Treatments, and Footer at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

    // 1. Header Screenshot
    const header = page.locator("header").first();
    await expect(header).toBeVisible();
    await header.screenshot({
      path: path.resolve(`../_scratch/shots/header_${vp.name}.png`),
    });

    // 2. Treatments Section Screenshot
    const treatments = page.locator("#treatments").first();
    await expect(treatments).toBeVisible();
    await treatments.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await treatments.screenshot({
      path: path.resolve(`../_scratch/shots/treatments_${vp.name}.png`),
    });

    // 3. Footer Section Screenshot
    const footer = page.locator("footer").first();
    await expect(footer).toBeVisible();
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await footer.screenshot({
      path: path.resolve(`../_scratch/shots/footer_${vp.name}.png`),
    });
  });
}
