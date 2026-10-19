export interface BookingCopy {
  steps: {
    contact: string;
    service: string;
    clinic: string;
    doctorAndTime: string;
    notes: string;
    review: string;
  };
  contactStep: {
    title: string;
    defaultNotice: string;
    nameLabel: string;
    namePlaceholder: string;
    nameError: string;
    phoneLabel: string;
    phonePlaceholder: string;
    phoneError: string;
    phoneLockedNotice: string;
    emailLabel: string;
    emailPlaceholder: string;
    emailError: string;
    continueButton: string;
  };
  serviceStep: {
    title: string;
    subtitle: string;
    emptyMessage: string;
    backButton: string;
    continueButton: string;
  };
  clinicStep: {
    title: string;
    subtitle: string;
    emptyMessage: string;
    mainBranchBadge: string;
    backButton: string;
    continueButton: string;
  };
  doctorStep: {
    title: string;
    subtitle: string;
    autoSelectedNotice: string;
    singleDoctorIntro: string;
    patientsTreated: string;
    scheduleLabel: string;
    timesLabel: string;
    showMoreDays: string;
    showFewerDays: string;
    noSlotsMessage: string;
    backButton: string;
    continueButton: string;
  };
  notesStep: {
    title: string;
    subtitle: string;
    bookingForLabel: string;
    bookingForMyself: string;
    bookingForSomeoneElse: string;
    patientNameLabel: string;
    patientNamePlaceholder: string;
    patientNameError: string;
    notesLabel: string;
    notesPlaceholder: string;
    backButton: string;
    continueButton: string;
  };
  reviewStep: {
    title: string;
    subtitle: string;
    treatmentLabel: string;
    clinicLabel: string;
    clinicianLabel: string;
    dateTimeLabel: string;
    patientLabel: string;
    bookedByLabel: string;
    phoneLabel: string;
    notesLabel: string;
    directConfirmationNotice: string;
    backButton: string;
    confirmButton: string;
  };
  confirmationStep: {
    eyebrow: string;
    title: string;
    subtitle: string;
    referenceLabel: string;
    branchLabel: string;
    clinicianLabel: string;
    timeLabel: string;
    phoneLabel: string;
    returnHomeButton: string;
  };
  errors: {
    slotTaken: string;
    generalSubmit: string;
    bookingPausedSubmit: string;
    callClinicPrompt: string;
  };
  pausedBanner: {
    title: string;
    defaultMessage: string;
    callButton: string;
  };
}

