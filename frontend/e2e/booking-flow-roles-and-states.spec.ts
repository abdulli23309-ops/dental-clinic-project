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

let dynamicIntegrationKey = "";

async function getOrCreateIntegrationKey(request: any): Promise<string> {
  if (dynamicIntegrationKey) {
    return dynamicIntegrationKey;
  }
  const loginRes = await request.post("http://localhost:8000/api/v1/auth/login", {
    data: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
  });
  if (!loginRes.ok()) {
    throw new Error(`Admin login failed for dynamic integration key creation: ${await loginRes.text()}`);
  }
  const loginData = await loginRes.json();
  const token = loginData.accessToken || loginData.access_token || loginData.token;
  const clientRes = await request.post("http://localhost:8000/api/v1/admin/integrations", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      name: `Playwright Dynamic Bot ${Date.now()}`,
      scopes: [
        "bookings:read",
        "bookings:write",
        "leads:read",
        "leads:write",
        "messages:write",
        "lookup:read",
      ],
    },
  });
  if (!clientRes.ok()) {
    throw new Error(`Integration client creation failed: ${await clientRes.text()}`);
  }
  const clientData = await clientRes.json();
  dynamicIntegrationKey = clientData.rawKey;
  return dynamicIntegrationKey;
}

async function loginAsAdmin(page: any) {
  await page.goto("/login");
  await page.fill("#login-email", ADMIN_EMAIL);
  await page.fill("#login-password", ADMIN_PASSWORD);
  await page.click("button[type='submit']");
  await page.waitForURL("**/admin**", { timeout: 15000 });
}

async function loginAsReceptionist(page: any) {
  await page.goto("/login");
  await page.fill("#login-email", RECEPTIONIST_EMAIL);
  await page.fill("#login-password", RECEPTIONIST_PASSWORD);
  await page.click("button[type='submit']");
  await page.waitForURL("**/reception**", { timeout: 15000 });
}

