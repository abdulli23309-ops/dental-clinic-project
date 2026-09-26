/**
 * API Service Abstraction Layer: Marlow Dental
 *
 * This file is the single boundary where future HTTP fetch calls to the
 * FastAPI and MongoDB Atlas backend will live.
 *
 * Planned backend endpoints:
 * - POST /api/appointments (Booking request submission)
 * - GET  /api/availability?date=&service= (Real-time chair openings)
 * - GET  /api/services (Service catalogue and pricing)
 * - GET  /api/reviews (Verified Google Places/business reviews)
 */

export interface ServiceItem {
  id: string;
  category: "preventive" | "restorative" | "cosmetic" | "emergency";
  title: string;
  shortDesc: string;
  fullDesc: string;
  duration: string;
  cashPrice: string;
  insuranceNote: string;
  code?: string;
  recommendedInterval?: string;
}

export interface DoctorProfile {
  name: string;
  credentials: string;
  title: string;
  licenseNumber: string;
  licenseState: string;
  experienceYears: number;
  almaMater: string;
  undergrad: string;
  memberships: string[];
  certifications: string[];
  philosophy: string[];
}

export interface FaqItem {
  id: string;
  category: "insurance" | "pricing" | "comfort" | "scheduling";
  question: string;
  answer: string;
}

export interface BookingPayload {
  serviceId: string;
  preferredDate: string;
  preferredTime: string;
  fullName: string;
  phone: string;
  email: string;
  hasInsurance: boolean;
  insuranceProvider?: string;
  notes?: string;
  utmSource?: string;
  utmCampaign?: string;
}

export interface BookingResponse {
  success: boolean;
  confirmationId: string;
  message: string;
  estimatedCallbackWindow: string;
}

/* -------------------------------------------------------------
 * MOCK DATA ARRAYS (Pending FastAPI backend integration)
 * ------------------------------------------------------------- */

export const MOCK_SERVICES: ServiceItem[] = [
  {
    id: "cleanings-exams",
    category: "preventive",
    title: "Cleanings & Comprehensive Exams",
    shortDesc: "Complete checkup, digital low-radiation bitewing X-rays, ultrasonic scaling, and honest consultation.",
    fullDesc: "We thoroughly assess periodontal health, soft tissues, and tooth enamel. You see the digital X-rays directly on the chairside display with Dr. Marlow explaining every observation before any decision.",
    duration: "45 to 60 min",
    cashPrice: "from $140",
    insuranceNote: "Usually 100% covered by most dental PPO plans twice per year.",
    code: "CDT D0150 / D1110",
    recommendedInterval: "Every 6 months",
  },
  {
    id: "fillings-crowns",
    category: "restorative",
    title: "Tooth-Colored Fillings & Ceramic Crowns",
    shortDesc: "Composite fillings matched to tooth shade, and custom in-office ceramic crowns restoring natural bite.",
    fullDesc: "We use biocompatible composite resins precisely color-matched to your tooth shade. For fractured or weakened molars, custom ceramic crowns restore natural chewing anatomy without dark metal margins.",
    duration: "60 to 90 min",
    cashPrice: "from $210",
    insuranceNote: "Typically 50% to 80% covered by PPO plans with prior written estimate.",
    code: "CDT D2391 / D2740",
    recommendedInterval: "As needed after diagnostic scan",
  },
  {
    id: "root-canals",
    category: "restorative",
    title: "Gentle Endodontics (Root Canals)",
    shortDesc: "Done in-house by Dr. Marlow with advanced rotary instrumentation and local anesthesia.",
    fullDesc: "Modern root canals relieve pain rather than causing it. Dr. Marlow handles root canal therapy in a quiet, single-doctor environment with profound anesthesia so you feel only light vibration.",
    duration: "75 to 90 min",
    cashPrice: "from $680",
    insuranceNote: "Typically 50% to 80% covered under major restorative benefits.",
    code: "CDT D3330",
    recommendedInterval: "Emergency or pulpitis diagnosis",
  },
  {
    id: "invisalign",
    category: "cosmetic",
    title: "Clear Aligner Therapy (Invisalign)",
    shortDesc: "Digital 3D optical scans, customized aligners, and clear bite correction without metal brackets.",
    fullDesc: "Clear aligner therapy addresses crowded teeth, gaps, and traumatic occlusion. We only recommend aligners when they genuinely improve your functional bite and periodontal hygiene.",
    duration: "6 to 15 months",
    cashPrice: "from $3,400",
    insuranceNote: "Many PPO plans include lifetime orthodontic benefits ($1,000 to $2,000).",
    code: "CDT D8090",
    recommendedInterval: "Consultation required",
  },
  {
    id: "whitening",
    category: "cosmetic",
    title: "Professional Enamel Whitening",
    shortDesc: "Custom-fitted laboratory trays or in-chair high-potency carbamide peroxide brightening.",
    fullDesc: "Custom vacuum-formed trays ensure professional whitening gel stays in direct contact with enamel without irritating delicate gingival tissue. Honest shade assessment beforehand.",
    duration: "Single visit or 2-week home kit",
    cashPrice: "from $280",
    insuranceNote: "Cosmetic procedure; 6-month zero-interest CareCredit available.",
    code: "CDT D9972",
    recommendedInterval: "Annual refresh or pre-event",
  },
  {
    id: "emergency",
    category: "emergency",
    title: "Same-Day Emergency Triage",
    shortDesc: "Sudden toothache, fractured tooth, dislodged restoration, or traumatic facial swelling.",
    fullDesc: "We reserve emergency triage blocks in our daily schedule. Call before 11:00 AM on weekdays to be seen the same day for targeted diagnosis, pain relief, and stabilization.",
    duration: "30 to 45 min",
    cashPrice: "from $95",
    insuranceNote: "Emergency diagnostics and palliative care covered by most PPO plans.",
    code: "CDT D0140 / D9110",
    recommendedInterval: "Call immediately upon symptoms",
  },
];

