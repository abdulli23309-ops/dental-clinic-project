import { test } from "@playwright/test";
import path from "path";

test("Capture header at 1440px without tagline", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const header = page.locator("header");
  await header.screenshot({
    path: path.resolve("../_scratch/shots/header_no_tagline.png"),
  });
});