test.describe("Role Scenarios & Screen Intercept Tests", () => {
  // --------------------------------------------------------------------------
  // Scenario 1: Public Booking with Lead Capture
  // --------------------------------------------------------------------------
  test("1. Public Booking: Lead capture on Step 0 and complete wizard journey", async ({ page }) => {
    test.setTimeout(90000);
    const rand = Math.floor(100000 + Math.random() * 900000);
    const patientName = `Public Lead ${rand}`;
    const patientPhone = `+92 300 5${rand}`;

    await page.goto("/book");
    await page.waitForLoadState("domcontentloaded");

    // Wait for Step 0 input
    await page.waitForSelector("#contact-name", { timeout: 15000 });

    // Fill contact details
    await page.fill("#contact-name", patientName);
    await page.fill("#contact-phone", patientPhone);
    await page.fill("#contact-email", `lead_${rand}@example.com`);

    // Click Continue -> triggers POST /api/v1/public/leads (201 Created)
    const leadResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/leads") && resp.request().method() === "POST" && resp.ok()
    );
    await page.click("[data-testid='wizard-continue-btn']");
    const leadResp = await leadResponsePromise;
    const leadJson = await leadResp.json();
    expect(leadJson.captureToken).toBeTruthy();

    // Step 1: Select Service
    await page.waitForSelector("[data-testid^='service-option-']", { timeout: 10000 });
    const serviceOption = page.locator("[data-testid^='service-option-']").first();
    await serviceOption.click();
    await page.click("[data-testid='wizard-continue-btn']");

    // Step 2: Clinic Selection
    await page.waitForSelector("[data-testid^='clinic-option-']", { timeout: 10000 });
    const clinicOptions = page.locator("[data-testid^='clinic-option-']");
    await clinicOptions.first().click();
    await page.click("[data-testid='wizard-continue-btn']");

    // Step 3: Doctor & Slot Selection - Click first available slot chip
    await page.waitForSelector("[data-testid^='slot-chip-']", { timeout: 15000 });
    const slotChip = page.locator("[data-testid^='slot-chip-']").first();
    await slotChip.click();
    await page.click("[data-testid='wizard-continue-btn']");

    // Step 4: Notes
    await page.waitForSelector("#visit-notes", { timeout: 10000 });
    await page.fill("#visit-notes", "Looking forward to initial consultation.");
    await page.click("[data-testid='wizard-continue-btn']");

    // Step 5: Review & Confirm
    await page.waitForSelector("[data-testid='wizard-confirm-btn']", { timeout: 10000 });
    await page.click("[data-testid='wizard-confirm-btn']");

    // Confirmation screen
    await expect(page.locator("text=Reservation Confirmed")).toBeVisible({ timeout: 15000 });
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Call Desk Dropped Call & Follow-up Resumes Eligibility
  // --------------------------------------------------------------------------
  test("2. Call Desk: Dropped call creates lead, follow-up lookup resumes eligibility", async ({ page }) => {
    test.setTimeout(90000);
    await loginAsReceptionist(page);
    const callDeskLink = page.locator("a[href='/reception/call-desk']").first();
    await expect(callDeskLink).toBeVisible({ timeout: 10000 });
    await callDeskLink.click();
    await page.waitForURL("**/reception/call-desk**", { timeout: 10000 });

    const rand = Math.floor(100000 + Math.random() * 900000);
    const callerPhone = `+92 300 6${rand}`;

    // 1. Search phone
    await page.fill("#call-desk-phone-input", callerPhone);
    await page.click("[data-testid='call-desk-search-btn']");

    // 2. Start Call (Places Hold)
    await page.waitForSelector("[data-testid='call-desk-start-btn']", { timeout: 10000 });
    await page.click("[data-testid='call-desk-start-btn']");

    // 3. Verify Active Call banner
    await expect(page.locator("[data-testid='call-desk-active-banner']")).toBeVisible({ timeout: 10000 });

    // 4. End Call -> select dropped outcome
    await page.click("[data-testid='call-desk-end-btn']");
    await expect(page.locator("h2:has-text('End Call & Record Outcome')")).toBeVisible();

    await page.click("input[value='dropped']");
    await expect(page.locator("[data-testid='dropped-call-capture-box']")).toBeVisible();

    await page.fill("input#dropped-lead-name", `Dropped Caller ${rand}`);
    await page.fill("textarea#call-desk-notes", "Connection dropped during consultation.");

    const submitOutcomeBtn = page.locator("button[data-testid='call-desk-submit-outcome-btn']");
    await submitOutcomeBtn.scrollIntoViewIfNeeded();
    await submitOutcomeBtn.click();

    // 5. Follow-up: Re-search phone number to verify hold released and lead captured
    await page.waitForTimeout(1000);
    await page.fill("#call-desk-phone-input", callerPhone);
    await page.click("[data-testid='call-desk-search-btn']");

    // Lead Journey card now shows captured lead with unconverted status
    await expect(page.locator("[data-testid='lead-badge']")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("[data-testid='lead-badge']")).toContainText(/unconverted/i);
    await expect(page.locator(`text=Dropped Caller ${rand}`)).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Call Desk Booking Workflow
  // --------------------------------------------------------------------------
  test("3. Call Desk Booking: Phone locked during staff booking for caller", async ({ page }) => {
    test.setTimeout(90000);
    await loginAsReceptionist(page);
    const callDeskLink = page.locator("a[href='/reception/call-desk']").first();
    await expect(callDeskLink).toBeVisible({ timeout: 10000 });
    await callDeskLink.click();
    await page.waitForURL("**/reception/call-desk**", { timeout: 10000 });

    const rand = Math.floor(100000 + Math.random() * 900000);
    const callerPhone = `+92 300 7${rand}`;

    await page.fill("#call-desk-phone-input", callerPhone);
    await page.click("[data-testid='call-desk-search-btn']");

    // Start Call (Hold active)
    await page.waitForSelector("[data-testid='call-desk-start-btn']", { timeout: 10000 });
    await page.click("[data-testid='call-desk-start-btn']");

    // Click Book Appointment from active call banner
    await page.waitForSelector("[data-testid='call-desk-book-btn']", { timeout: 10000 });
    await page.click("[data-testid='call-desk-book-btn']");

    // Booking modal opens with locked phone notice
    await expect(page.locator("[data-testid='call-desk-booking-modal']")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Caller phone number is locked")).toBeVisible();

    // Close booking modal
    await page.click("[data-testid='call-desk-close-booking-modal']");
    await expect(page.locator("[data-testid='call-desk-booking-modal']")).not.toBeVisible();
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Cold Task Creation
  // --------------------------------------------------------------------------
  test("4. Cold Lead Follow-up: Leads marked cold generate a reception task", async ({ page, request }) => {
    // 1. Create a lead and transition to cold via integration/reception API
    const apiKey = await getOrCreateIntegrationKey(request);
    const rand = Math.floor(100000 + Math.random() * 900000);
    const testPhone = `+92 300 8${rand}`;

    const leadRes = await request.post("http://localhost:8000/api/v1/integration/leads", {
      headers: {
        "X-Marlow-Key": apiKey,
        "Content-Type": "application/json",
      },
      data: {
        name: `Cold Lead Candidate ${rand}`,
        phone: testPhone,
        email: `cold_${rand}@example.com`,
        source: "website_abandon",
        notes: "Automated test cold lead verification.",
      },
    });
    expect(leadRes.ok()).toBeTruthy();
    const leadData = await leadRes.json();
    const leadId = leadData.id;

    // Transition status to cold
    const statusRes = await request.patch(`http://localhost:8000/api/v1/integration/leads/${leadId}/status`, {
      headers: {
        "X-Marlow-Key": apiKey,
        "Content-Type": "application/json",
      },
      data: {
        status: "cold",
        notes: "Max follow-up attempts reached without response.",
      },
    });
    expect(statusRes.ok()).toBeTruthy();

    // 2. Log in as receptionist and verify the task exists in Reception Tasks
    await loginAsReceptionist(page);
    const tasksLink = page.locator("a[href='/reception/tasks']").first();
    await expect(tasksLink).toBeVisible({ timeout: 10000 });
    await tasksLink.click();
    await page.waitForURL("**/reception/tasks**", { timeout: 10000 });

    // Check that task is displayed
    await page.waitForSelector("h1:has-text('Operational Tasks Board')", { timeout: 10000 });
    await expect(page.locator("body")).toContainText(new RegExp(`Cold lead follow-up.*${rand}|Cold Lead Candidate ${rand}`, "i"), { timeout: 10000 });
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Integration Client Creating a Booking
  // --------------------------------------------------------------------------
  test("5. Integration Client: Create booking with X-Marlow-Key and fetch confirmation data", async ({ request }) => {
    const apiKey = await getOrCreateIntegrationKey(request);

    // 1. Query booking options to obtain valid service and clinic
    const optionsRes = await request.get("http://localhost:8000/api/v1/integration/booking-options", {
      headers: {
        "X-Marlow-Key": apiKey,
      },
    });
    expect(optionsRes.ok()).toBeTruthy();
    const options = await optionsRes.json();
    expect(options.services.length).toBeGreaterThan(0);
    expect(options.clinics.length).toBeGreaterThan(0);

    const serviceId = options.services[0].id;
    const clinicId = options.clinics[0].id;

    // 2. Query booking options filtered by clinic to find available doctor & slot
    const slotOptionsRes = await request.get(`http://localhost:8000/api/v1/integration/booking-options?clinic_id=${clinicId}&service_id=${serviceId}`, {
      headers: {
        "X-Marlow-Key": apiKey,
      },
    });
    expect(slotOptionsRes.ok()).toBeTruthy();
    const slotOptions = await slotOptionsRes.json();
    expect(slotOptions.doctors.length).toBeGreaterThan(0);
    const doctorId = slotOptions.doctors[0].id;

    const rand = Math.floor(100000 + Math.random() * 900000);
    const randomMinute = 10 + (rand % 45);
    const randomHour = 10 + (rand % 5);
    const bookingTime = `${String(randomHour).padStart(2, "0")}:${String(randomMinute).padStart(2, "0")}`;
    const randDay = 2 + (rand % 3);
    const bookingDate = new Date(Date.now() + 86400000 * randDay).toISOString().split("T")[0];

    // 3. Create booking via Integration API
    const bookingRes = await request.post("http://localhost:8000/api/v1/integration/bookings", {
      headers: {
        "X-Marlow-Key": apiKey,
        "Content-Type": "application/json",
      },
      data: {
        patientName: `Integration Caller ${rand}`,
        patientPhone: `+92 300 9${rand}`,
        patientEmail: `integration_${rand}@example.com`,
        clinicId: clinicId,
        serviceId: serviceId,
        doctorId: doctorId,
        bookingDate: bookingDate,
        bookingTime: bookingTime,
        notes: "Booked via automated WhatsApp integration bot.",
      },
    });
    expect(bookingRes.ok()).toBeTruthy();
    const bookingData = await bookingRes.json();
    expect(bookingData.id).toBeTruthy();
    expect(bookingData.confirmationId).toBeTruthy();

    // 4. Fetch Confirmation Data payload (BF14 requirement)
    const confirmRes = await request.get(`http://localhost:8000/api/v1/integration/bookings/${bookingData.id}/confirmation-data`, {
      headers: {
        "X-Marlow-Key": apiKey,
      },
    });
    expect(confirmRes.ok()).toBeTruthy();
    const confirmData = await confirmRes.json();
    expect(confirmData.confirmationId).toBe(bookingData.confirmationId);
    expect(confirmData.clinicName).toBeTruthy();
    expect(confirmData.serviceName).toBeTruthy();
    expect(confirmData.doctorName).toBeTruthy();
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Intercept Tests for Empty and Error States
  // --------------------------------------------------------------------------
  test("6A. /admin/integrations Empty State: Displays empty guidance and create button", async ({ page }) => {
    // Intercept GET /api/v1/admin/integrations to return empty array
    await page.route("**/api/v1/admin/integrations", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      } else {
        await route.continue();
      }
    });

    await loginAsAdmin(page);
    const integrationsLink = page.locator("a[href='/admin/integrations']").first();
    if (await integrationsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await integrationsLink.click();
    } else {
      await page.goto("/admin/integrations");
    }
    await page.waitForURL("**/admin/integrations**", { timeout: 10000 });

    // Empty state card elements
    await expect(page.locator("text=No integration clients yet")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("button:has-text('Create First Integration Key')")).toBeVisible();
  });

  test("6B. /admin/integrations Error State: Displays error alert banner on API failure", async ({ page }) => {
    // Intercept GET /api/v1/admin/integrations to return 500 error
    await page.route("**/api/v1/admin/integrations", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Database cluster unavailable." }),
        });
      } else {
        await route.continue();
      }
    });

    await loginAsAdmin(page);
    const integrationsLink = page.locator("a[href='/admin/integrations']").first();
    if (await integrationsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await integrationsLink.click();
    } else {
      await page.goto("/admin/integrations");
    }
    await page.waitForURL("**/admin/integrations**", { timeout: 10000 });

    // Error alert banner visible
    await expect(page.locator("text=Database cluster unavailable.")).toBeVisible({ timeout: 10000 });
  });

  test("6C. /reception/call-desk Empty State: Shows 'No patient found' on unknown caller lookup", async ({ page }) => {
    await loginAsReceptionist(page);
    const callDeskLink = page.locator("a[href='/reception/call-desk']").first();
    await expect(callDeskLink).toBeVisible({ timeout: 10000 });
    await callDeskLink.click();
    await page.waitForURL("**/reception/call-desk**", { timeout: 10000 });

    // Search for a non-existent number
    await page.fill("#call-desk-phone-input", "+92 399 9999999");
    await page.click("[data-testid='call-desk-search-btn']");

    // Verify empty state notices render for patient and lead cards
    await expect(page.locator("text=No patient found")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=No open lead")).toBeVisible();
    await expect(page.locator("text=This phone number does not belong to any existing patient chart.")).toBeVisible();
  });

  test("6D. /reception/call-desk Error State: Displays inline error on API 500", async ({ page }) => {
    // Intercept lookup endpoint to simulate backend failure
    await page.route("**/api/v1/reception/call-desk/lookup*", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Telephony gateway timeout." }),
      });
    });

    await loginAsReceptionist(page);
    const callDeskLink = page.locator("a[href='/reception/call-desk']").first();
    await expect(callDeskLink).toBeVisible({ timeout: 10000 });
    await callDeskLink.click();
    await page.waitForURL("**/reception/call-desk**", { timeout: 10000 });

    await page.fill("#call-desk-phone-input", "+92 300 1234567");
    await page.click("[data-testid='call-desk-search-btn']");

    // Field error text visible
    await expect(page.locator("text=Telephony gateway timeout.")).toBeVisible({ timeout: 10000 });
  });
});
