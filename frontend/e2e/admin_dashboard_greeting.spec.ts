import { test, expect } from "@playwright/test";
import path from "path";

test("captures admin dashboard greeting showing admin full name", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Log in as admin
  await page.goto("/login");
  await page.fill("#login-email", "admin@marlowdental.com");
  await page.fill(
    "#login-password",
    process.env.ADMIN_PASSWORD ||
      process.env.DEMO_ADMIN_PASSWORD ||
      "AdminDemoPass2026!"
  );
  await page.click("button[type='submit']");
  await page.waitForURL("**/admin", { timeout: 15000 });
  await page.waitForLoadState("networkidle");

  // Verify the greeting contains Dr. Sarah Marlow
  const heading = page.locator("h1");
  await expect(heading).toContainText("Welcome back, Dr. Sarah Marlow", { timeout: 10000 });

  const shotPath = path.resolve(process.cwd(), "..", "_scratch", "shots", "admin-dashboard-greeting.png");
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log("Screenshot saved to:", shotPath);
});
