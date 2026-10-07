/**
 * API Service Abstraction Layer: Marlow Dental
 *
 * This file is the single boundary where HTTP fetch calls to the
 * FastAPI and PostgreSQL backend live.
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
  highlight?: boolean;
  isActive?: boolean;
  displayOrder?: number;
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

export interface TeamMember {
  id: string;
  organizationId: string;
  locationId?: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  professionalTitle: string;
  role: string;
  specialties: string[];
  biography?: string | null;
  photoUrl?: string | null;
  education?: string | null;
  credentials?: string | null;
  licenseNumber?: string | null;
  licenseState?: string | null;
  servicesOffered?: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FaqItem {
  id: string;
  category: "insurance" | "pricing" | "comfort" | "scheduling";
  question: string;
  answer: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface BookingPayload {
  serviceId: string;
  preferredDate: string;
  preferredTime: string;
  fullName: string;
  phone: string;
  email: string;
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

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  inactivityEnabled?: boolean;
  inactivityTimeoutMinutes?: number;
  inactivityWarningSeconds?: number;
}

export interface SiteContent {
  general: {
    practiceName: string;
    tagline: string;
    logoUrl?: string | null;
    faviconUrl?: string | null;
    phone: string;
    email: string;
    address: string;
    emergencyPhone?: string | null;
  };
  homepage: {
    heroEyebrow: string;
    heroHeading: string;
    heroDescription: string;
    heroCtaText: string;
    heroCtaLink: string;
    heroSecondaryCtaText: string;
    heroSecondaryCtaLink: string;
    heroImageUrl?: string | null;
  };
  about: {
    eyebrow: string;
    title: string;
    storyParagraphs: string[];
    imageUrl?: string | null;
    licensureText: string;
  };
  contact: {
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2: string;
    transitNote: string;
    hoursSummary: string;
    emergencyNote: string;
  };
  footer: {
    tagline: string;
    copyrightNotice: string;
    cancellationPolicy: string;
  };
  seo: {
    siteTitle: string;
    metaDescription: string;
    ogImageUrl?: string | null;
  };
}

export interface LocationItem {
  id: string;
  organizationId: string;
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
  email?: string | null;
  hoursInfo?: string | null;
  isPrimary: boolean;
  isActive: boolean;
  displayOrder: number;
}

export interface Organization {
  id: string;
  name: string;
  displayName: string;
  tagline?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  websiteUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  backgroundColor?: string | null;
  primaryFont?: string | null;
  secondaryFont?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Announcement {
  id: string;
  content: string;
  isActive: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export type ClinicItem = LocationItem;

/* -------------------------------------------------------------
 * DEFAULT / FALLBACK DATA ARRAYS
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
    highlight: true,
    isActive: true,
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
    highlight: true,
    isActive: true,
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
    isActive: true,
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
    isActive: true,
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
    isActive: true,
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
    isActive: true,
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

export const DEFAULT_SITE_CONTENT: SiteContent = {
  general: {
    practiceName: "Marlow Dental",
    tagline: "Comprehensive, unhurried dental care in Lincoln Park, Chicago.",
    logoUrl: null,
    faviconUrl: null,
    phone: "(312) 555-0147",
    email: "care@marlowdental.com",
    address: "214 Alder Street, Suite 3, Chicago, IL 60614",
    emergencyPhone: "(312) 555-0199",
  },
  homepage: {
    heroEyebrow: "Independent Dental Practice · Lincoln Park",
    heroHeading: "Modern, unhurried dental care for Chicago.",
    heroDescription: "Comprehensive exams, gentle restorations, and transparent fee schedules from a dedicated clinical team.",
    heroCtaText: "Request an appointment",
    heroCtaLink: "/book",
    heroSecondaryCtaText: "View treatment fees",
    heroSecondaryCtaLink: "#services",
    heroImageUrl: null,
  },
  about: {
    eyebrow: "Meet Your Dental Team",
    title: "We opened this practice to offer unhurried, conservative care.",
    storyParagraphs: [
      "After graduating from top dental programs, our clinicians established Marlow Dental with a single standard: patient-first continuity from start to finish.",
      "When you sit in our chair, we will never recommend aggressive treatments or unneeded cosmetic procedures. If a tooth can be maintained conservatively with diligent care, that is exactly what we advise.",
    ],
    imageUrl: null,
    licensureText: "Active Illinois Dental Licensure. BLS/CPR Certified. Chicago Dental Society Members.",
  },
  contact: {
    phone: "(312) 555-0147",
    email: "care@marlowdental.com",
    addressLine1: "214 Alder Street, Suite 3",
    addressLine2: "Lincoln Park, Chicago, IL 60614",
    transitNote: "Two blocks west of Fullerton Red/Brown/Purple Line station. Valet & street parking available.",
    hoursSummary: "Monday – Thursday: 8:00 AM – 6:00 PM\nFriday: 8:00 AM – 2:00 PM (Emergency triage only)\nSaturday – Sunday: Closed",
    emergencyNote: "Reserved triage blocks available daily. Call before 11:00 AM for same-day evaluation.",
  },
  footer: {
    tagline: "Independent, ethical dental care in Lincoln Park, Chicago.",
    copyrightNotice: "Marlow Dental Practice LLC. All rights reserved.",
    cancellationPolicy: "We request 48 hours notice for appointment rescheduling.",
  },
  seo: {
    siteTitle: "Marlow Dental — Unhurried Dentistry in Lincoln Park, Chicago",
    metaDescription: "Independent dental practice in Lincoln Park, Chicago offering gentle exams, ceramic restorations, and transparent cash pricing.",
    ogImageUrl: null,
  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* -------------------------------------------------------------
 * PUBLIC API METHODS
 * ------------------------------------------------------------- */

