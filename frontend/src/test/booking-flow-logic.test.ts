import { describe, it, expect } from "vitest";
import { bookingCopy } from "@/content/booking-copy";
import {
  checkServiceSkip,
  checkClinicSkip,
  checkDoctorAutoSelect,
  getNextStep,
  getPreviousStep,
} from "@/lib/booking-flow-logic";
import {
  PublicBookingServiceItem,
  PublicBookingClinicItem,
  PublicBookingDoctorItem,
} from "@/lib/api";

describe("Booking Copy & Localization Keys", () => {
  it("en and ur copies define all required conversational copy keys", () => {
    const en = bookingCopy.en;
    const ur = bookingCopy.ur;

    expect(en).toBeDefined();
    expect(ur).toBeDefined();

    // Required steps
    expect(en.steps.contact).toBe("1. Contact");
    expect(en.steps.service).toBe("2. Service");
    expect(en.steps.clinic).toBe("3. Clinic");
    expect(en.steps.doctorAndTime).toBe("4. Doctor & Time");
    expect(en.steps.notes).toBe("5. Notes");
    expect(en.steps.review).toBe("6. Review");

    // Required notice and conversational phrasing
    expect(en.contactStep.defaultNotice).toContain("We save your details so we can help you finish booking.");
    expect(en.notesStep.bookingForLabel).toBe("Booking for:");
    expect(en.notesStep.bookingForMyself).toBe("Myself");
    expect(en.notesStep.bookingForSomeoneElse).toBe("Someone else");

    // Required error wording for taken slot
    expect(en.errors.slotTaken).toBe("That time was just taken. Here are the nearest free times.");
    expect(ur.errors.slotTaken).toContain("That time was just taken. Here are the nearest free times.");
  });

  it("ensures no technical error jargon in conversational copy", () => {
    const en = bookingCopy.en;
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

    collectStrings(en);
    for (const text of allStrings) {
      for (const word of forbidden) {
        expect(text).not.toContain(word);
      }
    }
  });
});

describe("Booking Flow Skip & Auto-Select Logic", () => {
  const dummyService1: PublicBookingServiceItem = {
    id: "s1",
    slug: "cleanings",
    title: "Cleanings & Exams",
    category: "preventive",
    shortDesc: "Complete exam",
    cashPrice: "from 140",
    duration: "45 mins",
  };
  const dummyService2: PublicBookingServiceItem = {
    id: "s2",
    slug: "fillings",
    title: "Fillings",
    category: "restorative",
    shortDesc: "Composite fillings",
    cashPrice: "from 210",
    duration: "60 mins",
  };

  const dummyClinic1: PublicBookingClinicItem = {
    id: "c1",
    name: "Main Branch",
    addressLine1: "123 Healthcare Blvd",
    city: "Capital District",
    phone: "+92 300 1234567",
    isPrimary: true,
  };
  const dummyClinic2: PublicBookingClinicItem = {
    id: "c2",
    name: "Downtown Studio",
    addressLine1: "45 Downtown Ave",
    city: "Capital District",
    phone: "+92 300 7654321",
    isPrimary: false,
  };

  const dummyDoctor1: PublicBookingDoctorItem = {
    id: "d1",
    firstName: "Alexander",
    lastName: "Marlow",
    displayName: "Dr. Alexander Marlow",
    professionalTitle: "Principal Dental Surgeon",
    patientsTreated: 840,
    workingDaysHours: "Mon-Fri 09:00 - 18:00",
    slotsByDate: { "2026-10-19": ["10:00 AM", "11:00 AM"] },
  };
  const dummyDoctor2: PublicBookingDoctorItem = {
    id: "d2",
    firstName: "Sarah",
    lastName: "Jenkins",
    displayName: "Dr. Sarah Jenkins",
    professionalTitle: "Associate Orthodontist",
    patientsTreated: 420,
    workingDaysHours: "Mon, Wed, Fri 10:00 - 17:00",
    slotsByDate: { "2026-10-19": ["02:00 PM", "03:00 PM"] },
  };

  it("correctly identifies single service to skip", () => {
    expect(checkServiceSkip([dummyService1])).toEqual({
      shouldSkip: true,
      autoSelectedId: "s1",
    });
    expect(checkServiceSkip([dummyService1, dummyService2])).toEqual({
      shouldSkip: false,
    });
  });

  it("correctly identifies single clinic to skip", () => {
    expect(checkClinicSkip([dummyClinic1])).toEqual({
      shouldSkip: true,
      autoSelectedId: "c1",
    });
    expect(checkClinicSkip([dummyClinic1, dummyClinic2])).toEqual({
      shouldSkip: false,
    });
  });

  it("correctly identifies single doctor for auto-selection", () => {
    expect(checkDoctorAutoSelect([dummyDoctor1])).toEqual({
      isSingleDoctor: true,
      autoSelectedDoctor: dummyDoctor1,
    });
    expect(checkDoctorAutoSelect([dummyDoctor1, dummyDoctor2])).toEqual({
      isSingleDoctor: false,
    });
  });

  it("calculates next step forward taking single service and clinic skips into account", () => {
    // 1 service, 1 clinic: step 0 skips step 1 & 2 directly to step 3 (Doctor & Time)
    expect(getNextStep(0, { servicesCount: 1, clinicsCount: 1 })).toBe(3);

    // 1 service, 2 clinics: step 0 skips step 1 and moves to step 2 (Clinic)
    expect(getNextStep(0, { servicesCount: 1, clinicsCount: 2 })).toBe(2);

    // 2 services: step 0 moves to step 1 (Service)
    expect(getNextStep(0, { servicesCount: 2, clinicsCount: 1 })).toBe(1);

    // From step 1 with 1 clinic: skips step 2 and moves to step 3 (Doctor & Time)
    expect(getNextStep(1, { servicesCount: 2, clinicsCount: 1 })).toBe(3);

    // From step 1 with 2 clinics: moves to step 2 (Clinic)
    expect(getNextStep(1, { servicesCount: 2, clinicsCount: 2 })).toBe(2);

    // Normal forward progression from step 2, 3, 4
    expect(getNextStep(2, { servicesCount: 2, clinicsCount: 2 })).toBe(3);
    expect(getNextStep(3, { servicesCount: 2, clinicsCount: 2 })).toBe(4);
    expect(getNextStep(4, { servicesCount: 2, clinicsCount: 2 })).toBe(5);
  });

  it("calculates previous step backward symmetrically", () => {
    // From step 3 (Doctor & Time) when clinic and service were both single: jumps back to step 0
    expect(getPreviousStep(3, { servicesCount: 1, clinicsCount: 1 })).toBe(0);

    // From step 3 when clinic was single but multiple services: jumps back to step 1 (Service)
    expect(getPreviousStep(3, { servicesCount: 2, clinicsCount: 1 })).toBe(1);

    // From step 3 when multiple clinics: back to step 2 (Clinic)
    expect(getPreviousStep(3, { servicesCount: 2, clinicsCount: 2 })).toBe(2);

    // From step 2 (Clinic) when service was single: back to step 0 (Contact)
    expect(getPreviousStep(2, { servicesCount: 1, clinicsCount: 2 })).toBe(0);
    // From step 2 when multiple services: back to step 1 (Service)
    expect(getPreviousStep(2, { servicesCount: 2, clinicsCount: 2 })).toBe(1);
  });
});
