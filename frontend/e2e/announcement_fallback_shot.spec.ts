import { test, expect } from "@playwright/test";
import path from "path";

test("captures public homepage at 1440px showing announcement bar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const shotPath = path.resolve(process.cwd(), "..", "_scratch", "shots", "announcement-fallback.png");
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log("Screenshot saved to:", shotPath);
});