/**
 * Returns the list of active dental procedures from the database, falling back to mock data if unreachable.
 */
export async function getServices(): Promise<ServiceItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/services`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch public services");
    const data = (await res.json()) as Array<{
      slug: string;
      category: string;
      title: string;
      shortDesc: string;
      fullDesc?: string;
      duration: string;
      cashPrice: number | string;
      insuranceNote?: string;
      code?: string;
      recommendedInterval?: string;
      isHighlighted: boolean;
      isActive: boolean;
      displayOrder: number;
    }>;
    return data.map((s) => {
      const validCategories: Array<"preventive" | "restorative" | "cosmetic" | "emergency"> = [
        "preventive",
        "restorative",
        "cosmetic",
        "emergency",
      ];
      const category = validCategories.includes(s.category as "preventive" | "restorative" | "cosmetic" | "emergency")
        ? (s.category as "preventive" | "restorative" | "cosmetic" | "emergency")
        : "preventive";

      return {
        id: s.slug,
        category,
        title: s.title,
        shortDesc: s.shortDesc,
        fullDesc: s.fullDesc || s.shortDesc,
        duration: s.duration,
        cashPrice: typeof s.cashPrice === "number" ? `$${s.cashPrice}` : String(s.cashPrice),
        insuranceNote: s.insuranceNote || "",
        code: s.code || "",
        recommendedInterval: s.recommendedInterval || "",
        highlight: s.isHighlighted,
        isActive: s.isActive,
        displayOrder: s.displayOrder,
      };
    });
  } catch {
    return MOCK_SERVICES;
  }
}

/**
 * Returns dynamic team members from the database.
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/team`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch team members");
    return await res.json();
  } catch {
    return [
      {
        id: "director-sarah-marlow",
        organizationId: "marlow-dental",
        firstName: "Sarah",
        lastName: "Marlow",
        displayName: "Dr. Sarah Marlow, DDS",
        professionalTitle: "Founder & Clinical Director",
        role: "Director",
        specialties: ["General Dentistry", "Conservative Restorative Care", "Invisalign"],
        biography: "After graduating from the University of Michigan School of Dentistry, Dr. Marlow spent four years in high-volume group clinics before establishing Marlow Dental with direct doctor continuity.",
        photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=1200&auto=format&fit=crop",
        education: "DDS, University of Michigan; B.S., University of Illinois",
        credentials: "DDS",
        licenseNumber: "#019.029811",
        licenseState: "Illinois",
        displayOrder: 0,
        isActive: true,
      },
    ];
  }
}

