import { test, expect } from "@playwright/test";
import path from "path";

test("Capture fixed Treatments carousel at 1440px", async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const treatmentsSection = page.locator("#treatments");
  await expect(treatmentsSection).toBeVisible({ timeout: 10000 });
  await treatmentsSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  await treatmentsSection.screenshot({
    path: path.resolve("../_scratch/shots/treatments_fixed.png"),
  });
});
