export type SupportedLocale = "en" | "ur";

export interface UiCopyDictionary {
  book: string;
  call: string;
  menu: string;
  retry: string;
  close: string;
  search: string;
  treatments: string;
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
    call: "Call",
    menu: "Menu",
    retry: "Retry",
    close: "Close",
    search: "Search",
    treatments: "Treatments We Offer",
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
    call: "کال کریں",
    menu: "مینو",
    retry: "دوبارہ کوشش کریں",
    close: "بند کریں",
    search: "تلاش کریں",
    treatments: "ہماری پیش کردہ خدمات",
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