/**
 * Returns Dr. Sarah Marlow's clinical credentials (backwards-compatible helper).
 */
export async function getDoctorProfile(): Promise<DoctorProfile> {
  return Promise.resolve(MOCK_DOCTOR);
}

/**
 * Returns dynamic database-backed website content for public pages.
 */
export async function getSiteContent(): Promise<SiteContent> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/content`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch site content");
    return await res.json();
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}

/**
 * Returns active FAQ items.
 */
export async function getPublicFaqs(): Promise<FaqItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/faq`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch FAQs");
    return await res.json();
  } catch {
    return [
      {
        id: "faq-1",
        category: "pricing",
        question: "Do you provide written estimates before treatment?",
        answer: "Yes. Before beginning any procedure outside a routine cleaning, we provide a printed, itemized estimate showing both our cash fee and your estimated insurance copay.",
      },
      {
        id: "faq-2",
        category: "insurance",
        question: "Which PPO dental insurance plans do you accept?",
        answer: "We accept and bill most major PPO dental plans, including Delta Dental, Cigna, MetLife, Guardian, and Aetna. We do not participate in HMO or Medicaid plans.",
      },
      {
        id: "faq-3",
        category: "comfort",
        question: "I have severe dental anxiety. How do you accommodate nervous patients?",
        answer: "We schedule generous appointment blocks so you are never rushed. You have full control: raise a hand at any second to pause. We offer noise-canceling headphones, warm blankets, and unhurried local anesthesia.",
      },
      {
        id: "faq-4",
        category: "scheduling",
        question: "How quickly can I be seen for an acute dental emergency?",
        answer: "We reserve dedicated emergency slots every morning and afternoon. Call us before 11:00 AM on weekdays for same-day diagnostic evaluation and pain stabilization.",
      },
    ];
  }
}

/**
 * Returns active clinic locations.
 */
