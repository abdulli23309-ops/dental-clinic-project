/**
 * Clinical Media Fallback and Image Resolution System
 *
 * Ensures zero-card image failure across all deployed environments (production, staging, local).
 * Never drops to empty initials/monograms when real clinical photography is required.
 */

import { resolveMediaUrl } from "@/lib/api";

// ---------------------------------------------------------------------------
// 1. Curated Clinical Procedures & Treatments Fallback Map
// ---------------------------------------------------------------------------
export const TREATMENT_FALLBACK_IMAGES: Record<string, string> = {
  "cleanings-exams":
    "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=800&q=80",
  "fillings-crowns":
    "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=80",
  "root-canals":
    "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=800&q=80",
  invisalign:
    "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=800&q=80",
  whitening:
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
  emergency:
    "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80",
};

// Local relative backup assets if network is offline
export const TREATMENT_LOCAL_ASSETS: Record<string, string> = {
  "cleanings-exams": "/images/treatment-cleanings.jpg",
  "fillings-crowns": "/images/treatment-fillings.jpg",
  "root-canals": "/images/treatment-rootcanals.jpg",
  invisalign: "/images/treatment-invisalign.jpg",
  whitening: "/images/treatment-cleanings.jpg",
  emergency: "/images/treatment-emergency.jpg",
};

// ---------------------------------------------------------------------------
// 2. Curated Clinic Architecture / Branch Locations Fallback Map
// ---------------------------------------------------------------------------
export const LOCATION_FALLBACK_IMAGES: Record<string, string> = {
  islamabad_main:
    "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1000&q=80",
  lahore_gulberg:
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80",
  islamabad_f7:
    "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1000&q=80",
  karachi_clifton:
    "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1000&q=80",
};

// ---------------------------------------------------------------------------
// 3. Modern Dental Suite (Why Choose Us & Hero Facility Feature)
// ---------------------------------------------------------------------------
export const MODERN_DENTAL_SUITE_IMAGE =
  "https://images.unsplash.com/photo-1629909615184-74f495363b67?auto=format&fit=crop&w=1200&q=80";

// ---------------------------------------------------------------------------
// 4. Curated Verified Medical & Clinician Portrait Pool (15+ Portraits)
// ---------------------------------------------------------------------------
export const NAMED_DOCTOR_PORTRAITS: Record<string, string> = {
  "dr. hina saleem":
    "https://images.unsplash.com/photo-1594824813598-1e433f48a0ff?auto=format&fit=crop&w=800&q=80",
  "dr. carlos novakowski":
    "https://images.unsplash.com/photo-1622902046580-2b47f47f5471?auto=format&fit=crop&w=800&q=80",
  "dr. faisal iqbal":
    "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=800&q=80",
  "dr. yasir rasheed":
    "https://images.unsplash.com/photo-1612349317150-f437f4d47221?auto=format&fit=crop&w=800&q=80",
  "dr. alejandro morales":
    "https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=800&q=80",
  "dr. murad oski":
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
  "dr. sarah john":
    "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80",
  "dr. ahmed raza":
    "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800&q=80",
  "dr. farzana khan":
    "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=800&q=80",
  "dr. sana tariq":
    "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80",
  "dr. bilal tariq":
    "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=800&q=80",
  "dr. zainab ali":
    "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&w=800&q=80",
  "dr. ayesha malik":
    "https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=800&q=80",
  "dr. usman qureshi":
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
  "dr. meral erdogan":
    "https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?auto=format&fit=crop&w=800&q=80",
  "dr. mia thompson":
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80",
};

export const CLINICIAN_FEMALE_POOL: string[] = [
  "https://images.unsplash.com/photo-1594824813598-1e433f48a0ff?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80",
];

export const CLINICIAN_MALE_POOL: string[] = [
  "https://images.unsplash.com/photo-1622902046580-2b47f47f5471?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1612349317150-f437f4d47221?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80",
];

// ---------------------------------------------------------------------------
// 5. 5-Card Bento Grid Default Gallery (Exact PR #13 / PR #14 Specification)
// ---------------------------------------------------------------------------
export interface BentoGalleryItem {
  id: string;
  title: string;
  badge: "CLINICAL SUITE" | "CLINICAL ATMOSPHERE";
  imageUrl: string;
  caption: string;
  colSpanClass: string;
  minHeightClass: string;
}

