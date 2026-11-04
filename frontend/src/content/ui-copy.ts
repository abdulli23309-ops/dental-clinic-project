export type SupportedLocale = "en" | "ur";

export interface UiCopyDictionary {
  book: string;
  bookAppointment: string;
  call: string;
  copyPhone: string;
  phoneCopied: string;
  popular: string;
  treatmentsFrom: string;
  feeFrom: string;
  consultationRequired: string;
  clinicalExcellence: string;
  clinicalExcellenceDesc: string;
  allTreatments: string;
  signatureExam: string;
  signatureExamTitle: string;
  signatureExamDesc: string;
  bookInitialExam: string;
  weeklySchedule: string;
  primaryClinic: string;
  allClinics: string;
  closed: string;
  followUs: string;
  explore: string;
  location: string;
  clinicHours: string;
  onlineReservation: string;
  enterBookingDetails: string;
  fullName: string;
  mobilePhone: string;
  enterFullNameError: string;
  enterValidPhoneError: string;
  modernDentalCare: string;
  menu: string;
  retry: string;
  close: string;
  search: string;
  treatments: string;
  whyUs: string;
  successStories: string;
  team: string;
  locationsAndTiming: string;
  faqs: string;
  blogs: string;
  temporarilyUnavailableTitle: string;
  temporarilyUnavailableMessage: string;
  retryButton: string;
  openNow: string;
  closedNow: string;
  closedToday: string;
  privacy: string;
  terms: string;
  accessibility: string;
  allRightsReserved: string;
  getDirections: string;
  viewTreatmentFees: string;
  returnToHomepage: string;
  galleryEyebrow: string;
  galleryTitle: string;
  galleryDesc: string;
  clinicalSuite: string;
  clinicAtmosphere: string;
  insideOurClinic: string;
  closeImagePreview: string;
  expandedClinicView: string;
  branchSchedule: string;
  assignedDoctors: string;
  viewDetails: string;
  hideDetails: string;
  noAssignedDoctors: string;
  allSpecialists: string;
  noDoctorsForCity: string;
  specialistsEyebrow: string;
  specialistsDesc: string;
  facilitiesEyebrow: string;
  experienceYears: string;
  nextAvailable: string;
  todayTime: string;
  director: string;
  patientsTreatedSuffix: string;
  bookConsultation: string;
  previousTreatments: string;
  nextTreatments: string;
  previousClinicians: string;
  nextClinicians: string;
  careSuffix: string;
  daysOfWeek: string[];
  galleryCaptions: Record<string, string>;
}