export async function getLocations(): Promise<LocationItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/locations`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch locations");
    return await res.json();
  } catch {
    return [
      {
        id: "loc-chicago-1",
        organizationId: "org-1",
        name: "Lincoln Park Office",
        addressLine1: "214 Alder Street, Suite 3",
        city: "Chicago",
        state: "IL",
        postalCode: "60614",
        country: "US",
        phone: "(312) 555-0147",
        email: "care@marlowdental.com",
        isPrimary: true,
        isActive: true,
        displayOrder: 0,
      },
    ];
  }
}

/**
 * Transmits a patient's appointment booking request across the network to the backend server.
 */
export async function submitBookingRequest(
  payload: BookingPayload
): Promise<BookingResponse> {
  const response = await fetch(`${API_BASE}/api/v1/appointments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = "Failed to submit appointment request.";
    try {
      const errJson = await response.json();
      if (typeof errJson.detail === "string") {
        errorDetail = errJson.detail;
      } else if (Array.isArray(errJson.detail)) {
        errorDetail = errJson.detail
          .map((item: { msg?: string }) => item.msg || JSON.stringify(item))
          .join(". ");
      } else if (errJson.message) {
        errorDetail = errJson.message;
      }
    } catch {
      // Ignore parse failure; retain fallback
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/* -------------------------------------------------------------
 * AUTHENTICATION & SINGLE-FLIGHT FIFO REQUEST QUEUE
 * ------------------------------------------------------------- */

let inMemoryAccessToken: string | null = null;
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

export function setMemoryAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getMemoryAccessToken(): string | null {
  return inMemoryAccessToken;
}

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

/**
 * Centralized authenticated request layer.
 * Enforces single-flight refresh lock and FIFO replay queue upon 401 token expiration.
 */
export async function authorizedFetch(
  endpoint: string,
  options: RequestInit = {},
  explicitToken?: string | null
): Promise<Response> {
  const token = explicitToken || inMemoryAccessToken;
  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const reqOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include", // Transmit HttpOnly refresh cookie
  };

  const fullUrl = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const response = await fetch(fullUrl, reqOptions);

  // If token expired (401) and not an auth negotiation endpoint, queue and refresh
  if (
    response.status === 401 &&
    !endpoint.includes("/auth/login") &&
    !endpoint.includes("/auth/refresh")
  ) {
    if (isRefreshing) {
      // 1. Refresh already in progress: queue request in FIFO order
      return new Promise<Response>((resolve, reject) => {
        failedQueue.push({
          resolve: async (newToken: string) => {
            try {
              const retryHeaders = new Headers(options.headers || {});
              retryHeaders.set("Authorization", `Bearer ${newToken}`);
              if (!retryHeaders.has("Content-Type") && !(options.body instanceof FormData)) {
                retryHeaders.set("Content-Type", "application/json");
              }
              const retryRes = await fetch(fullUrl, {
                ...options,
                headers: retryHeaders,
                credentials: "include",
              });
              resolve(retryRes);
            } catch (err) {
              reject(err);
            }
          },
          reject: (err) => {
            reject(err);
          },
        });
      });
    }

    // 2. Start single-flight refresh
    isRefreshing = true;
    try {
      const refreshData = await refreshAuthToken();
      setMemoryAccessToken(refreshData.accessToken);

      // Replay all queued pending requests in original FIFO order
      processQueue(null, refreshData.accessToken);

      // Replay the triggering request
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set("Authorization", `Bearer ${refreshData.accessToken}`);
      if (!retryHeaders.has("Content-Type") && !(options.body instanceof FormData)) {
        retryHeaders.set("Content-Type", "application/json");
      }
      return await fetch(fullUrl, {
        ...options,
        headers: retryHeaders,
        credentials: "include",
      });
    } catch (refreshErr) {
      // Refresh failed: reject all queued requests, clear memory, notify auth context
      processQueue(refreshErr, null);
      setMemoryAccessToken(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("marlow:auth:logout"));
      }
      throw refreshErr;
    } finally {
      isRefreshing = false;
    }
  }

  return response;
}

export async function login(payload: { email: string; password: string }): Promise<{
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: User;
}> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Send & store HttpOnly cookie
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let msg = "Invalid email or password.";
    try {
      const err = await res.json();
      if (err.detail) msg = err.detail;
    } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  setMemoryAccessToken(data.accessToken);
  return data;
}

export async function refreshAuthToken(): Promise<{
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
}> {
  const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Receives & sends HttpOnly cookie
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    throw new Error("Session expired or refresh token invalid.");
  }

  const data = await res.json();
  setMemoryAccessToken(data.accessToken);
  return data;
}

