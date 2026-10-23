/**
 * Conversational copy for the public progressive booking flow (`/book`).
 *
 * Every user-facing string rendered by `ProgressiveBookingFlow` lives here so
 * the public flow has a single source of truth, matching the call desk wizard's
 * `booking-copy.ts`. Strings that embed a runtime value are exposed as small
 * functions so the surrounding wording stays in this module.
 *
 * The public flow is English only today; the call desk wizard (`booking-copy.ts`)
 * is the localized surface.
 */

export interface ProgressiveBookingCopy {
  header: {
    badge: string;
    heading: string;
    subheading: string;
    stepsNavLabel: string;
    stepLabels: {
      contact: string;
      waterfall: string;
      review: string;
    };
    stepAriaLabel: (step: number, label: string) => string;
  };
  contact: {
    pageLabel: string;
    heading: string;
    subheading: string;
    fullNameLabel: string;
    fullNamePlaceholder: string;
    fullNameError: string;
    phoneLabel: string;
    phonePlaceholder: string;
    phoneError: string;
    emailLabel: string;
    emailHelpText: string;
    emailPlaceholder: string;
    emailError: string;
    forSomeoneElseLabel: string;
    dependentNameLabel: string;
    dependentNamePlaceholder: string;
    dependentNameError: string;
    notesLabel: string;
    notesPlaceholder: string;
    continueButton: string;
  };
  waterfall: {
    pageLabel: string;
    heading: string;
    subheading: string;
    treatmentHeading: string;
    cityHeading: string;
    clinicHeading: (hasCityStep: boolean) => string;
    doctorHeading: string;
    dateTimeHeading: string;
    loadingTreatments: string;
    loadingClinics: string;
    loadingClinicians: string;
    errorTreatments: string;
    errorClinics: string;
    errorClinicians: string;
    retryButton: string;
    mainBranchBadge: string;
    noCliniciansAtClinic: string;
    noOpenDays: string;
    clinicTelPrefix: string;
    patientsTreatedBadge: (count: number) => string;
    patientsTreatedShortBadge: (count: number) => string;
    slotsCountLabel: (count: number) => string;
    showAllDays: (count: number) => string;
    backToContact: string;
    continueToSummary: string;
    chooseDifferentTime: string;
    groupLabels: {
      treatments: string;
      cities: string;
      clinics: string;
      clinicians: string;
      appointmentDays: string;
    };
  };
  review: {
    pageLabel: string;
    heading: string;
    subheading: string;
    patientLabel: string;
    contactLabel: string;
    treatmentLabel: string;
    clinicLabel: string;
    clinicianLabel: string;
    scheduleLabel: string;
    notesLabel: string;
    privacyNotice: string;
    backToEdit: string;
    confirmButton: string;
  };
  confirmation: {
    eyebrow: string;
    heading: string;
    receptionWillCallPrefix: string;
    receptionWillCallSuffix: string;
    referenceLabel: string;
    callbackWindowLabel: (window: string) => string;
    patientLabel: string;
    treatmentLabel: string;
    clinicLabel: string;
    clinicianLabel: string;
    scheduleLabel: string;
    returnHomeButton: string;
  };
  errors: {
    slotTaken: string;
    bookingPaused: string;
    submitFailed: string;
  };
  scheduleAt: (day: string, time: string) => string;
}

/**
 * Copy for the public progressive booking flow.
 *
 * Wording is intentionally identical to the strings that previously lived
 * inline in `ProgressiveBookingFlow` so visible text, accessible names and
 * existing end-to-end assertions stay stable.
 */
