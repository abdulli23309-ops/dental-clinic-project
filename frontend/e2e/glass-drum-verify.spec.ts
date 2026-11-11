import { test, expect } from "@playwright/test";
import path from "path";

// Reproduce the user's localhost:3000 environment across reduced-motion and
// viewport combinations, and assert zero hydration/dev-overlay issues.
const REDUCED_MOTION_MODES: Array<"reduce" | "no-preference"> = [
  "reduce",
  "no-preference",
];

const VIEWPORTS = [
  { width: 1920, height: 1008, name: "1920x1008" },
  { width: 1440, height: 900, name: "1440x900" },
];

const PAGES = [
  { name: "Team All", anchor: "#team", filter: null },
  { name: "Services All", anchor: "#treatments", filter: "all" },
  { name: "Services Restorative", anchor: "#treatments", filter: "restorative" },
];

for (const motion of REDUCED_MOTION_MODES) {
  for (const vp of VIEWPORTS) {
    for (const pageConf of PAGES) {
      test(`[${motion}] ${pageConf.name} @ ${vp.name}`, async ({ page }) => {
        const consoleErrors: string[] = [];
        const hydrationWarnings: string[] = [];
        const devOverlayIssues: string[] = [];

        page.on("console", (msg) => {
          const text = msg.text();
          if (msg.type() === "error" || msg.type() === "warning") {
            consoleErrors.push(`${msg.type()}: ${text}`);
          }
          if (/hydrat/i.test(text)) {
            hydrationWarnings.push(text);
          }
        });

        page.on("pageerror", (err) => {
          // Ignore clipboard permission quirks (location "Copy" buttons) — not
          // a hydration or dev-overlay rendering problem.
          if (!/clipboard|writeText|Clipboard/i.test(err.message)) {
            devOverlayIssues.push(err.message);
          }
        });

        await page.setViewportSize({ width: vp.width, height: vp.height });

        await page.emulateMedia({ reducedMotion: motion });

        await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
        await page.waitForTimeout(1500);

        // Filter to Restorative if requested.
        if (pageConf.filter) {
          const pill = page.getByRole("button", {
            name: new RegExp(pageConf.filter, "i"),
          });
          if ((await pill.count()) > 0) {
            await pill.first().click();
            await page.waitForTimeout(800);
          }
        }

        const section = page.locator(pageConf.anchor);
        await expect(section).toBeVisible({ timeout: 15000 });
        await section.scrollIntoViewIfNeeded();
        await page.waitForTimeout(800);

        const safeName = `${motion}_${vp.name}_${pageConf.name.replace(/\s+/g, "_")}`;
        await section.screenshot({
          path: path.resolve(
            __dirname,
            "..",
            "_scratch",
            "shots",
            `verify_${safeName}.png`
          ),
          fullPage: false,
        });

        // Assertions: hydration & dev overlay must be clean.
        expect(
          hydrationWarnings,
          `hydration warnings for ${safeName}`
        ).toEqual([]);
        expect(devOverlayIssues, `dev overlay issues for ${safeName}`).toEqual([]);
        expect(
          consoleErrors.filter((e) => /hydrat/i.test(e)),
          `console hydration errors for ${safeName}`
        ).toEqual([]);

        // Side-card presence: more than one card must render in the carousel.
        const cards = section.locator("[data-carousel-index], .gd-card");
        const count = await cards.count();
        expect(count).toBeGreaterThan(
          1,
          `expected multiple carousel cards for ${safeName}, got ${count}`
        );
      });
    }
  }
}