export async function logout(): Promise<void> {
  setMemoryAccessToken(null);
  try {
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {}
}

export async function getMe(accessToken?: string): Promise<User> {
  const res = await authorizedFetch("/api/v1/auth/me", {}, accessToken);
  if (!res.ok) {
    throw new Error("Unable to retrieve user profile.");
  }
  return res.json();
}

export async function updateInactivitySettings(
  payload: {
    inactivityEnabled: boolean;
    inactivityTimeoutMinutes: number;
    inactivityWarningSeconds: number;
  },
  token?: string
): Promise<User> {
  const res = await authorizedFetch(
    "/api/v1/auth/inactivity-settings",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update inactivity settings.");
  }
  return res.json();
}

/* -------------------------------------------------------------
 * ADMIN CMS & MANAGEMENT API METHODS (ROUTED THROUGH FIFO QUEUE)
 * ------------------------------------------------------------- */

export async function adminGetCmsSection(section: string, token?: string) {
  const res = await authorizedFetch(`/api/v1/admin/cms/${section}`, {}, token);
  if (!res.ok) throw new Error(`Failed to load ${section} section.`);
  return res.json();
}

export async function adminUpdateCmsSection(section: string, data: Record<string, unknown>, token?: string) {
  const res = await authorizedFetch(
    `/api/v1/admin/cms/${section}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    token
  );
  if (!res.ok) throw new Error(`Failed to update ${section} section.`);
  return res.json();
}

// Services
export async function adminGetServices(token?: string) {
  const res = await authorizedFetch(`/api/v1/admin/services`, {}, token);
  if (!res.ok) throw new Error("Failed to load services.");
  return res.json();
}

export async function adminCreateService(data: Record<string, unknown>, token?: string) {
  const res = await authorizedFetch(
    `/api/v1/admin/services`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    token
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create service.");
  }
  return res.json();
}

export async function adminUpdateService(id: string, data: Record<string, unknown>, token?: string) {
  const res = await authorizedFetch(
    `/api/v1/admin/services/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    token
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update service.");
  }
  return res.json();
}

export async function adminToggleServiceStatus(id: string, isActive: boolean, token?: string) {
  const res = await authorizedFetch(
    `/api/v1/admin/services/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    },
    token
  );
  if (!res.ok) throw new Error("Failed to update service status.");
  return res.json();
}

// Team
export async function adminGetTeam(token?: string): Promise<TeamMember[]> {
  const res = await authorizedFetch(`/api/v1/admin/team`, {}, token);
  if (!res.ok) throw new Error("Failed to load team members.");
  return res.json();
}

export async function adminCreateTeamMember(data: Record<string, unknown>, token?: string) {
  const res = await authorizedFetch(
    `/api/v1/admin/team`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    token
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create team member.");
  }
  return res.json();
}

export async function adminUpdateTeamMember(id: string, data: Record<string, unknown>, token?: string) {
  const res = await authorizedFetch(
    `/api/v1/admin/team/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    token
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update team member.");
  }
  return res.json();
}

export async function adminToggleTeamMemberStatus(id: string, isActive: boolean, token?: string) {
  const res = await authorizedFetch(
    `/api/v1/admin/team/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    },
    token
  );
  if (!res.ok) throw new Error("Failed to update team member status.");
  return res.json();
}

// FAQs
export async function adminGetFaqs(token?: string): Promise<FaqItem[]> {
  const res = await authorizedFetch(`/api/v1/admin/faq`, {}, token);
  if (!res.ok) throw new Error("Failed to load FAQs.");
  return res.json();
}

export async function adminCreateFaq(data: Record<string, unknown>, token?: string) {
  const res = await authorizedFetch(
    `/api/v1/admin/faq`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    token
  );
  if (!res.ok) throw new Error("Failed to create FAQ item.");
  return res.json();
}

export async function adminUpdateFaq(id: string, data: Record<string, unknown>, token?: string) {
  const res = await authorizedFetch(
    `/api/v1/admin/faq/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    token
  );
  if (!res.ok) throw new Error("Failed to update FAQ item.");
  return res.json();
}

export async function adminToggleFaqStatus(id: string, isActive: boolean, token?: string) {
  const res = await authorizedFetch(
    `/api/v1/admin/faq/${id}/status?is_active=${isActive}`,
    {
      method: "PATCH",
    },
    token
  );
  if (!res.ok) throw new Error("Failed to update FAQ status.");
  return res.json();
}

// Media upload
export async function adminUploadMedia(file: File, token?: string): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await authorizedFetch(
    `/api/v1/admin/media/upload`,
    {
      method: "POST",
      body: formData,
    },
    token
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to upload file.");
  }

  return res.json();
}

