import { getUiCopy } from "@/content/ui-copy";

export interface SearchResult {
  id: string;
  title: string;
  category: string;
  snippet: string;
  href: string;
}

const copy = getUiCopy("en");

const BASE_LEGAL_DOCUMENTS: SearchResult[] = [
  {
    id: "leg-privacy",
    title: copy.privacy,
    category: "Legal",
    snippet: "Patient health data privacy, electronic health records protection, and confidentiality commitments.",
    href: "/privacy",
  },
  {
    id: "leg-accessibility",
    title: copy.accessibility,
    category: "Legal",
    snippet: "Physical suite accommodations and digital accessibility features.",
    href: "/accessibility",
  },
  {
    id: "leg-terms",
    title: copy.terms,
    category: "Legal",
    snippet: "Office scheduling guidelines, appointment cancellation notice, and financial agreement terms.",
    href: "/terms",
  },
];

export function buildDynamicSearchIndex(params?: {
  services?: Array<{ id: string; title: string; category?: string; shortDesc?: string; cashPrice?: string }>;
  team?: Array<{ id: string; displayName: string; role?: string; professionalTitle?: string; specialties?: string[] }>;
  locations?: Array<{ id: string; name: string; addressLine1: string; city: string; state: string }>;
  faqs?: Array<{ id: string; question: string; answer: string }>;
}): SearchResult[] {
  const docs: SearchResult[] = [];
  const currentCopy = getUiCopy("en");

  if (params) {
    if (params.services && params.services.length > 0) {
      params.services.forEach((s) => {
        docs.push({
          id: `srv-${s.id}`,
          title: s.title,
          category: currentCopy.treatments,
          snippet: `${s.shortDesc || s.title}${s.cashPrice ? ` · Fee ${s.cashPrice}` : ""}`,
          href: "/#services",
        });
      });
    }

    if (params.team && params.team.length > 0) {
      params.team.forEach((m) => {
        docs.push({
          id: `team-${m.id}`,
          title: `${m.displayName} (${m.role || "Practitioner"})`,
          category: currentCopy.team,
          snippet: `${m.professionalTitle || m.role}${m.specialties?.length ? ` · Specialties: ${m.specialties.join(", ")}` : ""}`,
          href: "/#team",
        });
      });
    }

    if (params.locations && params.locations.length > 0) {
      params.locations.forEach((loc) => {
        docs.push({
          id: `loc-${loc.id}`,
          title: `${loc.name} Office Facility`,
          category: currentCopy.locationsAndTiming,
          snippet: `${loc.addressLine1}, ${loc.city}, ${loc.state}. Accessible clinical suite.`,
          href: "/#visit",
        });
      });
    }

    if (params.faqs && params.faqs.length > 0) {
      params.faqs.forEach((faq) => {
        docs.push({
          id: `faq-${faq.id}`,
          title: faq.question,
          category: currentCopy.faqs,
          snippet: faq.answer.slice(0, 160) + "...",
          href: "/#faq",
        });
      });
    }
  }

  return [...docs, ...BASE_LEGAL_DOCUMENTS];
}

export function searchSite(
  query: string,
  docs: SearchResult[]
): SearchResult[] {
  if (!query.trim()) return docs;
  const q = query.toLowerCase();
  return docs.filter(
    (d) =>
      d.title.toLowerCase().includes(q) ||
      d.snippet.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q)
  );
}

export default buildDynamicSearchIndex;