export const UI_COPY: Record<SupportedLocale, UiCopyDictionary> = {
  en: {
    book: "Book",
    bookAppointment: "Book an Appointment",
    call: "Call",
    copyPhone: "Copy phone",
    phoneCopied: "Copied!",
    popular: "Popular:",
    treatmentsFrom: "Treatments from",
    feeFrom: "Fee from",
    consultationRequired: "Consultation Required",
    clinicalExcellence: "Clinical Excellence",
    clinicalExcellenceDesc:
      "From routine preventive checkups to advanced reconstructive and cosmetic dentistry, delivered with gentle precision.",
    allTreatments: "All Treatments",
    signatureExam: "Signature Comprehensive Checkup",
    signatureExamTitle: "Complete Oral Health & Digital Diagnostic Examination",
    signatureExamDesc:
      "Includes full periodontal charting, high-definition digital imaging, oral cancer screening, and a transparent itemized care plan.",
    bookInitialExam: "Book Initial Exam",
    weeklySchedule: "Weekly Clinic Schedule",
    primaryClinic: "Primary Clinic",
    allClinics: "All Clinics",
    closed: "Closed",
    followUs: "Follow Us",
    explore: "Explore",
    location: "Location",
    clinicHours: "Clinic Hours",
    onlineReservation: "Online Reservation",
    enterBookingDetails: "Enter your details to reserve your preferred consultation time.",
    fullName: "Full Name",
    mobilePhone: "Mobile Phone",
    enterFullNameError: "Please enter your full name.",
    enterValidPhoneError: "Please enter a valid mobile number (at least 10 digits).",
    modernDentalCare: "Modern dental care focused on your comfort and peace of mind",
    menu: "Menu",
    retry: "Retry",
    close: "Close",
    search: "Search",
    treatments: "Treatments We Offer",
    whyUs: "Why Choose Us",
    successStories: "Success Stories",
    team: "Our Team",
    locationsAndTiming: "Our Locations & Timing",
    faqs: "FAQs",
    blogs: "Blogs",
    temporarilyUnavailableTitle: "Temporarily Unavailable",
    temporarilyUnavailableMessage:
      "Clinic information is temporarily unavailable. Please retry shortly.",
    retryButton: "Retry Connection",
    openNow: "Open Now",
    closedNow: "Closed Now",
    closedToday: "Closed Today",
    privacy: "Privacy",
    terms: "Terms",
    accessibility: "Accessibility",
    allRightsReserved: "All rights reserved.",
    getDirections: "Get Directions",
    viewTreatmentFees: "Treatments We Offer",
    returnToHomepage: "Return to Homepage",
    galleryEyebrow: "Clinical Atmosphere",
    galleryTitle: "Inside Our Modern Clinic",
    galleryDesc:
      "Step into our serene, sterile clinical suites engineered for maximum comfort, hospital-grade hygiene, and precision dental artistry.",
    clinicalSuite: "Clinical Suite",
    clinicAtmosphere: "Clinical Atmosphere",
    insideOurClinic: "Inside Our Modern Clinic",
    closeImagePreview: "Close image preview",
    expandedClinicView: "Expanded clinic view",
    branchSchedule: "Weekly Schedule",
    assignedDoctors: "Assigned Doctors & Specialists",
    viewDetails: "View Hours & Details",
    hideDetails: "Hide Details",
    noAssignedDoctors: "Specialists on rotation. Call clinic for today's doctor schedule.",
    allSpecialists: "All Clinicians",
    noDoctorsForCity: "No clinicians currently assigned to this city.",
    specialistsEyebrow: "Clinical Specialists",
    specialistsDesc:
      "Dedicated clinicians committed to continuous medical education, compassionate communication, and meticulous clinical artistry.",
    facilitiesEyebrow: "Facilities & Office Timing",
    experienceYears: "Years Experience",
    nextAvailable: "Next Available",
    todayTime: "Today, 2:30 PM",
    director: "Director",
    patientsTreatedSuffix: "Patients Treated",
    bookConsultation: "Book Consultation",
    previousTreatments: "Previous treatments",
    nextTreatments: "Next treatments",
    previousClinicians: "Previous clinicians",
    nextClinicians: "Next clinicians",
    careSuffix: "Care",
    daysOfWeek: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    galleryCaptions: {
      "Sterile Surgical Suite": "Sterile Surgical Suite",
      "Diagnostic & Preventive Station": "Diagnostic & Preventive Station",
      "Endodontic Microsurgery Suite": "Endodontic Microsurgery Suite",
      "Patient Comfort & Smile Lounge": "Patient Comfort & Smile Lounge",
    },
  },
  ur: {
    book: "بک کریں",
    bookAppointment: "ملاقات کا وقت لیں",
    call: "کال کریں",
    copyPhone: "فون کاپی کریں",
    phoneCopied: "کاپی ہو گیا!",
    popular: "مقبول:",
    treatmentsFrom: "فیس شروع از",
    feeFrom: "فیس شروع از",
    consultationRequired: "معائنہ ضروری ہے",
    clinicalExcellence: "طبی مہارت",
    clinicalExcellenceDesc:
      "معمول کے حفاظتی معائنے سے لے کر جدید سرجری اور کاسمیٹک ڈینٹسٹری تک، اعلیٰ ترین معیار کے ساتھ۔",
    allTreatments: "تمام خدمات",
    signatureExam: "خصوصی تفصیلی معائنہ",
    signatureExamTitle: "مکمل دانتوں کا معائنہ اور ڈیجیٹل تشخیص",
    signatureExamDesc:
      "مسوڑھوں کی مکمل جانچ، ہائی ڈیفینیشن ڈیجیٹل ایکسرے، اور مکمل علاج کا منصوبہ شامل ہے۔",
    bookInitialExam: "ابتدائی معائنہ بک کریں",
    weeklySchedule: "ہفتہ وار کلینک شیڈول",
    primaryClinic: "مرکزی کلینک",
    allClinics: "تمام برانچز",
    closed: "بند ہے",
    followUs: "ہمیں فالو کریں",
    explore: "مزید دیکھیں",
    location: "پتہ",
    clinicHours: "اوقات کار",
    onlineReservation: "آن لائن بکنگ",
    enterBookingDetails: "اپنی ترجیحی اپائنٹمنٹ کے لیے تفصیلات درج کریں۔",
    fullName: "پورا نام",
    mobilePhone: "موبائل فون نمبر",
    enterFullNameError: "براہ کرم اپنا پورا نام درج کریں۔",
    enterValidPhoneError: "براہ کرم درست موبائل نمبر درج کریں (کم از کم 10 ہندسے)۔",
    modernDentalCare: "جدید ڈینٹل کیئر — آپ کے آرام اور اطمینان کے لیے",
    menu: "مینو",
    retry: "دوبارہ کوشش کریں",
    close: "بند کریں",
    search: "تلاش کریں",
    treatments: "ہماری پیش کردہ خدمات",
    whyUs: "ہمیں کیوں منتخب کریں",
    successStories: "کامیاب کہانیاں",
    team: "ہماری ٹیم",
    locationsAndTiming: "ہماری برانچز اور اوقات",
    faqs: "اکثر پوچھے گئے سوالات",
    blogs: "بلاگز",
    temporarilyUnavailableTitle: "عارضی طور پر دستیاب نہیں",
    temporarilyUnavailableMessage:
      "کلینک کی معلومات عارضی طور پر دستیاب نہیں ہیں۔ براہ کرم کچھ دیر بعد دوبارہ کوشش کریں۔",
    retryButton: "دوبارہ کوشش کریں",
    openNow: "اب کھلا ہے",
    closedNow: "اب بند ہے",
    closedToday: "آج بند ہے",
    privacy: "پرائیویسی پالیسی",
    terms: "شرائط و ضوابط",
    accessibility: "رسائی",
    allRightsReserved: "جملہ حقوق محفوظ ہیں۔",
    getDirections: "راستہ معلوم کریں",
    viewTreatmentFees: "ہماری پیش کردہ خدمات",
    returnToHomepage: "ہوم پیج پر واپس جائیں",
    galleryEyebrow: "کلینک کا ماحول اور سہولیات",
    galleryTitle: "ہمارے جدید کلینک کا اندرونی منظر",
    galleryDesc:
      "ہمارے پرسکون اور جراثیم سے پاک کلینیکل سویٹس میں قدم رکھیں جو مکمل آرام، ہسپتال گریڈ حفظانِ صحت اور جدید ترین ڈینٹل آرٹسٹری کے لیے ڈیزائن کیے گئے ہیں۔",
    clinicalSuite: "کلینیکل سویٹ",
    clinicAtmosphere: "کلینک کا ماحول",
    insideOurClinic: "ہمارے کلینک کا اندرونی جائزہ",
    closeImagePreview: "تصویر بند کریں",
    expandedClinicView: "کلینک کا تفصیلی منظر",
    branchSchedule: "ہفتہ وار شیڈول",
    assignedDoctors: "متعلقہ ڈاکٹرز اور ماہرین",
    viewDetails: "تفصیلات اور اوقات دیکھیں",
    hideDetails: "تفصیلات چھپائیں",
    noAssignedDoctors: "ماہرین کی روٹیشن جاری ہے۔ تازہ ترین شیڈول کے لیے کلینک سے رابطہ کریں۔",
    allSpecialists: "تمام ماہر ڈاکٹرز",
    noDoctorsForCity: "اس شہر کے لیے فی الوقت کوئی ڈاکٹر متعین نہیں ہے۔",
    specialistsEyebrow: "طبی ماہرین",
    specialistsDesc:
      "اعلیٰ طبی تعلیم، پرخلوص دیکھ بھال اور نفیس ترین علاج کے لیے وقف شدہ ماہر دندان۔",
    facilitiesEyebrow: "برانچز اور اوقات کار",
    experienceYears: "سال کا تجربہ",
    nextAvailable: "اگلی دستیابی",
    todayTime: "آج، 2:30 بعد دوپہر",
    director: "ڈائریکٹر",
    patientsTreatedSuffix: "مریضوں کا علاج کیا گیا",
    bookConsultation: "مشاورت بک کریں",
    previousTreatments: "پچھلی خدمات",
    nextTreatments: "اگلی خدمات",
    previousClinicians: "پچھلے ڈاکٹرز",
    nextClinicians: "اگلے ڈاکٹرز",
    careSuffix: "کیئر",
    daysOfWeek: [
      "پیر",
      "منگل",
      "بدھ",
      "جمعرات",
      "جمعہ",
      "ہفتہ",
      "اتوار",
    ],
    galleryCaptions: {
      "Sterile Surgical Suite": "جراثیم سے پاک سرجیکل سویٹ",
      "Diagnostic & Preventive Station": "تشخیصی اور حفاظتی کیئر اسٹیشن",
      "Endodontic Microsurgery Suite": "اینڈوڈونٹک مائیکرو سرجری سویٹ",
      "Patient Comfort & Smile Lounge": "مریضوں کے آرام اور مسکراہٹ کا لاؤنج",
    },
  },
};

export function getUiCopy(locale: SupportedLocale = "en"): UiCopyDictionary {
  return UI_COPY[locale] || UI_COPY.en;
}
