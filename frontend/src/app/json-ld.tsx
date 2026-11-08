import { fetchPublicOrganization, getLocations } from "@/lib/api";

export async function JsonLd() {
  let org = null;
  let primaryLoc = null;

  try {
    const [orgData, locsData] = await Promise.all([
      fetchPublicOrganization().catch(() => null),
      getLocations().catch(() => []),
    ]);
    org = orgData;
    primaryLoc =
      locsData.find((l) => l.isPrimary && l.isActive) ||
      locsData.find((l) => l.isActive) ||
      null;
  } catch {
    return null;
  }

  const practiceName = org?.displayName || org?.name;
  if (!practiceName) {
    return null;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    name: practiceName,
  };

  if (org?.description) {
    schema.description = org.description;
  }
  if (org?.websiteUrl || baseUrl) {
    schema.url = org?.websiteUrl || baseUrl;
  }
  const phone = primaryLoc?.phone || org?.contactPhone;
  if (phone) {
    schema.telephone = phone;
  }
  if (primaryLoc && (primaryLoc.addressLine1 || primaryLoc.city)) {
    schema.address = {
      "@type": "PostalAddress",
      ...(primaryLoc.addressLine1 ? { streetAddress: primaryLoc.addressLine1 } : {}),
      ...(primaryLoc.city ? { addressLocality: primaryLoc.city } : {}),
      ...(primaryLoc.state ? { addressRegion: primaryLoc.state } : {}),
      ...(primaryLoc.postalCode ? { postalCode: primaryLoc.postalCode } : {}),
      ...(primaryLoc.country ? { addressCountry: primaryLoc.country } : {}),
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default JsonLd;