export const MOCK_DOCTOR: DoctorProfile = {
  name: "Dr. Sarah Marlow",
  credentials: "DDS",
  title: "Founder & Lead Dentist",
  licenseNumber: "#019.029811",
  licenseState: "Illinois",
  experienceYears: 12,
  almaMater: "University of Michigan School of Dentistry",
  undergrad: "University of Illinois at Urbana-Champaign (B.S. Biology)",
  memberships: [
    "American Dental Association (ADA)",
    "Chicago Dental Society (CDS)",
    "Illinois State Dental Society (ISDS)",
    "Spear Study Club (Active Member since 2016)",
  ],
  certifications: [
    "Illinois Controlled Substances License",
    "Federal DEA Registration",
    "Current Healthcare Provider CPR & BLS",
    "Invisalign Certified Provider",
  ],
  philosophy: [
    "One dentist from start to finish: every exam, diagnosis, and restoration is completed by Dr. Marlow.",
    "Conservative clinical ethics: we preserve healthy natural tooth structure rather than pushing aggressive interventions.",
    "Pre-treatment cost clarity: a written itemized estimate is provided prior to any procedure.",
    "Dedicated appointment pacing: appointments run on schedule without overbooked waiting rooms.",
  ],
};

/* -------------------------------------------------------------
 * API Client Methods
 * ------------------------------------------------------------- */

export async function getServices(): Promise<ServiceItem[]> {
  // In production with FastAPI: return fetch(`${API_BASE}/services`).then(r => r.json())
  return Promise.resolve(MOCK_SERVICES);
}

export async function getDoctorProfile(): Promise<DoctorProfile> {
  return Promise.resolve(MOCK_DOCTOR);
}

/**
 * Submits an appointment booking request to the backend.
 * Currently uses an asynchronous simulation with network latency.
 */
export async function submitBookingRequest(
  payload: BookingPayload
): Promise<BookingResponse> {
  // Simulates network latency
  await new Promise((res) => setTimeout(res, 400));

  const confirmationId = `MD-${new Date().getFullYear()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  return {
    success: true,
    confirmationId,
    message: `Appointment request logged for ${payload.preferredDate} at ${payload.preferredTime}.`,
    estimatedCallbackWindow: "Within 1 business hour (Monday to Thursday 8:00 AM to 6:00 PM Central)",
  };
}
