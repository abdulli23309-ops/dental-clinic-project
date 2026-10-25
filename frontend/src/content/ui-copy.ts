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
  heroHeadingUr: string;
  heroDescriptionUr: string;
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
    heroHeadingUr: "Not all heroes wear capes. Some wear gloves.",
    heroDescriptionUr:
      "We fix problems. You keep smiling. From routine checkups to complex root canals, trust our expert team in Islamabad for a fresh, confident smile.",
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
    heroHeadingUr: "ہر ہیرو کیپ نہیں پہنتا۔ کچھ دستانے پہنتے ہیں۔",
    heroDescriptionUr:
      "ہم آپ کی پریشانی دور کرتے ہیں اور مسکراہٹ برقرار رکھتے ہیں۔ معمول کے معائنے سے لے کر روٹ کینال تک، اسلام آباد میں ماہر ٹیم پر اعتماد کریں۔",
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
  },
};

export function getUiCopy(locale: SupportedLocale = "en"): UiCopyDictionary {
  return UI_COPY[locale] || UI_COPY.en;
}
