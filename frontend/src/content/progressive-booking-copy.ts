/**
 * Conversational copy for the public progressive booking flow (`/book`).
 *
 * Every user-facing string rendered by `ProgressiveBookingFlow` lives here so
 * the public flow has a single source of truth, matching the call desk wizard's
 * `booking-copy.ts`. Strings that embed a runtime value are exposed as small
 * functions so the surrounding wording stays in this module.
 *
 * Fully localized for English ("en") and Urdu ("ur").
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
 * Copy for the public progressive booking flow (English).
 */
export const progressiveBookingCopy: ProgressiveBookingCopy = {
  header: {
    badge: "Private Appointments",
    heading: "Reserve Your Dental Consultation",
    subheading:
      "Book your appointment online in a few steps.",
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

/**
 * Copy for the public progressive booking flow (Urdu).
 */
export const progressiveBookingCopyUrdu: ProgressiveBookingCopy = {
  header: {
    badge: "نجی اپائنٹمنٹس",
    heading: "ڈینٹل کنسلٹیشن کا وقت طے کریں",
    subheading: "چند آسان مراحل میں اپنی آن لائن اپائنٹمنٹ بک کریں۔",
    stepsNavLabel: "بکنگ کے مراحل",
    stepLabels: {
      contact: "رابطے کی تفصیلات",
      waterfall: "سروس و وقت کا انتخاب",
      review: "خلاصہ اور جائزہ",
    },
    stepAriaLabel: (step: number, label: string) => `مرحلہ ${step}: ${label}`,
  },
  contact: {
    pageLabel: "صفحہ 1 از 3 · مریض کی معلومات",
    heading: "یہ اپائنٹمنٹ کس کے لیے ہے؟",
    subheading:
      "ہم یہ تفصیلات آپ کی پیشرفت محفوظ کرنے اور اپائنٹمنٹ کی تصدیق کے لیے کال کرنے کی خاطر استعمال کریں گے۔",
    fullNameLabel: "پورا نام",
    fullNamePlaceholder: "مثلاً ڈاکٹر عالیہ خان",
    fullNameError: "براہ کرم اپنا پورا نام درج کریں۔",
    phoneLabel: "موبائل فون نمبر",
    phonePlaceholder: "+92 300 1234567",
    phoneError: "براہ کرم ایک درست موبائل نمبر فراہم کریں۔",
    emailLabel: "ای میل ایڈریس",
    emailHelpText: "اختیاری",
    emailPlaceholder: "patient@example.com",
    emailError: "براہ کرم درست ای میل پتہ درج کریں۔",
    forSomeoneElseLabel:
      "میں فیملی ممبر، بچے یا کسی اور کے لیے بکنگ کر رہا/رہی ہوں",
    dependentNameLabel: "مریض کا مکمل قانونی نام",
    dependentNamePlaceholder: "مریض کا پورا نام درج کریں",
    dependentNameError: "براہ کرم مریض کا مکمل قانونی نام فراہم کریں۔",
    notesLabel: "طبی مسئلہ یا مخصوص علامات (اختیاری)",
    notesPlaceholder:
      "مثلاً ٹھنڈا گرم لگنا، معمول کا معائنہ، یا دانتوں کی سیدھ کا علاج...",
    continueButton: "آگے بڑھیں",
  },
  waterfall: {
    pageLabel: "صفحہ 2 از 3 · انتخاب کے مراحل",
    heading: "علاج، کلینک برانچ اور وقت منتخب کریں",
    subheading:
      "ہر انتخاب اگلا مرحلہ دکھاتا ہے: مطلوبہ علاج کے کلینکس، وہاں کے معالجین اور دستیاب حقیقی اوقات۔",
    treatmentHeading: "1. علاج / سروس",
    cityHeading: "2. شہر",
    clinicHeading: (hasCityStep: boolean) => (hasCityStep ? "3. کلینک برانچ" : "2. کلینک برانچ"),
    doctorHeading: "ڈاکٹر / معالج",
    dateTimeHeading: "تاریخ اور وقت",
    loadingTreatments: "علاج کی تفصیلات لوڈ ہو رہی ہیں...",
    loadingClinics: "کلینک برانچیں لوڈ ہو رہی ہیں...",
    loadingClinicians: "معالجین لوڈ ہو رہے ہیں...",
    errorTreatments: "علاج کی تفصیلات لوڈ نہیں ہو سکیں۔ براہ کرم دوبارہ کوشش کریں۔",
    errorClinics: "اس علاج کی برانچیں لوڈ نہیں ہو سکیں۔ براہ کرم دوسرا علاج منتخب کریں۔",
    errorClinicians: "اس کلینک کے ڈاکٹرز لوڈ نہیں ہو سکے۔ براہ کرم دوبارہ کوشش کریں۔",
    retryButton: "دوبارہ کوشش کریں",
    mainBranchBadge: "مرکزی برانچ",
    noCliniciansAtClinic:
      "اس منتخب علاج کے لیے اس برانچ میں فی الحال کوئی ڈاکٹر دستیاب نہیں ہے۔ براہ کرم کوئی دوسری برانچ منتخب کریں۔",
    noOpenDays:
      "اس علاج کے لیے معالج کے پاس فی الحال کوئی تاریخ دستیاب نہیں ہے۔ براہ کرم دوسرا معالج منتخب کریں۔",
    clinicTelPrefix: " · فون: ",
    patientsTreatedBadge: (count: number) => `${count} مریضوں کا علاج کیا گیا`,
    patientsTreatedShortBadge: (count: number) => `${count} مریض`,
    slotsCountLabel: (count: number) => `${count} دستیاب اوقات`,
    showAllDays: (count: number) => `تمام ${count} دستیاب دن دیکھیں`,
    backToContact: "رابطے کی تفصیلات پر واپس جائیں",
    continueToSummary: "خلاصہ دیکھیں",
    chooseDifferentTime: "کوئی دوسرا وقت منتخب کریں",
    groupLabels: {
      treatments: "علاج",
      cities: "شہر",
      clinics: "کلینک برانچیں",
      clinicians: "معالجین",
      appointmentDays: "اپائنٹمنٹ کے دن",
    },
  },
  review: {
    pageLabel: "صفحہ 3 از 3 · خلاصہ و جائزہ",
    heading: "اپنی اپائنٹمنٹ کی تفصیلات کا جائزہ لیں",
    subheading:
      "درخواست بھیجنے پر ہمارا ریسیپشن عملہ حتمی وقت کی توثیق کے لیے آپ کو فون کرے گا۔",
    patientLabel: "مریض",
    contactLabel: "رابطہ",
    treatmentLabel: "علاج / سروس",
    clinicLabel: "کلینک برانچ",
    clinicianLabel: "معالج",
    scheduleLabel: "مقررہ وقت",
    notesLabel: "آپ کے نوٹس:",
    privacyNotice:
      "آپ کی معلومات محفوظ ہیں اور صرف اس اپائنٹمنٹ کے انتظام کے لیے استعمال کی جائیں گی۔",
    backToEdit: "انتخابات میں تبدیلی کریں",
    confirmButton: "اپائنٹمنٹ کی درخواست بھیجیں",
  },
  confirmation: {
    eyebrow: "بکنگ درخواست موصول ہو گئی",
    heading: "ہم آپ کے خیر مقدم کے منتظر ہیں",
    receptionWillCallPrefix:
      "آپ کی اپائنٹمنٹ کی درخواست موصول ہو چکی ہے۔ ہمارا ریسیپشن عملہ",
    receptionWillCallSuffix: "پر رابطہ کر کے حتمی وقت کی توثیق کرے گا۔",
    referenceLabel: "ریفرنس کوڈ",
    callbackWindowLabel: (window: string) => `متوقع رابطہ وقت: ${window}`,
    patientLabel: "مریض:",
    treatmentLabel: "علاج:",
    clinicLabel: "کلینک:",
    clinicianLabel: "معالج:",
    scheduleLabel: "شیڈول:",
    returnHomeButton: "ہوم پیج پر واپس جائیں",
  },
  errors: {
    slotTaken: "یہ وقت ابھی بک ہو چکا ہے۔ یہاں قریبی دستیاب اوقات موجود ہیں۔",
    bookingPaused: "آن لائن بکنگ عارضی طور پر موقوف ہے۔ براہ کرم براہ راست کال کریں۔",
    submitFailed: "درخواست ارسال نہیں ہو سکی۔ براہ کرم دوبارہ کوشش کریں۔",
  },
  scheduleAt: (day: string, time: string) => `${day} بوقت ${time}`,
};

/**
 * Get progressive booking copy for given locale.
 */
export function getProgressiveBookingCopy(locale: string = "en"): ProgressiveBookingCopy {
  return locale === "ur" ? progressiveBookingCopyUrdu : progressiveBookingCopy;
}
