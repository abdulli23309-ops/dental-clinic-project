import { test, expect } from "@playwright/test";
import path from "path";

test("Capture header in dark mode at 1440px", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

  // Switch to dark mode
  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("marlow_theme", "dark");
  });
  await page.waitForTimeout(600);

  const header = page.locator("header").first();
  await expect(header).toBeVisible();

  const outPath = path.resolve("../_scratch/shots/header_dark_final.png");
  await header.screenshot({ path: outPath });
});
