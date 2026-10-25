import { test } from "@playwright/test";
import path from "path";

const viewports = [
  { width: 375, height: 812, name: "375px" },
  { width: 768, height: 1024, name: "768px" },
  { width: 1440, height: 900, name: "1440px" },
];

for (const vp of viewports) {
  test(`Capture before screenshot at ${vp.name} light and dark`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    // 1. Light Mode
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("marlow_theme_preference", "light");
    });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.resolve(`../_scratch/shots/before_${vp.name}_light.png`),
      fullPage: true,
    });

    // 2. Dark Mode
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("marlow_theme_preference", "dark");
    });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.resolve(`../_scratch/shots/before_${vp.name}_dark.png`),
      fullPage: true,
    });
  });
}
