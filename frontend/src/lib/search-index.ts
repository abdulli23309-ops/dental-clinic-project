export interface SearchResult {
  id: string;
  title: string;
  category: "Service" | "Pricing" | "Doctor" | "Location" | "FAQ" | "Legal";
  snippet: string;
  href: string;
}

const BASE_LEGAL_DOCUMENTS: SearchResult[] = [
  {
    id: "leg-privacy",
    title: "Privacy Policy",
    category: "Legal",
    snippet: "Patient health data privacy, electronic health records protection, and confidentiality commitments.",
    href: "/privacy",
  },
  {
    id: "leg-hipaa",
    title: "HIPAA Notice of Privacy Practices",
    category: "Legal",
    snippet: "Formal disclosures and procedures under the federal Health Insurance Portability and Accountability Act.",
    href: "/hipaa",
  },
  {
    id: "leg-accessibility",
    title: "Accessibility Statement",
    category: "Legal",
    snippet: "Physical ground-floor suite accommodations and digital WCAG 2.1 AA accessibility features.",
    href: "/accessibility",
  },
  {
    id: "leg-terms",
    title: "Terms of Service & Cancellation Policy",
    category: "Legal",
    snippet: "Office scheduling guidelines, 48-hour appointment cancellation notice, and financial agreement terms.",
    href: "/terms",
  },
];

const DEFAULT_DOCUMENTS: SearchResult[] = [
  {
    id: "s-cleanings",
    title: "Cleanings & Comprehensive Exams",
    category: "Service",
    snippet: "Complete checkup, digital low-radiation bitewing X-rays, ultrasonic scaling, cash price from $140.",
    href: "/#services",
  },
  {
    id: "s-fillings",
    title: "Tooth-Colored Fillings & Ceramic Crowns",
    category: "Service",
    snippet: "Biocompatible composite resin fillings and precision milled in-office ceramic crowns from $210.",
    href: "/#services",
  },
  {
    id: "s-root-canal",
    title: "Endodontic Root Canal Therapy",
    category: "Service",
    snippet: "Gentle rotary root canal treatment with local anesthesia. Relieve pain and preserve teeth.",
    href: "/#services",
  },
  {
    id: "s-invisalign",
    title: "Invisalign Clear Aligners",
    category: "Service",
    snippet: "Digital 3D impression scans, bite alignment, and clear aligners without metal brackets. From $3,400.",
    href: "/#services",
  },
  {
    id: "s-whitening",
    title: "Professional Enamel Whitening",
    category: "Service",
    snippet: "Custom-fitted vacuum trays and high-potency carbamide peroxide brightening. From $280.",
    href: "/#services",
  },
  {
    id: "s-emergency",
    title: "Same-Day Emergency Dental Triage",
    category: "Service",
    snippet: "Sudden tooth pain, broken restoration, or chipped tooth seen same day when calling before 11:00 AM.",
    href: "/#services",
  },
  {
    id: "p-cash-rates",
    title: "Transparent Cash Fee Schedule",
    category: "Pricing",
    snippet: "Itemized written estimates before treatment. Transparent cash pricing and zero surprise bills.",
    href: "/#services",
  },
  {
    id: "p-insurance",
    title: "In-Network Insurance & Claims",
    category: "Pricing",
    snippet: "In-network with major PPO dental plans. Out-of-network claims filed electronically.",
    href: "/#faq",
  },
  {
    id: "p-financing",
    title: "CareCredit & Interest-Free Financing",
    category: "Pricing",
    snippet: "6-month interest-free financing available via CareCredit for treatments over $500, plus 5% prompt-pay discount.",
    href: "/#faq",
  },
  {
    id: "d-team",
    title: "Clinical Team & Leadership",
    category: "Doctor",
    snippet: "Dedicated practitioners providing patient-first continuity from initial checkup to treatment completion.",
    href: "/#about",
  },
  {
    id: "l-visit",
    title: "Practice Facility Location & Parking",
    category: "Location",
    snippet: "Step-free, wheelchair accessible ground-floor facility with dedicated patient parking in rear.",
    href: "/#visit",
  },
  ...BASE_LEGAL_DOCUMENTS,
];

/**
 * Builds dynamic search index entries transformed from live CMS/database records.
 */
export function buildDynamicSearchIndex(params?: {
  services?: Array<{ id: string; title: string; category?: string; shortDesc?: string; cashPrice?: string }>;
  team?: Array<{ id: string; displayName: string; role?: string; professionalTitle?: string; specialties?: string[] }>;
  locations?: Array<{ id: string; name: string; addressLine1: string; city: string; state: string }>;
  faqs?: Array<{ id: string; question: string; answer: string }>;
}): SearchResult[] {
  if (!params) return DEFAULT_DOCUMENTS;

  const docs: SearchResult[] = [];

  // 1. Dynamic Services
  if (params.services && params.services.length > 0) {
    params.services.forEach((s) => {
      docs.push({
        id: `srv-${s.id}`,
        title: s.title,
        category: "Service",
        snippet: `${s.shortDesc || s.title}${s.cashPrice ? ` · Cash fee ${s.cashPrice}` : ""}`,
        href: "/#services",
      });
    });
  }

  // 2. Dynamic Team Members
  if (params.team && params.team.length > 0) {
    params.team.forEach((m) => {
      docs.push({
        id: `team-${m.id}`,
        title: `${m.displayName} (${m.role || "Practitioner"})`,
        category: "Doctor",
        snippet: `${m.professionalTitle || m.role}${m.specialties?.length ? ` · Specialties: ${m.specialties.join(", ")}` : ""}`,
        href: "/#about",
      });
    });
  }

  // 3. Dynamic Locations
  if (params.locations && params.locations.length > 0) {
    params.locations.forEach((loc) => {
      docs.push({
        id: `loc-${loc.id}`,
        title: `${loc.name} Office Facility`,
        category: "Location",
        snippet: `${loc.addressLine1}, ${loc.city}, ${loc.state}. Step-free ground floor entrance and parking.`,
        href: "/#visit",
      });
    });
  }

  // 4. Dynamic FAQs
  if (params.faqs && params.faqs.length > 0) {
    params.faqs.forEach((faq) => {
      docs.push({
        id: `faq-${faq.id}`,
        title: faq.question,
        category: "FAQ",
        snippet: faq.answer.slice(0, 160) + "...",
        href: "/#faq",
      });
    });
  }

  // Append legal and fallback documents if dynamic set is small
  if (docs.length === 0) {
    return DEFAULT_DOCUMENTS;
  }

  return [...docs, ...BASE_LEGAL_DOCUMENTS];
}

/**
 * Searches through the website's index of dental services, pricing, and policies.
 * It matches words entered into the search dialog against service titles, descriptions, and categories.
 */
export function searchSite(query: string, customDocuments?: SearchResult[]): SearchResult[] {
  const clean = query.trim().toLowerCase();
  const pool = customDocuments && customDocuments.length > 0 ? customDocuments : DEFAULT_DOCUMENTS;

  if (!clean) return pool.slice(0, 8);

  const terms = clean.split(/\s+/).filter(Boolean);

  return pool.filter((doc) => {
    const haystack = `${doc.title} ${doc.category} ${doc.snippet}`.toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}
