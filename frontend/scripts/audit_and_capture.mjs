import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const outDir = path.resolve("../docs/screenshots/verification");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const mobileViewports = [
  { name: "mobile_320", width: 320, height: 640 },
  { name: "mobile_360", width: 360, height: 780 },
  { name: "mobile_375", width: 375, height: 812 },
  { name: "mobile_390", width: 390, height: 844 },
  { name: "mobile_412", width: 412, height: 915 },
  { name: "mobile_430", width: 430, height: 932 },
];

const desktopViewports = [
  { name: "tablet_768", width: 768, height: 1024 },
  { name: "desktop_1024", width: 1024, height: 768 },
  { name: "laptop_1366", width: 1366, height: 768 },
  { name: "desktop_1440", width: 1440, height: 900 },
  { name: "desktop_1920", width: 1920, height: 1080 },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const auditReport = [];

  console.log("=== STARTING AUDIT ON STANDALONE PRODUCTION SERVER ===");

  // --- MOBILE AUDITS ---
  for (const vp of mobileViewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    await page.goto("http://127.0.0.1:3000", { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(1000);

    // 1. Phone number test
    const phoneData = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button, a"));
      const callBtn = btns.find((b) => b.textContent && b.textContent.includes("Call"));
      const copyBtn = btns.find((b) => b.getAttribute("aria-label")?.includes("Copy"));
      return {
        callText: callBtn ? callBtn.textContent.trim().replace(/\s+/g, " ") : "NOT_FOUND",
        hasCopy: !!copyBtn,
        copyLabel: copyBtn ? copyBtn.getAttribute("aria-label") : "",
      };
    });

    // 2. Horizontal overflow check
    const overflow = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      return {
        hasOverflow: docW > winW,
        scrollWidth: docW,
        viewportWidth: winW,
      };
    });

    // 3. Hero arch image in first viewport test
    const heroImagePos = await page.evaluate(() => {
      // Find mobile arch image
      const imgs = Array.from(document.querySelectorAll("img"));
      const heroArchImg = imgs.find((img) => img.src && (img.src.includes("unsplash") || img.src.includes("media")));
      if (!heroArchImg) return { found: false, top: -1, inFirstViewport: false };
      const rect = heroArchImg.getBoundingClientRect();
      return {
        found: true,
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        height: Math.round(rect.height),
        inFirstViewport: rect.top < window.innerHeight,
        viewportHeight: window.innerHeight,
      };
    });

    // 4. Marquee presence
    const marqueePresent = await page.evaluate(() => {
      const el = document.querySelector('aside[aria-label="Practice Announcements"], [role="region"][aria-label="Practice Announcements"]');
      return !!el;
    });

    // Capture first viewport screenshot
    const shotPath = path.join(outDir, `${vp.name}_above_fold.png`);
    await page.screenshot({ path: shotPath, fullPage: false });

    // Capture Dark Mode shot on 390px
    if (vp.width === 390) {
      await page.evaluate(() => {
        document.documentElement.setAttribute("data-theme", "dark");
        document.documentElement.classList.add("dark");
      });
      await page.waitForTimeout(500);
      const darkShotPath = path.join(outDir, `${vp.name}_dark_mode.png`);
      await page.screenshot({ path: darkShotPath, fullPage: false });
      console.log(`[${vp.name}] Dark Mode screenshot saved: ${darkShotPath}`);
    }

    const result = {
      viewport: `${vp.width}x${vp.height} (${vp.name})`,
      phoneText: phoneData.callText,
      phoneVisibleComplete: phoneData.callText.includes("051-6102977") && !phoneData.callText.includes("..."),
      hasCopyButton: phoneData.hasCopy,
      horizontalOverflow: overflow.hasOverflow ? `FAIL (${overflow.scrollWidth}px > ${overflow.viewportWidth}px)` : "PASS (No overflow)",
      archImageInFirstViewport: heroImagePos.inFirstViewport ? `PASS (top at ${heroImagePos.top}px < ${heroImagePos.viewportHeight}px)` : `FAIL (top at ${heroImagePos.top}px)`,
      marqueePresent: marqueePresent ? "PASS (Present)" : "EMPTY/ABSENT",
      screenshot: shotPath,
    };
    auditReport.push(result);
    console.log(`Audited ${vp.name}:`, JSON.stringify(result, null, 2));

    await context.close();
  }

  // --- DESKTOP AUDITS & REGRESSION VISUAL COMPARISONS ---
  console.log("\n=== AUDITING DESKTOP VIEWPORTS (1024, 1366, 1440, 1920) ===");
  for (const vp of desktopViewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    await page.goto("http://127.0.0.1:3000", { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(1000);

    // Desktop Marquee Check
    const desktopMarquee = await page.evaluate(() => {
      const el = document.querySelector('aside[aria-label="Practice Announcements"], [role="region"][aria-label="Practice Announcements"]');
      if (!el) return { present: false, textLength: 0 };
      const tracks = el.querySelectorAll(".animate-marquee");
      return {
        present: true,
        tracksCount: tracks.length,
        hasText: el.textContent.trim().length > 0,
        textPreview: el.textContent.trim().slice(0, 80),
      };
    });

    // Capture Desktop Above-The-Fold
    const shotPath = path.join(outDir, `${vp.name}_above_fold.png`);
    await page.screenshot({ path: shotPath, fullPage: false });

    // Capture Desktop "Our Team" 3D Carousel Section
    const teamSection = await page.$("#team");
    let teamShotPath = null;
    if (teamSection) {
      await page.evaluate(() => {
        const el = document.getElementById("team");
        if (el) el.scrollIntoView({ behavior: "instant" });
      });
      await page.waitForTimeout(800);
      teamShotPath = path.join(outDir, `${vp.name}_our_team_3d.png`);
      await teamSection.screenshot({ path: teamShotPath });
    }

    // Capture Dark Mode on 1440px
    if (vp.width === 1440) {
      await page.evaluate(() => {
        document.documentElement.setAttribute("data-theme", "dark");
        document.documentElement.classList.add("dark");
      });
      await page.waitForTimeout(500);
      const darkShotPath = path.join(outDir, `${vp.name}_dark_mode.png`);
      await page.screenshot({ path: darkShotPath, fullPage: false });
      console.log(`[${vp.name}] Desktop Dark Mode screenshot saved: ${darkShotPath}`);
    }

    const dResult = {
      viewport: `${vp.width}x${vp.height} (${vp.name})`,
      marqueePresent: desktopMarquee.present && desktopMarquee.hasText ? `PASS (${desktopMarquee.tracksCount} tracks, text: "${desktopMarquee.textPreview}")` : "FAIL",
      heroScreenshot: shotPath,
      teamScreenshot: teamShotPath || "N/A",
    };
    auditReport.push(dResult);
    console.log(`Audited ${vp.name}:`, JSON.stringify(dResult, null, 2));

    await context.close();
  }

  await browser.close();

  // Save JSON summary
  fs.writeFileSync(path.join(outDir, "audit_summary.json"), JSON.stringify(auditReport, null, 2), "utf-8");
  console.log("\n=== AUDIT COMPLETE. SUMMARY WRITTEN TO audit_summary.json ===");
}

run().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});

