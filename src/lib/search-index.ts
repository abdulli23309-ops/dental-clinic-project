export interface SearchResult {
  id: string;
  title: string;
  category: "Service" | "Pricing" | "Doctor" | "Location" | "FAQ" | "Legal";
  snippet: string;
  href: string;
}

const SEARCH_DOCUMENTS: SearchResult[] = [
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
    snippet: "Gentle rotary root canal treatment by Dr. Marlow with local anesthesia. From $680.",
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
    snippet: "Itemized written estimates before treatment. Cash rates ~25% below standard commercial schedules.",
    href: "/#services",
  },
  {
    id: "p-insurance",
    title: "In-Network Insurance & Claims",
    category: "Pricing",
    snippet: "In-network with Delta Dental PPO, Cigna PPO, MetLife, Guardian, and Aetna. Out-of-network claims filed electronically.",
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
    id: "d-sarah-marlow",
    title: "Dr. Sarah Marlow, DDS Credentials",
    category: "Doctor",
    snippet: "DDS from University of Michigan. Illinois Dental License #019.029811. 12 years in clinical practice.",
    href: "/#about",
  },
  {
    id: "d-philosophy",
    title: "Clinical Philosophy: One Dentist Start to Finish",
    category: "Doctor",
    snippet: "Every exam, cleaning, and restoration is performed directly by Dr. Marlow. Zero rotating assistants.",
    href: "/#commitments",
  },
  {
    id: "l-address",
    title: "Lincoln Park Office Location & Parking",
    category: "Location",
    snippet: "214 Alder Street, Suite 3, Chicago, IL 60614. Free 4-car lot behind building, ground floor suite.",
    href: "/#visit",
  },
  {
    id: "l-transit",
    title: "Public Transit Directions (CTA Brown Line)",
    category: "Location",
    snippet: "5-minute walk from CTA Armitage Brown Line station. Nearby bus routes: #8 Halsted, #73 Armitage, #74 Fullerton.",
    href: "/#visit",
  },
  {
    id: "l-hours",
    title: "Office Hours & Scheduling Availability",
    category: "Location",
    snippet: "Monday to Thursday: 8:00 AM to 6:00 PM. Friday: 8:00 AM to 2:00 PM. Saturday: 9:00 AM to 1:00 PM. Sunday: Closed.",
    href: "/#visit",
  },
  {
    id: "f-anxiety",
    title: "Dental Anxiety & Fear-Free Care",
    category: "FAQ",
    snippet: "Unhurried appointments, patient-controlled stop signals, and zero judgment for long gaps between dental visits.",
    href: "/#faq",
  },
  {
    id: "f-pediatric",
    title: "Pediatric Dentistry (Ages 3+)",
    category: "FAQ",
    snippet: "Gentle introductory visits for children with parent staying chairside the entire time.",
    href: "/#faq",
  },
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

export function searchSite(query: string): SearchResult[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  const terms = clean.split(/\s+/).filter(Boolean);

  return SEARCH_DOCUMENTS.filter((doc) => {
    const haystack = `${doc.title} ${doc.category} ${doc.snippet}`.toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}
