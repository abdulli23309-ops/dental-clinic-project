import { chromium } from "playwright";

async function check() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "admin@hiradental.com");
  await page.fill('input[type="password"]', "AdminTest123!");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log("URL after login:", page.url());
  const errorText = await page.locator(".text-rose-800, [role='alert']").textContent().catch(() => null);
  console.log("Error text on page:", errorText);
  await browser.close();
}

check();

