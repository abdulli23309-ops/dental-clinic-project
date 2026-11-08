import { test } from "@playwright/test";
import path from "path";

test("Capture hero section at 1440px", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Screenshot of top of the homepage including the Hero section
  await page.screenshot({
    path: path.resolve("../_scratch/shots/hero_1440px.png"),
  });
});
