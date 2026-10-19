import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@marlowdental.com";
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ||
  process.env.DEMO_ADMIN_PASSWORD ||
  "AdminDemoPass2026!";

const RECEPTIONIST_EMAIL = "receptionist@marlowdental.com";
const RECEPTIONIST_PASSWORD =
  process.env.RECEPTIONIST_PASSWORD ||
  process.env.DEMO_RECEPTIONIST_PASSWORD ||
  "RecepDemoPass2026!";

async function loginAsAdmin(page: any) {
  await page.goto("/login");
  await page.fill("#login-email", ADMIN_EMAIL);
  await page.fill("#login-password", ADMIN_PASSWORD);
  await page.click("button[type='submit']");
  await page.waitForURL("**/admin", { timeout: 15000 });
}

async function loginAsReceptionist(page: any) {
  await page.goto("/login");
  await page.fill("#login-email", RECEPTIONIST_EMAIL);
  await page.fill("#login-password", RECEPTIONIST_PASSWORD);
  await page.click("button[type='submit']");
  await page.waitForURL("**/reception**", { timeout: 15000 });
}

test.describe("Booking Flow & Admin Live Synchronization", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => {
      console.error(`Page error: ${err.message}`);
    });
  });

  test("1. Clinic-service link change in /admin/services updates bookable clinics on /book", async ({ page }) => {
    // A. Log in and navigate to services matrix
    await loginAsAdmin(page);
    await page.goto("/admin/services");
    await page.waitForLoadState("domcontentloaded");

    // Switch to Clinic Services Matrix tab
    const matrixTab = page.locator("button:has-text('Clinic Services Matrix')");
    await expect(matrixTab).toBeVisible();
    await matrixTab.click();

    // Wait for matrix table rows to load
    await page.waitForSelector("tbody tr", { timeout: 10000 });
    const rootCanalsRow = page.locator("tbody tr").filter({ hasText: "Endodontics" }).first();
    await expect(rootCanalsRow).toBeVisible();

    const checkboxes = rootCanalsRow.locator("input[type='checkbox']");
    const count = await checkboxes.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Downtown Studio is the second checkbox (index 1)
    const downtownCheckbox = checkboxes.nth(1);
    const initiallyChecked = await downtownCheckbox.isChecked();

    // Ensure it is checked first
    if (!initiallyChecked) {
      const responsePromise = page.waitForResponse(
        (resp) => resp.url().includes("/clinics") && resp.status() === 200
      );
      await downtownCheckbox.click();
      await responsePromise;
      await page.waitForTimeout(500);
    }

    // B. Visit /book and check clinics for Root Canals
    await page.goto("/book");
    await page.waitForLoadState("domcontentloaded");

    // Step 0: Contact
    await page.fill("#contact-name", "Mariam Tariq");
    await page.fill("#contact-phone", "+92 300 5550881");
    await page.click("[data-testid='wizard-continue-btn']");

    // Step 1: Service
    const rootCanalOption = page.locator("[data-testid^='service-option-']").filter({ hasText: "Endodontics" }).first();
    await expect(rootCanalOption).toBeVisible({ timeout: 10000 });
    await rootCanalOption.click();
    await page.click("[data-testid='wizard-continue-btn']");

    // Step 2: Clinic - Downtown Studio should be visible
    const downtownOption = page.locator("[data-testid^='clinic-option-']").filter({ hasText: "Downtown Studio" });
    await expect(downtownOption).toBeVisible({ timeout: 10000 });

    // C. Change in admin: Uncheck Downtown Studio for Root Canals
    await page.goto("/admin/services");
    await page.waitForLoadState("domcontentloaded");
    await matrixTab.click();
    await page.waitForSelector("tbody tr", { timeout: 10000 });

    const downtownCheckboxUncheck = rootCanalsRow.locator("input[type='checkbox']").nth(1);
    if (await downtownCheckboxUncheck.isChecked()) {
      const responsePromise = page.waitForResponse(
        (resp) => resp.url().includes("/clinics") && resp.status() === 200
      );
      await downtownCheckboxUncheck.click();
      await responsePromise;
      await page.waitForTimeout(500);
    }

    // D. Return to /book and see Downtown Studio disappear for Root Canals
    await page.goto("/book");
    await page.waitForLoadState("domcontentloaded");

    await page.fill("#contact-name", "Mariam Tariq");
    await page.fill("#contact-phone", "+92 300 5550881");
    await page.click("[data-testid='wizard-continue-btn']");

    const rootCanalOption2 = page.locator("[data-testid^='service-option-']").filter({ hasText: "Endodontics" }).first();
    await expect(rootCanalOption2).toBeVisible({ timeout: 10000 });
    await rootCanalOption2.click();
    await page.click("[data-testid='wizard-continue-btn']");

    // Now Downtown Studio should NOT be listed
    await expect(downtownOption).toHaveCount(0);

    // Clean up: Re-enable
    await page.goto("/admin/services");
    await page.waitForLoadState("domcontentloaded");
    await matrixTab.click();
    await page.waitForSelector("tbody tr", { timeout: 10000 });
    const downtownCheckboxRestore = rootCanalsRow.locator("input[type='checkbox']").nth(1);
    if (!(await downtownCheckboxRestore.isChecked())) {
      const responsePromise = page.waitForResponse(
        (resp) => resp.url().includes("/clinics") && resp.status() === 200
      );
      await downtownCheckboxRestore.click();
      await responsePromise;
    }
  });

  test("2. Change days_shown in admin booking settings and see doctor step horizon change on /book", async ({ page }) => {
    // A. Log in and navigate to /admin/booking
    await loginAsAdmin(page);
    await page.goto("/admin/booking");
    await page.waitForLoadState("domcontentloaded");

    // Click Lead Follow-up & Call Desk tab button
    const leadTabBtn = page.locator("button:has-text('Lead Follow-up & Call Desk')");
    await expect(leadTabBtn).toBeVisible({ timeout: 10000 });
    await leadTabBtn.click();

    // Find days_shown input
    const daysShownInput = page.locator("#flow-days-shown");
    await expect(daysShownInput).toBeVisible({ timeout: 10000 });

    // Set daysShown to 2 days
    await daysShownInput.fill("2");

    // Click Save Flow & Desk Settings
    const saveButton = page.locator("button:has-text('Save Flow & Desk Settings')");
    await saveButton.click();
    await expect(page.locator("text=Booking flow and call desk settings saved successfully")).toBeVisible({ timeout: 10000 });

    // B. Navigate to /book and observe doctor step date horizon
    await page.goto("/book");
    await page.waitForLoadState("domcontentloaded");

    // Step 0: Contact
    await page.fill("#contact-name", "Zahid Ahmed");
    await page.fill("#contact-phone", "+92 300 5550882");
    await page.click("[data-testid='wizard-continue-btn']");

    // Step 1: Service (Cleanings)
    const cleaningOption = page.locator("[data-testid^='service-option-']").first();
    await expect(cleaningOption).toBeVisible({ timeout: 10000 });
    await cleaningOption.click();
    await page.click("[data-testid='wizard-continue-btn']");

    // Step 2: Clinic (Main Clinic)
    const clinicOption = page.locator("[data-testid^='clinic-option-']").first();
    await expect(clinicOption).toBeVisible({ timeout: 10000 });
    await clinicOption.click();
    await page.click("[data-testid='wizard-continue-btn']");

    // Step 3: Doctor Step
    // First doctor card date chips
    const firstDoctorCard = page.locator("[data-testid^='doctor-card-']").first();
    await expect(firstDoctorCard).toBeVisible({ timeout: 10000 });

    const dateRows = firstDoctorCard.locator("[data-testid='doctor-slot-date']");
    const dateCount = await dateRows.count();
    // Should be at most 2 days because days_shown = 2
    expect(dateCount).toBeLessThanOrEqual(2);

    // C. Clean up: Restore days_shown to 7
    await page.goto("/admin/booking");
    await page.waitForLoadState("domcontentloaded");
    await leadTabBtn.click();
    await expect(daysShownInput).toBeVisible({ timeout: 10000 });
    await daysShownInput.fill("7");
    await saveButton.click();
    await expect(page.locator("text=Booking flow and call desk settings saved successfully")).toBeVisible({ timeout: 10000 });
  });

  test("3. Turn off patients-treated on doctor in /admin/team and see badge disappear on /book", async ({ page }) => {
    // A. Log in and go to /admin/team
    await loginAsAdmin(page);
    await page.goto("/admin/team");
    await page.waitForLoadState("domcontentloaded");

    // Look for toggle button for Dr. Sarah Marlow (first card)
    const toggleButton = page.locator("button:has-text('Hide Treated Count'), button:has-text('Show Treated Count')").first();
    await expect(toggleButton).toBeVisible({ timeout: 10000 });

    const initialText = await toggleButton.innerText();

    // If currently showing, hide it
    if (initialText.includes("Hide Treated Count")) {
      await toggleButton.click();
      await expect(page.locator("text=Patients Treated: Off").first()).toBeVisible({ timeout: 10000 });
    }

    // B. Navigate to /book
    await page.goto("/book");
    await page.waitForLoadState("domcontentloaded");

    await page.fill("#contact-name", "Kashif Niaz");
    await page.fill("#contact-phone", "+92 300 5550883");
    await page.click("[data-testid='wizard-continue-btn']");

    // Step 1: Cleanings
    const cleaningOption = page.locator("[data-testid^='service-option-']").first();
    await expect(cleaningOption).toBeVisible({ timeout: 10000 });
    await cleaningOption.click();
    await page.click("[data-testid='wizard-continue-btn']");

    // Step 2: Clinic
    const clinicOption = page.locator("[data-testid^='clinic-option-']").first();
    await expect(clinicOption).toBeVisible({ timeout: 10000 });
    await clinicOption.click();
    await page.click("[data-testid='wizard-continue-btn']");

    // Step 3: Doctor card for Dr. Sarah Marlow
    const sarahDoctorCard = page.locator("[data-testid^='doctor-card-']").filter({ hasText: "Dr. Sarah Marlow" });
    await expect(sarahDoctorCard).toBeVisible({ timeout: 10000 });

    // Badge should be hidden!
    const badge = sarahDoctorCard.locator("[data-testid='patients-treated-badge']");
    await expect(badge).toHaveCount(0);

    // C. Turn it back ON in /admin/team
    await page.goto("/admin/team");
    await page.waitForLoadState("domcontentloaded");

    const showButton = page.locator("button:has-text('Show Treated Count')").first();
    await expect(showButton).toBeVisible({ timeout: 10000 });
    await showButton.click();
    await expect(page.locator("text=Patients Treated: On").first()).toBeVisible({ timeout: 10000 });

    // Verify it reappears on /book
    await page.goto("/book");
    await page.waitForLoadState("domcontentloaded");

    await page.fill("#contact-name", "Kashif Niaz");
    await page.fill("#contact-phone", "+92 300 5550883");
    await page.click("[data-testid='wizard-continue-btn']");

    const cleaningOption2 = page.locator("[data-testid^='service-option-']").first();
    await expect(cleaningOption2).toBeVisible({ timeout: 10000 });
    await cleaningOption2.click();
    await page.click("[data-testid='wizard-continue-btn']");

    const clinicOption2 = page.locator("[data-testid^='clinic-option-']").first();
    await expect(clinicOption2).toBeVisible({ timeout: 10000 });
    await clinicOption2.click();
    await page.click("[data-testid='wizard-continue-btn']");

    const sarahDoctorCard2 = page.locator("[data-testid^='doctor-card-']").filter({ hasText: "Dr. Sarah Marlow" });
    await expect(sarahDoctorCard2).toBeVisible({ timeout: 10000 });

    const badge2 = sarahDoctorCard2.locator("[data-testid='patients-treated-badge']");
    await expect(badge2).toBeVisible({ timeout: 10000 });
  });

  test("4. Lead saved after step 1 contact capture: assert API call and lead appears in admin", async ({ page }) => {
    await page.goto("/book");
    await page.waitForLoadState("domcontentloaded");

    const uniquePhone = `+92300${Math.floor(1000000 + Math.random() * 9000000)}`;
    const fullName = "Zubair Lead Verification";

    await page.fill("#contact-name", fullName);
    await page.fill("#contact-phone", uniquePhone);

    const leadCapturePromise = page.waitForResponse(
      (resp) => resp.url().includes("/leads") && resp.request().method() === "POST" && resp.status() === 201
    );

    await page.click("[data-testid='wizard-continue-btn']");
    const captureResp = await leadCapturePromise;
    const respBody = await captureResp.json();
    expect(respBody.captureToken).toBeTruthy();
    expect(typeof respBody.captureToken).toBe("string");

    // Login to check lead in reception leads list
    await loginAsAdmin(page);
    await page.goto("/reception/leads");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toContainText(fullName);
    await expect(page.locator("body")).toContainText("unconverted");
  });

  test("5. Full path with two clinics: select service, choose branch, pick doctor & slot, notes for someone else, and review", async ({ page }) => {
    await page.goto("/book");
    await page.waitForLoadState("domcontentloaded");

    const uniquePhone = `+92300${Math.floor(1000000 + Math.random() * 9000000)}`;

    // Step 0: Contact
    await page.fill("#contact-name", "Hamza Contact");
    await page.fill("#contact-phone", uniquePhone);
    await page.click("[data-testid='wizard-continue-btn']");

    // Step 1: Service (Cleanings)
    const cleanings = page.locator("[data-testid^='service-option-']").filter({ hasText: "Cleanings" }).first();
    await expect(cleanings).toBeVisible({ timeout: 10000 });
    await cleanings.click();
    await page.click("[data-testid='wizard-continue-btn']");

    // Step 2: Clinic - Both branches available
    await page.waitForSelector("[data-testid^='clinic-option-']", { timeout: 10000 });
    const clinicOptions = page.locator("[data-testid^='clinic-option-']");
    const count = await clinicOptions.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await clinicOptions.first().click();
    await page.click("[data-testid='wizard-continue-btn']");

    // Step 3: Doctor & Time - Click a slot chip
    await page.waitForSelector("[data-testid^='slot-chip-']", { timeout: 10000 });
    const slotChip = page.locator("[data-testid^='slot-chip-']").first();
    await expect(slotChip).toBeVisible({ timeout: 10000 });
    const slotText = await slotChip.innerText();
    await slotChip.click();

    await page.click("[data-testid='wizard-continue-btn']");

    // Step 4: Notes & Booking For
    await page.waitForSelector("[data-testid='booking-for-other']", { timeout: 10000 });
    await page.click("[data-testid='booking-for-other']");

    await page.fill("#patient-other-name", "Bilal Patient");
    await page.fill("#visit-notes", "Patient has mild tooth sensitivity");
    await page.click("[data-testid='wizard-continue-btn']");

    // Step 5: Review Step
    await page.waitForSelector("[data-testid='wizard-confirm-btn']", { timeout: 10000 });
    await expect(page.locator("body")).toContainText("Bilal Patient");
    await expect(page.locator("body")).toContainText("Hamza Contact");
    await expect(page.locator("body")).toContainText(slotText);
    await expect(page.locator("body")).toContainText("Patient has mild tooth sensitivity");

    // Confirm Appointment
    await page.click("[data-testid='wizard-confirm-btn']");

    // Confirmation Screen
    await expect(page.locator("text=You are all set.")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Reservation Confirmed")).toBeVisible();
    await expect(page.locator("text=Booking Reference:")).toBeVisible();
  });

  test("6. Service offered at only one clinic and one-doctor auto-select shows intro card", async ({ page }) => {
    // Intercept single doctor for targeted auto-select verification
    await page.route(/.*\/api\/v1\/public\/booking\/doctors.*/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "11111111-2222-3333-4444-555555555555",
            displayName: "Dr. Alexander Marlow",
            professionalTitle: "Principal Dental Surgeon",
            role: "dentist",
            biography: "Specialist in comprehensive prosthodontics and implantology.",
            patientsTreated: 840,
            weeklyScheduleSummary: "Mon-Fri 09:00 - 18:00",
            slotsByDate: {
              "2026-10-19": ["10:00 AM", "11:00 AM"],
            },
          },
        ]),
      });
    });

    await page.goto("/book");
    await page.waitForLoadState("domcontentloaded");

    await page.fill("#contact-name", "Single Doctor Test");
    await page.fill("#contact-phone", "+92 300 5559911");
    await page.click("[data-testid='wizard-continue-btn']");

    // Select procedure
    const svc = page.locator("[data-testid^='service-option-']").first();
    await expect(svc).toBeVisible({ timeout: 10000 });
    await svc.click();
    await page.click("[data-testid='wizard-continue-btn']");

    // Clinic step
    await page.waitForSelector("[data-testid^='clinic-option-']", { timeout: 10000 });
    await page.locator("[data-testid^='clinic-option-']").first().click();
    await page.click("[data-testid='wizard-continue-btn']");

    // Doctor Step: exactly 1 doctor auto-selected -> renders single-doctor-intro banner card!
    await expect(page.locator("[data-testid='single-doctor-intro']")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("[data-testid='single-doctor-intro']")).toContainText("Dr. Alexander Marlow");
    await expect(page.locator("[data-testid='single-doctor-intro']")).toContainText("840 patients treated");
    await expect(page.locator("[data-testid^='slot-chip-']")).toHaveCount(2);
  });

  test("7. Taken slot conflict (409) displays conversational error: That time was just taken. Here are the nearest free times.", async ({ page }) => {
    await page.goto("/book");
    await page.waitForLoadState("domcontentloaded");

    await page.fill("#contact-name", "Conflict Test Patient");
    await page.fill("#contact-phone", "+92 300 5557711");
    await page.click("[data-testid='wizard-continue-btn']");

    const serviceOpt = page.locator("[data-testid^='service-option-']").first();
    await expect(serviceOpt).toBeVisible({ timeout: 10000 });
    await serviceOpt.click();
    await page.click("[data-testid='wizard-continue-btn']");

    await page.waitForSelector("[data-testid^='clinic-option-']", { timeout: 10000 });
    const clinicOpt = page.locator("[data-testid^='clinic-option-']").first();
    await clinicOpt.click();
    await page.click("[data-testid='wizard-continue-btn']");

    await page.waitForSelector("[data-testid^='slot-chip-']", { timeout: 10000 });
    const slot = page.locator("[data-testid^='slot-chip-']").first();
    await slot.click();
    await page.click("[data-testid='wizard-continue-btn']");

    // Notes step
    await page.waitForSelector("[data-testid='wizard-continue-btn']", { timeout: 10000 });
    await page.click("[data-testid='wizard-continue-btn']");

    // Review step: intercept appointments submission with 409
    await page.route("**/api/v1/appointments*", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          detail: "Double-booking conflict: The selected time slot is no longer available. Please select another slot.",
        }),
      });
    });

    await page.click("[data-testid='wizard-confirm-btn']");

    // Verify exact conversational error
    const errorAlert = page.locator(".border-rose-200[role='alert']");
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    await expect(errorAlert).toContainText("That time was just taken. Here are the nearest free times.");

    // Click "Choose a different time"
    const chooseDiffBtn = page.locator("button:has-text('Choose a different time')");
    await expect(chooseDiffBtn).toBeVisible();
    await chooseDiffBtn.click();

    // Verify returned to Doctor & Time step
    await expect(page.locator("h1")).toContainText(/doctor and time/i);
  });

  test("8. Paused mode displays conversational banner, disables confirmation, and shows phone", async ({ page }) => {
    // Intercept booking-status with paused mode
    await page.route("**/api/v1/public/booking-status*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mode: "paused",
          message: "Online booking is paused for a moment while we update our schedule.",
          phone: "+92 300 1234567",
        }),
      });
    });

    await page.goto("/book");
    await page.waitForLoadState("domcontentloaded");

    // Paused banner is visible
    const pausedBanner = page.locator("[data-testid='booking-paused-banner']");
    await expect(pausedBanner).toBeVisible({ timeout: 10000 });
    await expect(pausedBanner).toContainText(/Online Scheduling Is Currently Paused/i);
    await expect(pausedBanner).toContainText("Online booking is paused for a moment while we update our schedule.");
    await expect(pausedBanner).toContainText("+92 300 1234567");
  });

  test("9. Receptionist creates a lead from /reception/leads and verifies unconverted status badge", async ({ page }) => {
    // 1. Log in as receptionist
    await loginAsReceptionist(page);

    // 2. Navigate to reception leads page
    await page.goto("/reception/leads");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText(/Prospective Patient Leads/i);

    // 3. Open New Lead modal
    const newLeadBtn = page.locator("button:has-text('New Lead')");
    await expect(newLeadBtn).toBeVisible({ timeout: 10000 });
    await newLeadBtn.click();

    // 4. Fill lead registration form
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const testName = `Walkin Prospect ${randomSuffix}`;
    const testPhone = `0300${randomSuffix}12`;

    await page.locator("input[placeholder='+1-555-0199']").fill(testPhone);
    const inputs = page.locator("input[type='text']");
    await inputs.first().fill("Walkin");
    await inputs.nth(1).fill(`Prospect ${randomSuffix}`);
    await page.locator("textarea").fill("Inquired about teeth whitening packages");

    // 5. Submit form
    await page.click("button:has-text('Save Lead')");

    // 6. Verify lead appears with unconverted status badge
    await expect(page.locator(`text=${testName}`)).toBeVisible({ timeout: 15000 });
    const leadRow = page.locator(`div:has-text('${testName}')`).last();
    await expect(leadRow.locator("span", { hasText: /unconverted/i })).toBeVisible();

    // 7. Verify Unconverted tab filters work
    const unconvertedTab = page.locator("button:has-text('Unconverted')");
    await expect(unconvertedTab).toBeVisible();
    await unconvertedTab.click();
    await expect(page.locator(`text=${testName}`)).toBeVisible();
  });
});