export const BENTO_GALLERY_ITEMS: BentoGalleryItem[] = [
  {
    id: "gallery-1-sterile-suite",
    title: "Sterile Surgical Suite",
    badge: "CLINICAL SUITE",
    imageUrl:
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80",
    caption: "Sterile Surgical Suite with digital surgical operatory lighting",
    colSpanClass: "md:col-span-7",
    minHeightClass: "h-[320px] sm:h-[380px]",
  },
  {
    id: "gallery-2-radiography",
    title: "Advanced Radiography & Consultation",
    badge: "CLINICAL ATMOSPHERE",
    imageUrl:
      "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80",
    caption: "Advanced Radiography & 3D Intraoral Consultation Suite",
    colSpanClass: "md:col-span-5",
    minHeightClass: "h-[320px] sm:h-[380px]",
  },
  {
    id: "gallery-3-diagnostic",
    title: "Diagnostic & Preventive Station",
    badge: "CLINICAL ATMOSPHERE",
    imageUrl:
      "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=1200&q=80",
    caption: "Diagnostic & Preventive Station for ultrasonic periodontal care",
    colSpanClass: "md:col-span-5",
    minHeightClass: "h-[340px] sm:h-[400px]",
  },
  {
    id: "gallery-4-general-cosmetic",
    title: "General & Cosmetic Treatment Room",
    badge: "CLINICAL ATMOSPHERE",
    imageUrl:
      "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=1200&q=80",
    caption: "General & Cosmetic Treatment Room for clear aligners and smile design",
    colSpanClass: "md:col-span-7",
    minHeightClass: "h-[340px] sm:h-[400px]",
  },
  {
    id: "gallery-5-smile-lounge",
    title: "Patient Comfort & Smile Lounge",
    badge: "CLINICAL ATMOSPHERE",
    imageUrl:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1400&q=80",
    caption: "Patient Comfort & Smile Lounge with welcoming modern hospitality",
    colSpanClass: "md:col-span-12",
    minHeightClass: "h-[340px] sm:h-[420px]",
  },
];

// ---------------------------------------------------------------------------
// 6. Resolution Helper Functions
// ---------------------------------------------------------------------------

/**
 * Checks whether an image string is a valid external or static image path
 * that can be safely loaded on production.
 */
function isValidUsableImage(url?: string | null): boolean {
  if (!url) return false;
  const t = url.trim();
  if (!t) return false;
  // External URLs
  if (/^https?:\/\//i.test(t)) {
    // Disallow unresolvable localhost on live production domain
    if (typeof window !== "undefined") {
      const isLiveProd = !window.location.hostname.includes("localhost") && !window.location.hostname.includes("127.0.0.1");
      if (isLiveProd && (t.includes("localhost:8000") || t.includes("127.0.0.1:8000"))) {
        return false;
      }
    }
    return true;
  }
  // Local static bundled assets in /images/ or /
  if (t.startsWith("/images/")) {
    return true;
  }
  return false;
}

/**
 * Normalizes and resolves a clinician's photograph, ensuring that an empty or
 * unresolvable database field falls back to a curated medical portrait.
 */
export function resolveDoctorPhoto(doctor: {
  id?: string;
  displayName?: string;
  name?: string;
  photoUrl?: string | null;
  photo_url?: string | null;
  avatar?: string | null;
  imageUrl?: string | null;
  image?: string | null;
  role?: string | null;
}): string {
  // 1. Direct candidate URL
  const rawCandidate =
    doctor.photoUrl ||
    doctor.photo_url ||
    doctor.avatar ||
    doctor.imageUrl ||
    doctor.image;

  if (isValidUsableImage(rawCandidate)) {
    return rawCandidate!;
  }

  // 2. Try resolving via API media helper if available
  const mediaResolved = rawCandidate ? resolveMediaUrl(rawCandidate) : null;
  if (isValidUsableImage(mediaResolved)) {
    return mediaResolved!;
  }

  // 3. Named clinician portrait mapping
  const docName = (doctor.displayName || doctor.name || "").toLowerCase().trim();
  for (const [key, url] of Object.entries(NAMED_DOCTOR_PORTRAITS)) {
    if (docName.includes(key.replace("dr. ", "")) || key.includes(docName)) {
      return url;
    }
  }

  // 4. Gender / Name heuristic selection from verified pool
  const femaleKeywords = ["hina", "sarah", "farzana", "sana", "zainab", "ayesha", "fatima", "maryam", "meral", "mia", "elena", "maria", "dr. s"];
  const isFemale = femaleKeywords.some((kw) => docName.includes(kw));

  const pool = isFemale ? CLINICIAN_FEMALE_POOL : CLINICIAN_MALE_POOL;
  const hashSeed = (doctor.id || docName || "DHDC")
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = Math.abs(hashSeed) % pool.length;

  return pool[index];
}

