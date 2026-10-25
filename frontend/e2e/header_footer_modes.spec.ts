import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Header and Footer Light and Dark Mode Screenshots", () => {
  test("Capture Header and Footer at 1440px in light mode and dark mode", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Light mode
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("marlow_theme", "light");
    });
    await page.waitForTimeout(500);

    const header = page.locator("header").first();
    await expect(header).toBeVisible();
    await header.screenshot({
      path: path.resolve("../_scratch/shots/header_1440px_light.png"),
    });

    const footer = page.locator("footer").first();
    await expect(footer).toBeVisible();
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await footer.screenshot({
      path: path.resolve("../_scratch/shots/footer_1440px_light.png"),
    });

    // 2. Dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      localStorage.setItem("marlow_theme", "dark");
    });
    await page.waitForTimeout(500);

    await header.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await header.screenshot({
      path: path.resolve("../_scratch/shots/header_1440px_dark.png"),
    });

    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await footer.screenshot({
      path: path.resolve("../_scratch/shots/footer_1440px_dark.png"),
    });
  });
});