// Public Organization & Theming
export async function fetchPublicOrganization(): Promise<Organization | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/organization`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Public Announcements (Marquee ticker)
export async function fetchPublicAnnouncements(): Promise<Announcement[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/announcements`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// Public Clinics / Locations
export async function fetchPublicClinics(): Promise<ClinicItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/clinics`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// Admin Organization
export async function adminGetOrganization(token?: string | null): Promise<Organization> {
  const res = await authorizedFetch(`/api/v1/admin/organization`, {}, token);
  if (!res.ok) throw new Error("Failed to load organization settings.");
  return res.json();
}

export async function adminUpdateOrganization(data: Partial<Organization>, token?: string | null): Promise<Organization> {
  const res = await authorizedFetch(
    `/api/v1/admin/organization`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    token
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update organization settings.");
  }
  return res.json();
}

// Admin Locations
export async function adminGetLocations(token?: string | null): Promise<LocationItem[]> {
  const res = await authorizedFetch(`/api/v1/admin/locations`, {}, token);
  if (!res.ok) throw new Error("Failed to load locations.");
  return res.json();
}

export async function adminCreateLocation(data: {
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  phone?: string | null;
  email?: string | null;
  hoursInfo?: string | null;
  isPrimary?: boolean;
  displayOrder?: number;
}, token?: string | null): Promise<LocationItem> {
  const res = await authorizedFetch(
    `/api/v1/admin/locations`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    token
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create location.");
  }
  return res.json();
}

export async function adminUpdateLocation(id: string, data: {
  name?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string | null;
  email?: string | null;
  hoursInfo?: string | null;
  isPrimary?: boolean;
  displayOrder?: number;
}, token?: string | null): Promise<LocationItem> {
  const res = await authorizedFetch(
    `/api/v1/admin/locations/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    token
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update location.");
  }
  return res.json();
}

export async function adminToggleLocationStatus(id: string, isActive: boolean, token?: string | null): Promise<LocationItem> {
  const res = await authorizedFetch(
    `/api/v1/admin/locations/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    },
    token
  );
  if (!res.ok) throw new Error("Failed to update location status.");
  return res.json();
}

// Admin Announcements
export async function adminGetAnnouncements(token?: string | null): Promise<Announcement[]> {
  const res = await authorizedFetch(`/api/v1/admin/announcements`, {}, token);
  if (!res.ok) throw new Error("Failed to load announcements.");
  return res.json();
}

export async function adminCreateAnnouncement(data: { content: string; isActive?: boolean; displayOrder?: number }, token?: string | null): Promise<Announcement> {
  const res = await authorizedFetch(
    `/api/v1/admin/announcements`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    token
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create announcement.");
  }
  return res.json();
}

export async function adminUpdateAnnouncement(id: string, data: { content?: string; isActive?: boolean; displayOrder?: number }, token?: string | null): Promise<Announcement> {
  const res = await authorizedFetch(
    `/api/v1/admin/announcements/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    token
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update announcement.");
  }
  return res.json();
}

export async function adminDeleteAnnouncement(id: string, token?: string | null): Promise<void> {
  const res = await authorizedFetch(
    `/api/v1/admin/announcements/${id}`,
    {
      method: "DELETE",
    },
    token
  );
  if (!res.ok && res.status !== 204) {
    throw new Error("Failed to delete announcement.");
  }
}

// Admin Permissions Matrix
export interface PermissionMatrixItem {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string;
}

export interface PermissionsMatrixData {
  roles: string[];
  permissions: PermissionMatrixItem[];
  matrix: Record<string, string[]>;
}

export async function adminGetPermissions(token?: string | null): Promise<PermissionsMatrixData> {
  const res = await authorizedFetch(`/api/v1/admin/permissions`, {}, token);
  if (!res.ok) throw new Error("Failed to load permissions matrix.");
  return res.json();
}

export async function adminUpdatePermissions(
  matrix: Record<string, string[]>,
  token?: string | null
): Promise<PermissionsMatrixData> {
  const res = await authorizedFetch(
    `/api/v1/admin/permissions`,
    {
      method: "PUT",
      body: JSON.stringify({ matrix }),
    },
    token
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update permissions matrix.");
  }
  return res.json();
}