export const bookingCopy: Record<string, BookingCopy> = {
  en: {
    steps: {
      contact: "1. Contact",
      service: "2. Service",
      clinic: "3. Clinic",
      doctorAndTime: "4. Doctor & Time",
      notes: "5. Notes",
      review: "6. Review",
    },
    contactStep: {
      title: "Let's start with your contact details",
      defaultNotice: "We save your details so we can help you finish booking.",
      nameLabel: "Your full name",
      namePlaceholder: "e.g. Dr. Ayesha Malik",
      nameError: "Please share your full name so we know who to prepare for.",
      phoneLabel: "Mobile phone number",
      phonePlaceholder: "+92 300 1234567",
      phoneError: "Please provide a valid mobile number where we can reach you.",
      phoneLockedNotice: "Caller phone number is locked from the active desk line.",
      emailLabel: "Email address (optional)",
      emailPlaceholder: "ayesha@example.com",
      emailError: "Please enter a valid email address so we can send your appointment details.",
      continueButton: "Continue",
    },
    serviceStep: {
      title: "What dental care do you need?",
      subtitle: "Select the primary treatment or checkup you wish to book.",
      emptyMessage: "No appointments are open online right now. Please call us directly and we'll gladly find a time for you.",
      backButton: "Back",
      continueButton: "Continue to Clinic",
    },
    clinicStep: {
      title: "Which clinic location would you like to visit?",
      subtitle: "We value your time, so please choose the clinic that suits you best.",
      emptyMessage: "This treatment isn't currently scheduled at our other branch. Please select an available location or give us a call.",
      mainBranchBadge: "Main Branch",
      backButton: "Back",
      continueButton: "Continue to Doctor",
    },
    doctorStep: {
      title: "Choose your doctor and time",
      subtitle: "Select your clinician and an open time slot that suits you.",
      autoSelectedNotice: "Doctor assigned for this service at this clinic:",
      singleDoctorIntro: "Your dedicated clinician for this visit:",
      patientsTreated: "patients treated",
      scheduleLabel: "Schedule:",
      timesLabel: "Available Appointment Times:",
      showMoreDays: "Show more days",
      showFewerDays: "Show fewer days",
      noSlotsMessage: "There are no open times within the next week. Please check back soon or call our reception desk.",
      backButton: "Back",
      continueButton: "Continue to Notes",
    },
    notesStep: {
      title: "Tell us in your own words",
      subtitle: "Anything specific you would like your doctor to know in advance?",
      bookingForLabel: "Booking for:",
      bookingForMyself: "Myself",
      bookingForSomeoneElse: "Someone else",
      patientNameLabel: "Patient's full name",
      patientNamePlaceholder: "e.g. Tariq Vance",
      patientNameError: "Please provide the patient's full name.",
      notesLabel: "Tell us in your own words (Optional)",
      notesPlaceholder: "e.g. Tooth sensitivity, chipped tooth, past dental anxiety, or specific concerns...",
      backButton: "Back",
      continueButton: "Review & Confirm",
    },
    reviewStep: {
      title: "Review and confirm",
      subtitle: "Double check your appointment details before final confirmation.",
      treatmentLabel: "Treatment / Service:",
      clinicLabel: "Clinic Branch:",
      clinicianLabel: "Clinician:",
      dateTimeLabel: "Appointment Date & Time:",
      patientLabel: "Patient:",
      bookedByLabel: "Booked by:",
      phoneLabel: "Telephone:",
      notesLabel: "Notes:",
      directConfirmationNotice: "Direct confirmation enabled. Your appointment slot is reserved immediately upon submission.",
      backButton: "Back",
      confirmButton: "Confirm Appointment",
    },
    confirmationStep: {
      eyebrow: "Reservation Confirmed",
      title: "You are all set.",
      subtitle: "Thank you for choosing Marlow Dental. We look forward to welcoming you for your consultation.",
      referenceLabel: "Booking Reference:",
      branchLabel: "Clinic Branch:",
      clinicianLabel: "Clinician:",
      timeLabel: "Scheduled Time:",
      phoneLabel: "Contact Phone:",
      returnHomeButton: "Return to Homepage",
    },
    errors: {
      slotTaken: "That time was just taken. Here are the nearest free times.",
      generalSubmit: "We could not complete your reservation right now. Please call our clinic directly and we will reserve your time immediately.",
      bookingPausedSubmit: "Online booking is temporarily paused. Please call our clinic to schedule.",
      callClinicPrompt: "Please contact our desk directly at",
    },
    pausedBanner: {
      title: "Online Booking Paused",
      defaultMessage: "Online booking is paused for a moment while we update our schedule. Please call us and our reception team will book you right in.",
      callButton: "Call Reception",
    },
  },
  ur: {
    steps: {
      contact: "1. رابطہ",
      service: "2. سروس",
      clinic: "3. کلینک",
      doctorAndTime: "4. ڈاکٹر اور وقت",
      notes: "5. نوٹس",
      review: "6. تصدیق",
    },
    contactStep: {
      title: "آئیے آپ کے رابطے کی تفصیلات سے آغاز کریں",
      defaultNotice: "ہم آپ کی تفصیلات محفوظ کرتے ہیں تاکہ بکنگ مکمل کرنے میں آپ کی مدد کر سکیں۔",
      nameLabel: "آپ کا پورا نام",
      namePlaceholder: "مثلاً ڈاکٹر عائشہ ملک",
      nameError: "براہ کرم اپنا پورا نام درج کریں۔",
      phoneLabel: "موبائل فون نمبر",
      phonePlaceholder: "+92 300 1234567",
      phoneError: "براہ کرم ایک درست موبائل نمبر فراہم کریں۔",
      phoneLockedNotice: "کالر فون نمبر فعال لائن سے مقفل ہے۔",
      emailLabel: "ای میل ایڈریس (اختیاری)",
      emailPlaceholder: "ayesha@example.com",
      emailError: "براہ کرم درست ای میل پتہ درج کریں۔",
      continueButton: "آگے بڑھیں",
    },
    serviceStep: {
      title: "آپ کو کس قسم کے علاج کی ضرورت ہے؟",
      subtitle: "براہ کرم مطلوبہ علاج یا چیک اپ منتخب کریں۔",
      emptyMessage: "اس وقت آن لائن بکنگ دستیاب نہیں ہے۔ براہ کرم براہ راست کال کریں۔",
      backButton: "پیچھے",
      continueButton: "کلینک کا انتخاب کریں",
    },
    clinicStep: {
      title: "آپ کس کلینک برانچ میں آنا چاہیں گے؟",
      subtitle: "ہم آپ کے وقت کی قدر کرتے ہیں، براہ کرم مناسب کلینک منتخب کریں۔",
      emptyMessage: "یہ علاج دوسری برانچ میں فی الحال دستیاب نہیں ہے۔",
      mainBranchBadge: "مرکزی برانچ",
      backButton: "پیچھے",
      continueButton: "ڈاکٹر کا انتخاب کریں",
    },
    doctorStep: {
      title: "اپنے ڈاکٹر اور وقت کا انتخاب کریں",
      subtitle: "اپنے معالج اور مناسب وقت کی سلاٹ منتخب کریں۔",
      autoSelectedNotice: "اس سروس کے لیے مقرر کردہ ڈاکٹر:",
      singleDoctorIntro: "اس معائنے کے لیے آپ کے معالج:",
      patientsTreated: "مریضوں کا علاج کیا گیا",
      scheduleLabel: "اوقات کار:",
      timesLabel: "دستیاب اوقات:",
      showMoreDays: "مزید دن دکھائیں",
      showFewerDays: "کم دن دکھائیں",
      noSlotsMessage: "اگلے ہفتے میں کوئی وقت دستیاب نہیں ہے۔",
      backButton: "پیچھے",
      continueButton: "نوٹس کی طرف بڑھیں",
    },
    notesStep: {
      title: "اپنے الفاظ میں بتائیں",
      subtitle: "کیا کوئی خاص بات ہے جو آپ ڈاکٹر کو پہلے سے بتانا چاہتے ہیں؟",
      bookingForLabel: "بکنگ برائے:",
      bookingForMyself: "میرے اپنے لیے",
      bookingForSomeoneElse: "کسی اور کے لیے",
      patientNameLabel: "مریض کا پورا نام",
      patientNamePlaceholder: "مثلاً طارق وینس",
      patientNameError: "براہ کرم مریض کا نام درج کریں۔",
      notesLabel: "اپنے الفاظ میں بتائیں (اختیاری)",
      notesPlaceholder: "مثلاً دانت میں درد، حساسیت، یا کوئی خاص مسئلہ...",
      backButton: "پیچھے",
      continueButton: "جائزہ لیں اور تصدیق کریں",
    },
    reviewStep: {
      title: "جائزہ لیں اور تصدیق کریں",
      subtitle: "حتمی تصدیق سے پہلے اپنی اپائنٹمنٹ کی تفصیلات چیک کر لیں۔",
      treatmentLabel: "علاج / سروس:",
      clinicLabel: "کلینک برانچ:",
      clinicianLabel: "معالج:",
      dateTimeLabel: "تاریخ اور وقت:",
      patientLabel: "مریض:",
      bookedByLabel: "بکنگ کرنے والا:",
      phoneLabel: "ٹیلی فون:",
      notesLabel: "نوٹس:",
      directConfirmationNotice: "براہ راست تصدیق فعال ہے۔ آپ کی سلاٹ فوری طور پر بک ہو جائے گی۔",
      backButton: "پیچھے",
      confirmButton: "اپائنٹمنٹ کی تصدیق کریں",
    },
    confirmationStep: {
      eyebrow: "بکنگ محفوظ ہو گئی",
      title: "آپ کی بکنگ مکمل ہو چکی ہے۔",
      subtitle: "مارلو ڈینٹل کا انتخاب کرنے کا شکریہ۔",
      referenceLabel: "بکنگ ریفرنس:",
      branchLabel: "کلینک برانچ:",
      clinicianLabel: "معالج:",
      timeLabel: "مقررہ وقت:",
      phoneLabel: "رابطہ نمبر:",
      returnHomeButton: "ہوم پیج پر واپس جائیں",
    },
    errors: {
      slotTaken: "That time was just taken. Here are the nearest free times.",
      generalSubmit: "ہم ابھی آپ کی بکنگ مکمل نہیں کر سکے۔ براہ کرم براہ راست کال کریں۔",
      bookingPausedSubmit: "آن لائن بکنگ عارضی طور پر موقوف ہے۔",
      callClinicPrompt: "براہ کرم ہمارے ڈیسک پر رابطہ کریں:",
    },
    pausedBanner: {
      title: "آن لائن بکنگ عارضی طور پر موقوف ہے",
      defaultMessage: "آن لائن بکنگ موقوف ہے۔ براہ کرم کال کریں اور ہماری ٹیم آپ کی اپائنٹمنٹ بک کر دے گی۔",
      callButton: "ریسیپشن پر کال کریں",
    },
  },
};