export const progressiveBookingCopy: ProgressiveBookingCopy = {
  header: {
    badge: "Marlow Dental · Private Appointments",
    heading: "Reserve Your Dental Consultation",
    subheading:
      "Unhurried clinical assessment with direct doctor continuity across all modern facilities.",
    stepsNavLabel: "Booking Steps",
    stepLabels: {
      contact: "Contact Details",
      waterfall: "Booking Waterfall",
      review: "Summary & Review",
    },
    stepAriaLabel: (step: number, label: string) => `Step ${step}: ${label}`,
  },
  contact: {
    pageLabel: "Page 1 of 3 · Patient Information",
    heading: "Who is this visit for?",
    subheading:
      "We will use these details to save your progress and call you back to confirm the appointment.",
    fullNameLabel: "Full Name",
    fullNamePlaceholder: "e.g. Aalia Khan",
    fullNameError: "Please provide your full name.",
    phoneLabel: "Mobile Phone",
    phonePlaceholder: "+92 300 1234567",
    phoneError: "Please provide a valid mobile number.",
    emailLabel: "Email Address",
    emailHelpText: "Optional",
    emailPlaceholder: "patient@example.com",
    emailError: "Please enter a valid email address.",
    forSomeoneElseLabel:
      "I am booking on behalf of a family member, child, or dependant",
    dependentNameLabel: "Patient's Full Legal Name",
    dependentNamePlaceholder: "Enter patient's full legal name",
    dependentNameError: "Please provide the patient's full legal name.",
    notesLabel: "Clinical Concern or Specific Symptoms (Optional)",
    notesPlaceholder:
      "e.g. Tooth sensitivity to cold, routine checkup, or interested in clear aligners...",
    continueButton: "Continue",
  },
  waterfall: {
    pageLabel: "Page 2 of 3 · Booking Waterfall",
    heading: "Choose Your Treatment, Clinic & Time",
    subheading:
      "Each choice reveals the next: only clinics offering your treatment, only doctors at that clinic, and only real open appointment times.",
    treatmentHeading: "1. Treatment",
    cityHeading: "2. City",
    clinicHeading: (hasCityStep: boolean) => (hasCityStep ? "3. Clinic" : "2. Clinic"),
    doctorHeading: "Doctor",
    dateTimeHeading: "Date & Time",
    loadingTreatments: "Loading treatments...",
    loadingClinics: "Loading clinics...",
    loadingClinicians: "Loading clinicians...",
    errorTreatments: "We could not load treatments right now. Please try again.",
    errorClinics: "We could not load clinics for this treatment. Please try another one.",
    errorClinicians: "We could not load clinicians for this clinic. Please try again.",
    retryButton: "Retry",
    mainBranchBadge: "Main Branch",
    noCliniciansAtClinic:
      "No clinicians are currently available at this clinic for the selected treatment. Please choose another clinic.",
    noOpenDays:
      "This clinician has no open appointment days for this treatment right now. Please choose another doctor.",
    clinicTelPrefix: "· Tel: ",
    patientsTreatedBadge: (count: number) => `${count} patients treated`,
    patientsTreatedShortBadge: (count: number) => `${count} treated`,
    slotsCountLabel: (count: number) => `${count} slots`,
    showAllDays: (count: number) => `Show all ${count} available days`,
    backToContact: "Back to contact details",
    continueToSummary: "Continue to Summary",
    chooseDifferentTime: "Choose a different time",
    groupLabels: {
      treatments: "Treatments",
      cities: "Cities",
      clinics: "Clinics",
      clinicians: "Clinicians",
      appointmentDays: "Appointment days",
    },
  },
  review: {
    pageLabel: "Page 3 of 3 · Summary & Review",
    heading: "Review Your Appointment Request",
    subheading:
      "Submitting places an appointment request. Our reception team will call to confirm the final time.",
    patientLabel: "Patient",
    contactLabel: "Contact",
    treatmentLabel: "Treatment",
    clinicLabel: "Clinic",
    clinicianLabel: "Clinician",
    scheduleLabel: "Schedule",
    notesLabel: "Your notes:",
    privacyNotice:
      "Your details are transmitted securely and used only to arrange this visit.",
    backToEdit: "Back to edit selections",
    confirmButton: "Confirm Appointment Request",
  },
  confirmation: {
    eyebrow: "Booking Confirmed",
    heading: "We Look Forward to Welcoming You",
    receptionWillCallPrefix:
      "Your appointment request has been received. Our reception team will call",
    receptionWillCallSuffix: "shortly to confirm the exact time.",
    referenceLabel: "Reference Code",
    callbackWindowLabel: (window: string) => `Expected callback window: ${window}`,
    patientLabel: "Patient:",
    treatmentLabel: "Treatment:",
    clinicLabel: "Clinic:",
    clinicianLabel: "Clinician:",
    scheduleLabel: "Schedule:",
    returnHomeButton: "Return to homepage",
  },
  errors: {
    slotTaken: "That time was just taken. Here are the nearest free times.",
    bookingPaused: "Online booking is temporarily unavailable. Please call our desk.",
    submitFailed: "We could not submit your request. Please try again.",
  },
  scheduleAt: (day: string, time: string) => `${day} at ${time}`,
};
