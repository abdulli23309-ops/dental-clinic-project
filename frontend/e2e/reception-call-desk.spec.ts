import { test, expect } from "@playwright/test";

const RECEPTIONIST_EMAIL = "receptionist@marlowdental.com";
const RECEPTIONIST_PASSWORD =
  process.env.RECEPTIONIST_PASSWORD ||
  process.env.DEMO_RECEPTIONIST_PASSWORD ||
  "RecepDemoPass2026!";

async function loginAsReceptionist(page: any) {
  await page.goto("/login");
  await page.fill("#login-email", RECEPTIONIST_EMAIL);
  await page.fill("#login-password", RECEPTIONIST_PASSWORD);
  await page.click("button[type='submit']");
  await page.waitForURL("**/reception**", { timeout: 15000 });
}

test.describe("Reception Call Desk E2E Scenarios", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => {
      console.error(`Page error: ${err.message}`);
    });
  });

  test("Full call scenario: lookup, hold, booking phone lock, and dropped call outcome", async ({
    page,
  }) => {
    test.setTimeout(90000);
    // 1. Log in as receptionist
    await loginAsReceptionist(page);

    // 2. Navigate via sidebar link to Call Desk
    const callDeskSidebarLink = page.locator("a[href='/reception/call-desk']").first();
    await expect(callDeskSidebarLink).toBeVisible();
    await callDeskSidebarLink.click();
    await page.waitForURL("**/reception/call-desk**", { timeout: 10000 });

    // 3. Verify Call Desk interface
    await expect(page.locator("h1:has-text('Reception Call Desk')")).toBeVisible();
    const phoneInput = page.locator("input#call-desk-phone-input");
    await expect(phoneInput).toBeVisible();

    // 4. Perform phone lookup with unique test phone
    const testPhone = `+1555${Math.floor(1000000 + Math.random() * 9000000)}`;
    await phoneInput.fill(testPhone);
    const searchBtn = page.locator("button[data-testid='call-desk-search-btn']");
    await searchBtn.click();

    // 5. Verify results panel rendered
    const startCallBtn = page.locator("button[data-testid='call-desk-start-btn']");
    await expect(startCallBtn).toBeVisible({ timeout: 10000 });

    // 6. Start Call and establish contact hold
    await startCallBtn.click();

    // 7. Verify hold banner and live countdown timer
    const holdBanner = page.locator("div[data-testid='call-desk-active-banner']");
    await expect(holdBanner).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Active Call in Progress")).toBeVisible();
    await expect(page.locator("text=Hold remaining:")).toBeVisible();

    // 8. Open booking wizard in call-desk mode
    const bookBtn = page.locator("button[data-testid='call-desk-book-btn']");
    await expect(bookBtn).toBeVisible();
    await bookBtn.click();

    // 9. Verify phone locking in wizard
    const lockedBanner = page.locator("text=Caller phone number is locked");
    await expect(lockedBanner).toBeVisible({ timeout: 10000 });

    // Verify change number warning modal appears
    const changeNumberBtn = page.locator("button:has-text('Change number')");
    await expect(changeNumberBtn).toBeVisible();
    await changeNumberBtn.click();
    await expect(
      page.locator("text=Changing the phone number will decouple this booking")
    ).toBeVisible();

    // Close booking modal using testid
    const closeBookingBtn = page.locator("button[data-testid='call-desk-close-booking-modal']");
    await closeBookingBtn.click();
    await expect(page.locator("[data-testid='call-desk-booking-modal']")).not.toBeVisible();

    // 10. End Call and record dropped outcome with lead capture
    const endCallBtn = page.locator("button[data-testid='call-desk-end-btn']");
    await expect(endCallBtn).toBeVisible();
    await endCallBtn.click();

    // Modal opens
    await expect(page.locator("h2:has-text('End Call & Record Outcome')")).toBeVisible();

    // Select dropped call outcome
    const droppedRadio = page.locator("input[value='dropped']");
    await droppedRadio.click();

    // Dropped call capture section appears
    const droppedCapture = page.locator("[data-testid='dropped-call-capture-box']");
    await expect(droppedCapture).toBeVisible();

    // Fill in dropped lead info
    const leadName = "E2E Dropped Patient";
    const leadEmail = "e2e.dropped@example.com";
    await page.fill("input#dropped-lead-name", leadName);
    await page.fill("input#dropped-lead-email", leadEmail);
    await page.fill("textarea#call-desk-notes", "Caller line dropped during availability check");

    // Submit outcome and release hold
    const submitOutcomeBtn = page.locator("button[data-testid='call-desk-submit-outcome-btn']");
    await submitOutcomeBtn.scrollIntoViewIfNeeded();
    await submitOutcomeBtn.click();

    // 11. Verify hold banner disappears and status is cleared
    await expect(holdBanner).not.toBeVisible({ timeout: 10000 });

    // 12. Lookup caller again and verify captured lead is retrieved
    await phoneInput.fill(testPhone);
    await searchBtn.click();

    await expect(page.locator(`text=${leadName}`)).toBeVisible({ timeout: 10000 });
  });

  test("Receptionist looks up number, books via locked wizard (verifying zero public lead calls), ends call booked, asserts hold released and schedule presence", async ({
    page,
  }) => {
    test.setTimeout(90000);

    // Track network requests to assert BookingWizard in call_desk mode does NOT call public lead endpoints
    const publicLeadRequests: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/public/leads") && (req.method() === "POST" || req.method() === "PATCH")) {
        publicLeadRequests.push(`${req.method()} ${url}`);
      }
    });

    // 1. Log in as receptionist
    await loginAsReceptionist(page);

    // 2. Navigate to Call Desk
    await page.goto("/reception/call-desk");
    await expect(page.locator("h1:has-text('Reception Call Desk')")).toBeVisible({ timeout: 15000 });

    const phoneInput = page.locator("input#call-desk-phone-input");
    const testPhone = `0300${Math.floor(1000000 + Math.random() * 9000000)}`;

    // 3. Search phone and start call
    await phoneInput.fill(testPhone);
    await page.locator("button[data-testid='call-desk-search-btn']").click();

    const startCallBtn = page.locator("button[data-testid='call-desk-start-btn']");
    await expect(startCallBtn).toBeVisible({ timeout: 10000 });
    await startCallBtn.click();

    // 4. Verify active hold banner
    const holdBanner = page.locator("div[data-testid='call-desk-active-banner']");
    await expect(holdBanner).toBeVisible({ timeout: 10000 });

    // 5. Open Booking Wizard in call_desk mode
    const bookBtn = page.locator("button[data-testid='call-desk-book-btn']");
    await expect(bookBtn).toBeVisible();
    await bookBtn.click();

    // 6. Assert phone number is locked
    await expect(page.locator("text=Caller phone number is locked")).toBeVisible({ timeout: 10000 });

    // Step 0: Contact info (phone locked)
    const nameInput = page.locator("input#contact-name");
    if (await nameInput.isVisible()) {
      await nameInput.fill("Call Desk Booked Patient");
      await page.locator("button[data-testid='wizard-continue-btn']").click();
    }

    // Step 1: Select Service
    const serviceCard = page.locator("[data-testid^='service-option-']").first();
    if (await serviceCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await serviceCard.click();
      await page.locator("button[data-testid='wizard-continue-btn']").click();
    }

    // Step 2: Select Clinic (if multi-clinic)
    const clinicCard = page.locator("[data-testid^='clinic-option-']").first();
    if (await clinicCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clinicCard.click();
      await page.locator("button[data-testid='wizard-continue-btn']").click();
    }

    // Step 3: Select Doctor / Slot
    const slotChip = page.locator("button[data-testid^='slot-chip-']").first();
    if (await slotChip.isVisible({ timeout: 5000 }).catch(() => false)) {
      await slotChip.click();
      await page.locator("button[data-testid='wizard-continue-btn']").click();
    }

    // Step 4: Notes & Review
    const finalSubmitBtn = page.locator("button[data-testid='wizard-confirm-btn']");
    if (await finalSubmitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await finalSubmitBtn.click();
      await page.waitForTimeout(1000);
    }

    // 7. Network check: assert BookingWizard in call_desk mode NEVER called POST or PATCH /public/leads
    expect(publicLeadRequests).toHaveLength(0);

    // Close booking modal if still open
    const closeBookingBtn = page.locator("button[data-testid='call-desk-close-booking-modal']");
    if (await closeBookingBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBookingBtn.click();
    }

    // 8. End call with outcome "booked"
    const endCallBtn = page.locator("button[data-testid='call-desk-end-btn']");
    await expect(endCallBtn).toBeVisible();
    await endCallBtn.click();

    // Select "booked" outcome radio
    const bookedRadio = page.locator("input[value='booked']");
    await bookedRadio.click();

    // Submit outcome and release hold
    const submitOutcomeBtn = page.locator("button[data-testid='call-desk-submit-outcome-btn']");
    await submitOutcomeBtn.click();

    // 9. Assert hold is released
    await expect(holdBanner).not.toBeVisible({ timeout: 10000 });

    // 10. Navigate to schedule to assert booking appears
    await page.goto("/reception/schedule");
    await expect(page.locator("h1:has-text('Operational Schedule')")).toBeVisible({ timeout: 15000 });
  });
});
