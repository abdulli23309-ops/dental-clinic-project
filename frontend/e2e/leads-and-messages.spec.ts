import { test, expect, Page } from "@playwright/test";

const RECEPTIONIST_EMAIL = "receptionist@marlowdental.com";
const RECEPTIONIST_PASSWORD =
  process.env.RECEPTIONIST_PASSWORD ||
  process.env.DEMO_RECEPTIONIST_PASSWORD ||
  "RecepDemoPass2026!";

async function loginAsReceptionist(page: Page) {
  await page.goto("/login");
  await page.fill("#login-email", RECEPTIONIST_EMAIL);
  await page.fill("#login-password", RECEPTIONIST_PASSWORD);
  await page.click("button[type='submit']");
  await page.waitForURL("**/reception**", { timeout: 15000 });
}

test.describe("Leads & Messages Management E2E", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => {
      console.error(`Page error: ${err.message}`);
    });
  });

  test("Reception Leads page: status tabs, timeline drawer, and manual status modal", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await loginAsReceptionist(page);

    // Navigate to /reception/leads
    await page.goto("/reception/leads");
    await expect(page.locator("h1:has-text('Leads Management')")).toBeVisible({ timeout: 15000 });

    // Verify all status tabs exist
    const tabs = ["all", "unconverted", "converted", "patient", "cold", "failed_conversion", "archived"];
    for (const tab of tabs) {
      const tabBtn = page.locator(`button[data-testid="tab-${tab}"]`);
      await expect(tabBtn).toBeVisible();
    }

    // Switch tabs
    await page.locator(`button[data-testid="tab-unconverted"]`).click();
    await page.waitForTimeout(300);
    await page.locator(`button[data-testid="tab-all"]`).click();
    await page.waitForTimeout(300);

    // If leads table has rows, test timeline drawer and status change modal
    const firstTimelineBtn = page.locator("button:has-text('Timeline')").first();
    if (await firstTimelineBtn.isVisible()) {
      await firstTimelineBtn.click();
      await expect(page.locator("h2:has-text('Lead Activity Timeline')")).toBeVisible();
      // Close timeline modal
      const closeBtn = page.locator("button:has-text('Close')").first();
      await closeBtn.click();
      await expect(page.locator("h2:has-text('Lead Activity Timeline')")).not.toBeVisible();
    }

    // Check manual status change modal
    const firstStatusBtn = page.locator("button:has-text('Change')").first();
    if (await firstStatusBtn.isVisible()) {
      await firstStatusBtn.click();
      await expect(page.locator("h2:has-text('Update Lead Status')")).toBeVisible();
      const reasonInput = page.locator("#audit-reason-input");
      await expect(reasonInput).toBeVisible();
      // Close modal
      const cancelBtn = page.locator("button:has-text('Cancel')").first();
      await cancelBtn.click();
      await expect(page.locator("h2:has-text('Update Lead Status')")).not.toBeVisible();
    }
  });

  test("Reception Messages page: conversation view, honest simulation labels, and inbound note logging", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await loginAsReceptionist(page);

    // Navigate to /reception/messages
    await page.goto("/reception/messages");
    await expect(page.locator("h1:has-text('Patient & Lead Conversations')")).toBeVisible({ timeout: 15000 });

    // Verify honest simulation notice banner
    await expect(page.locator("text=Simulated Delivery Mode")).toBeVisible();

    // Verify conversations thread panel is rendered
    await expect(page.locator("h2:has-text('Conversations')")).toBeVisible();

    // Check if threads exist
    const conversationItems = page.locator("[data-testid^='thread-']");
    const count = await conversationItems.count();

    if (count > 0) {
      // Click first thread
      await conversationItems.first().click();
      await page.waitForTimeout(400);

      // Verify conversation header and Call Desk link
      await expect(page.locator("a:has-text('Call Desk')").first()).toBeVisible();

      // Verify honest delivery status label is displayed on messages
      const simBadges = page.locator("text=Simulated (Not Delivered)");
      if ((await simBadges.count()) > 0) {
        await expect(simBadges.first()).toBeVisible();
      }

      // Test "Log Inbound Note"
      const noteInput = page.locator("input[placeholder*='e.g., Patient called directly']");
      if (await noteInput.isVisible()) {
        await noteInput.fill("E2E Test Note: Patient contacted desk inquiring about consultation");
        const logBtn = page.locator("button:has-text('Log Note')");
        await logBtn.click();
        await page.waitForTimeout(600);
        // Note should clear on success
        await expect(noteInput).toHaveValue("");
      }
    }
  });
});
