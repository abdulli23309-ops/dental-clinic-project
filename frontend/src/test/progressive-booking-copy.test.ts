import { describe, it, expect } from "vitest";
import { progressiveBookingCopy } from "@/content/progressive-booking-copy";
import { validateContactDetails } from "@/lib/booking-flow-logic";

/**
 * BF17 — the public progressive booking flow's conversational copy lives in
 * `src/content/progressive-booking-copy.ts`. These assertions lock the exact
 * wording so E2E string matching and accessible names stay stable.
 */
describe("Progressive Booking Copy", () => {
  it("exposes header, contact, waterfall, review and confirmation sections", () => {
    const copy = progressiveBookingCopy;

    expect(copy.header.badge).toBe("Marlow Dental · Private Appointments");
    expect(copy.header.heading).toBe("Reserve Your Dental Consultation");
    expect(copy.header.stepsNavLabel).toBe("Booking Steps");
    expect(copy.header.stepLabels).toEqual({
      contact: "Contact Details",
      waterfall: "Booking Waterfall",
      review: "Summary & Review",
    });

    expect(copy.contact.pageLabel).toBe("Page 1 of 3 · Patient Information");
    expect(copy.contact.heading).toBe("Who is this visit for?");
    expect(copy.contact.continueButton).toBe("Continue");

    expect(copy.waterfall.pageLabel).toBe("Page 2 of 3 · Booking Waterfall");
    expect(copy.waterfall.heading).toBe("Choose Your Treatment, Clinic & Time");
    expect(copy.waterfall.retryButton).toBe("Retry");

    expect(copy.review.pageLabel).toBe("Page 3 of 3 · Summary & Review");
    expect(copy.review.heading).toBe("Review Your Appointment Request");
    expect(copy.review.confirmButton).toBe("Confirm Appointment Request");

    expect(copy.confirmation.eyebrow).toBe("Booking Confirmed");
    expect(copy.confirmation.heading).toBe("We Look Forward to Welcoming You");
  });

  it("keeps contact validation wording in sync with booking-flow-logic", () => {
    const validation = validateContactDetails("", "123");

    expect(validation.nameError).toBe(progressiveBookingCopy.contact.fullNameError);
    expect(validation.phoneError).toBe(progressiveBookingCopy.contact.phoneError);

    const emailValidation = validateContactDetails("Aalia Khan", "+92 300 1234567", "notanemail");
    expect(emailValidation.emailError).toBe(progressiveBookingCopy.contact.emailError);
  });

  it("formats dynamic messages with the runtime values embedded", () => {
    const copy = progressiveBookingCopy;

    expect(copy.header.stepAriaLabel(2, copy.header.stepLabels.waterfall)).toBe(
      "Step 2: Booking Waterfall"
    );
    expect(copy.waterfall.clinicHeading(true)).toBe("3. Clinic");
    expect(copy.waterfall.clinicHeading(false)).toBe("2. Clinic");
    expect(copy.waterfall.patientsTreatedBadge(120)).toBe("120 patients treated");
    expect(copy.waterfall.patientsTreatedShortBadge(120)).toBe("120 treated");
    expect(copy.waterfall.slotsCountLabel(4)).toBe("4 slots");
    expect(copy.waterfall.showAllDays(9)).toBe("Show all 9 available days");
    expect(copy.confirmation.callbackWindowLabel("10:00 AM - 12:00 PM")).toBe(
      "Expected callback window: 10:00 AM - 12:00 PM"
    );
    expect(copy.scheduleAt("Mon, Feb 3", "10:30 AM")).toBe("Mon, Feb 3 at 10:30 AM");
  });

  it("contains no technical error jargon in any user-facing string", () => {
    const forbidden = ["500", "404", "exception", "database", "null", "undefined", "internal error"];
    const allStrings: string[] = [];

    function collectStrings(obj: unknown) {
      if (!obj || typeof obj !== "object") return;
      for (const val of Object.values(obj as Record<string, unknown>)) {
        if (typeof val === "string") {
          allStrings.push(val.toLowerCase());
        } else if (typeof val === "object" && val !== null) {
          collectStrings(val);
        }
      }
    }

    collectStrings(progressiveBookingCopy);
    for (const text of allStrings) {
      for (const word of forbidden) {
        expect(text).not.toContain(word);
      }
    }
  });
});
