import { test } from "@playwright/test";
import path from "path";

test("Capture Team section at 1440px", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const teamSection = page.locator("#team");
  if ((await teamSection.count()) > 0) {
    await teamSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await teamSection.screenshot({
      path: path.resolve("../_scratch/shots/team_carousel_1440px.png"),
    });
  } else {
    await page.screenshot({
      path: path.resolve("../_scratch/shots/team_carousel_1440px.png"),
      fullPage: true,
    });
  }
});

test("Capture Team section at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const teamSection = page.locator("#team");
  if ((await teamSection.count()) > 0) {
    await teamSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await teamSection.screenshot({
      path: path.resolve("../_scratch/shots/team_carousel_375px.png"),
    });
  } else {
    await page.screenshot({
      path: path.resolve("../_scratch/shots/team_carousel_375px.png"),
      fullPage: true,
    });
  }
});
