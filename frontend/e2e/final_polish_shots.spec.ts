import { test } from "@playwright/test";
import path from "path";

test("Capture Hero and Team section screenshots at 1440px", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // 1. Screenshot Hero section (at top of page)
  await page.screenshot({
    path: path.resolve("../_scratch/shots/hero_1440px.png"),
  });

  // 2. Scroll to Team section (#team) and capture screenshot
  const teamSection = page.locator("#team");
  if (await teamSection.count() > 0) {
    await teamSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await teamSection.screenshot({
      path: path.resolve("../_scratch/shots/team_1440px.png"),
    });
  } else {
    // If #team is not found, take a full page screenshot
    await page.screenshot({
      path: path.resolve("../_scratch/shots/team_1440px.png"),
      fullPage: true,
    });
  }
});