/**
 * Normalizes and resolves a treatment procedure image.
 */
export function resolveTreatmentImage(service: {
  slug?: string;
  title?: string;
  name?: string;
  imageUrl?: string | null;
  image_url?: string | null;
  image?: string | null;
}): string {
  const rawCandidate = service.imageUrl || service.image_url || service.image;
  if (isValidUsableImage(rawCandidate)) {
    return rawCandidate!;
  }

  const mediaResolved = rawCandidate ? resolveMediaUrl(rawCandidate) : null;
  if (isValidUsableImage(mediaResolved)) {
    return mediaResolved!;
  }

  const slug = (service.slug || "").toLowerCase().trim();
  const title = (service.title || service.name || "").toLowerCase().trim();

  for (const [key, url] of Object.entries(TREATMENT_FALLBACK_IMAGES)) {
    if (slug.includes(key) || title.includes(key.replace("-", " "))) {
      return url;
    }
  }

  if (title.includes("clean") || title.includes("exam")) return TREATMENT_FALLBACK_IMAGES["cleanings-exams"];
  if (title.includes("fill") || title.includes("crown")) return TREATMENT_FALLBACK_IMAGES["fillings-crowns"];
  if (title.includes("root") || title.includes("endodontic")) return TREATMENT_FALLBACK_IMAGES["root-canals"];
  if (title.includes("invisalign") || title.includes("aligner")) return TREATMENT_FALLBACK_IMAGES["invisalign"];
  if (title.includes("whiten") || title.includes("bleach")) return TREATMENT_FALLBACK_IMAGES["whitening"];
  if (title.includes("emergency") || title.includes("triage")) return TREATMENT_FALLBACK_IMAGES["emergency"];

  return TREATMENT_FALLBACK_IMAGES["cleanings-exams"];
}

/**
 * Normalizes and resolves a clinic location photo.
 */
export function resolveLocationImage(location: {
  name?: string;
  city?: string;
  imageUrl?: string | null;
  image_url?: string | null;
  image?: string | null;
}): string {
  const rawCandidate = location.imageUrl || location.image_url || location.image;
  if (isValidUsableImage(rawCandidate)) {
    return rawCandidate!;
  }

  const mediaResolved = rawCandidate ? resolveMediaUrl(rawCandidate) : null;
  if (isValidUsableImage(mediaResolved)) {
    return mediaResolved!;
  }

  const text = `${location.name || ""} ${location.city || ""}`.toLowerCase();
  if (text.includes("f-7") || text.includes("f7")) return LOCATION_FALLBACK_IMAGES.islamabad_f7;
  if (text.includes("lahore") || text.includes("gulberg")) return LOCATION_FALLBACK_IMAGES.lahore_gulberg;
  if (text.includes("karachi") || text.includes("clifton")) return LOCATION_FALLBACK_IMAGES.karachi_clifton;
  return LOCATION_FALLBACK_IMAGES.islamabad_main;
}

/**
 * Normalizes and resolves the Why Choose Us / Modern Dental Suite photo.
 */
export function resolveWhyChooseUsImage(content?: {
  homepage?: {
    whyChooseUsImage?: string | null;
    whyChooseUsCaption?: string | null;
  };
}): { src: string; caption: string } {
  const candidate = content?.homepage?.whyChooseUsImage;
  const caption =
    content?.homepage?.whyChooseUsCaption ||
    "Modern Dental Suite — DHDC Islamabad Clinical Facility";

  if (isValidUsableImage(candidate)) {
    return { src: candidate!, caption };
  }

  return {
    src: MODERN_DENTAL_SUITE_IMAGE,
    caption,
  };
}

