import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/Dell5420/.gemini/antigravity/brain/51de2466-5bd8-48da-825d-78b5a31b2a57/screenshots";
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  // 1. Desktop Viewport
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const desktopPage = await desktopContext.newPage();

  console.log("1. Capturing Public Homepage...");
  await desktopPage.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await desktopPage.waitForTimeout(1000);
  await desktopPage.screenshot({ path: path.join(ARTIFACT_DIR, "public_homepage_branding.png") });
  console.log("Captured public_homepage_branding.png");

  console.log("2. Capturing Login Page...");
  await desktopPage.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await desktopPage.waitForTimeout(1000);
  await desktopPage.screenshot({ path: path.join(ARTIFACT_DIR, "login_page_branding.png") });
  console.log("Captured login_page_branding.png");

  console.log("3. Logging in as Admin...");
  await desktopPage.fill('input[type="email"]', "admin@hiradental.com");
  await desktopPage.fill('input[type="password"]', "AdminTest123!");
  await desktopPage.click('button[type="submit"]');
  await desktopPage.waitForURL("**/admin**", { timeout: 15000 });
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({ path: path.join(ARTIFACT_DIR, "admin_dashboard_branding.png") });
  console.log("Captured admin_dashboard_branding.png");

  await desktopContext.close();

  // 2. Mobile Viewport
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  console.log("4. Capturing Mobile Login...");
  await mobilePage.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, "mobile_login_branding.png") });
  console.log("Captured mobile_login_branding.png");

  await mobileContext.close();
  await browser.close();
  console.log("All screenshots captured successfully!");
}

main().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});

