import { describe, it, expect } from "vitest";
import { bookingCopy } from "@/content/booking-copy";
import {
  BOOKING_STEPS,
  checkServiceSkip,
  checkClinicSkip,
  checkDoctorAutoSelect,
  validateContactDetails,
  normalizeUrlStep,
  groupClinicsByCity,
  getAvailableCities,
  getClinicsForCity,
  resetSelectionsOnServiceChange,
  resetSelectionsOnClinicChange,
  resetSelectionsOnDoctorChange,
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

    // 6-step keys
    expect(en.steps.city).toBe("3. Location");
    expect(en.steps.doctor).toBe("4. Doctor");
    expect(en.steps.dateTime).toBe("5. Date & Time");

    // City and Date & Time step copy
    expect(en.cityStep).toBeDefined();
    expect(en.cityStep.title).toBe("Select your city and clinic branch");
    expect(ur.cityStep).toBeDefined();
    expect(ur.cityStep.title).toContain("شہر");

    expect(en.dateTimeStep).toBeDefined();
    expect(en.dateTimeStep.title).toBe("Select your appointment date and time");
    expect(ur.dateTimeStep).toBeDefined();
    expect(ur.dateTimeStep.title).toContain("تاریخ اور وقت");

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

describe("Booking Step Constants & Contact Validation", () => {
  it("defines 6 semantic flow step indexes", () => {
    expect(BOOKING_STEPS.DETAILS).toBe(0);
    expect(BOOKING_STEPS.SERVICE).toBe(1);
    expect(BOOKING_STEPS.LOCATION).toBe(2);
    expect(BOOKING_STEPS.DOCTOR).toBe(3);
    expect(BOOKING_STEPS.DATETIME).toBe(4);
    expect(BOOKING_STEPS.REVIEW).toBe(5);
  });

  it("validates contact details requiring name and phone, optional email", () => {
    // Valid minimal
    const validMinimal = validateContactDetails("Tariq Vance", "+92 300 1234567");
    expect(validMinimal.isValid).toBe(true);
    expect(validMinimal.nameError).toBeUndefined();
    expect(validMinimal.phoneError).toBeUndefined();

    // Valid with proper email
    const validFull = validateContactDetails("Tariq Vance", "+92 300 1234567", "tariq@example.com");
    expect(validFull.isValid).toBe(true);

    // Invalid short name
    const invalidName = validateContactDetails("T", "+92 300 1234567");
    expect(invalidName.isValid).toBe(false);
    expect(invalidName.nameError).toBe("Please provide your full name.");

    // Invalid phone
    const invalidPhone = validateContactDetails("Tariq Vance", "123");
    expect(invalidPhone.isValid).toBe(false);
    expect(invalidPhone.phoneError).toBe("Please provide a valid mobile number.");

    // Invalid email format
    const invalidEmail = validateContactDetails("Tariq Vance", "+92 300 1234567", "notanemail");
    expect(invalidEmail.isValid).toBe(false);
    expect(invalidEmail.emailError).toBe("Please enter a valid email address.");
  });

  it("safely normalizes URL ?step parameter", () => {
    expect(normalizeUrlStep(null)).toBe(0);
    expect(normalizeUrlStep(undefined)).toBe(0);
    expect(normalizeUrlStep("")).toBe(0);
    expect(normalizeUrlStep("invalid")).toBe(0);
    expect(normalizeUrlStep("-1")).toBe(0);
    expect(normalizeUrlStep("6")).toBe(0);
    expect(normalizeUrlStep("0")).toBe(0);
    expect(normalizeUrlStep("1")).toBe(1);
    expect(normalizeUrlStep("2")).toBe(2);
    expect(normalizeUrlStep("3")).toBe(3);
    expect(normalizeUrlStep("4")).toBe(4);
    expect(normalizeUrlStep("5")).toBe(5);
  });
});

describe("City-to-Clinic Mapping & Downstream State Resets", () => {
  const dummyClinics: PublicBookingClinicItem[] = [
    {
      id: "c1",
      name: "Main Branch",
      addressLine1: "123 Healthcare Blvd",
      city: "Capital District",
      phone: "+92 300 1234567",
      isPrimary: true,
    },
    {
      id: "c2",
      name: "Downtown Studio",
      addressLine1: "45 Downtown Ave",
      city: "Capital District",
      phone: "+92 300 7654321",
      isPrimary: false,
    },
    {
      id: "c3",
      name: "Lahore Dental Center",
      addressLine1: "88 Gulberg III",
      city: "Lahore",
      phone: "+92 42 1234567",
      isPrimary: false,
    },
  ];

  it("groups clinics accurately by city", () => {
    const groups = groupClinicsByCity(dummyClinics);
    expect(groups).toHaveLength(2);

    const capGroup = groups.find((g) => g.city === "Capital District");
    expect(capGroup).toBeDefined();
    expect(capGroup?.clinics).toHaveLength(2);
    expect(capGroup?.clinics.map((c) => c.name)).toContain("Main Branch");
    expect(capGroup?.clinics.map((c) => c.name)).toContain("Downtown Studio");

    const lhrGroup = groups.find((g) => g.city === "Lahore");
    expect(lhrGroup).toBeDefined();
    expect(lhrGroup?.clinics).toHaveLength(1);
    expect(lhrGroup?.clinics[0].name).toBe("Lahore Dental Center");
  });

  it("lists available cities and filters clinics by chosen city", () => {
    const cities = getAvailableCities(dummyClinics);
    expect(cities).toEqual(["Capital District", "Lahore"]);

    const lahoreClinics = getClinicsForCity(dummyClinics, "Lahore");
    expect(lahoreClinics).toHaveLength(1);
    expect(lahoreClinics[0].id).toBe("c3");

    const capitalClinics = getClinicsForCity(dummyClinics, "capital district");
    expect(capitalClinics).toHaveLength(2);
  });

  it("city step shows only cities that offer the chosen service", () => {
    // Service-filtered clinics returned by API for service s1
    const serviceClinics: PublicBookingClinicItem[] = [
      { id: "c1", name: "Main Branch", addressLine1: "123 Blvd", city: "Capital District", phone: "+92 300 1", isPrimary: true },
      { id: "c2", name: "Downtown Studio", addressLine1: "45 Ave", city: "Capital District", phone: "+92 300 2", isPrimary: false },
    ];
    // Service s1 is not offered in Lahore, so Lahore is not in serviceClinics
    const offeredCities = getAvailableCities(serviceClinics);
    expect(offeredCities).toEqual(["Capital District"]);
    expect(offeredCities).not.toContain("Lahore");
  });

  it("a city with two clinics shows a clinic chooser", () => {
    const capitalClinics = getClinicsForCity(dummyClinics, "Capital District");
    expect(capitalClinics).toHaveLength(2);
    expect(capitalClinics.length > 1).toBe(true);
    expect(capitalClinics.map((c) => c.name)).toEqual(["Main Branch", "Downtown Studio"]);
  });

  it("changing service, city, clinic or doctor clears the choices after it", () => {
    // 1. Changing service clears city, clinic, doctor, date, time
    const serviceReset = resetSelectionsOnServiceChange();
    expect(serviceReset.selectedCity).toBe("");
    expect(serviceReset.selectedClinic).toBe("");
    expect(serviceReset.selectedDoctor).toBe("");
    expect(serviceReset.selectedDate).toBe("");
    expect(serviceReset.selectedTime).toBe("");

    // 2. Changing clinic clears doctor, date, time
    const clinicReset = resetSelectionsOnClinicChange();
    expect(clinicReset.selectedDoctor).toBe("");
    expect(clinicReset.selectedDate).toBe("");
    expect(clinicReset.selectedTime).toBe("");

    // 3. Changing doctor clears date, time
    const doctorReset = resetSelectionsOnDoctorChange();
    expect(doctorReset.selectedDate).toBe("");
    expect(doctorReset.selectedTime).toBe("");
  });

  it("clears dependent downstream selections on upstream changes", () => {
    // Service change clears everything downstream: city, clinic, doctor, date, time
    const onService = resetSelectionsOnServiceChange();
    expect(onService).toEqual({
      selectedCity: "",
      selectedClinic: "",
      selectedDoctor: "",
      selectedDate: "",
      selectedTime: "",
    });

    // Clinic change clears doctor, date, time
    const onClinic = resetSelectionsOnClinicChange();
    expect(onClinic).toEqual({
      selectedDoctor: "",
      selectedDate: "",
      selectedTime: "",
    });

    // Doctor change clears date, time
    const onDoctor = resetSelectionsOnDoctorChange();
    expect(onDoctor).toEqual({
      selectedDate: "",
      selectedTime: "",
    });
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
    // 1 service, 1 clinic: step 0 skips step 1 & 2 directly to step 3 (Doctor)
    expect(getNextStep(0, { servicesCount: 1, clinicsCount: 1 })).toBe(3);

    // 1 service, 2 clinics: step 0 skips step 1 and moves to step 2 (Location)
    expect(getNextStep(0, { servicesCount: 1, clinicsCount: 2 })).toBe(2);

    // 2 services: step 0 moves to step 1 (Service)
    expect(getNextStep(0, { servicesCount: 2, clinicsCount: 1 })).toBe(1);

    // From step 1 with 1 clinic: skips step 2 and moves to step 3 (Doctor)
    expect(getNextStep(1, { servicesCount: 2, clinicsCount: 1 })).toBe(3);

    // From step 1 with 2 clinics: moves to step 2 (Location)
    expect(getNextStep(1, { servicesCount: 2, clinicsCount: 2 })).toBe(2);

    // Normal forward progression from step 2, 3, 4
    expect(getNextStep(2, { servicesCount: 2, clinicsCount: 2 })).toBe(3);
    expect(getNextStep(3, { servicesCount: 2, clinicsCount: 2 })).toBe(4);
    expect(getNextStep(4, { servicesCount: 2, clinicsCount: 2 })).toBe(5);
  });

  it("calculates previous step backward symmetrically", () => {
    // From step 3 (Doctor) when clinic and service were both single: jumps back to step 0
    expect(getPreviousStep(3, { servicesCount: 1, clinicsCount: 1 })).toBe(0);

    // From step 3 when clinic was single but multiple services: jumps back to step 1 (Service)
    expect(getPreviousStep(3, { servicesCount: 2, clinicsCount: 1 })).toBe(1);

    // From step 3 when multiple clinics: back to step 2 (Location)
    expect(getPreviousStep(3, { servicesCount: 2, clinicsCount: 2 })).toBe(2);

    // From step 2 (Location) when service was single: back to step 0 (Contact)
    expect(getPreviousStep(2, { servicesCount: 1, clinicsCount: 2 })).toBe(0);
    // From step 2 when multiple services: back to step 1 (Service)
    expect(getPreviousStep(2, { servicesCount: 2, clinicsCount: 2 })).toBe(1);
  });
});
