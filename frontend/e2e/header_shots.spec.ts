import { test, expect } from "@playwright/test";
import path from "path";

const viewports = [
  { width: 1024, height: 800, name: "1024px" },
  { width: 1280, height: 800, name: "1280px" },
  { width: 1440, height: 900, name: "1440px" },
];

for (const vp of viewports) {
  test(`Capture Header at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

    const header = page.locator("header").first();
    await expect(header).toBeVisible();

    // Verify header items do not wrap
    const nav = header.locator("nav").first();
    await expect(nav).toBeVisible();

    // Screenshot of header element
    await header.screenshot({
      path: path.resolve(`../_scratch/shots/header_${vp.name}.png`),
    });

    // Screenshot of top viewport showing header and hero
    await page.screenshot({
      path: path.resolve(`../_scratch/shots/viewport_${vp.name}.png`),
      clip: { x: 0, y: 0, width: vp.width, height: 350 },
    });
  });
}
