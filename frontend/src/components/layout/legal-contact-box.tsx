"use client";

import { usePublicContent } from "@/components/providers/public-content-provider";

export function LegalContactBox({
  officerTitle = "Administration",
}: {
  officerTitle?: string;
}) {
  const { content, primaryLocation, organization } = usePublicContent();
  const practiceName =
    organization?.displayName ||
    organization?.name ||
    content.general?.practiceName ||
    "";
  const phone = content.general?.phone || primaryLocation?.phone || "";
  const email = content.general?.email || primaryLocation?.email || "";
  const addressLine1 = primaryLocation?.addressLine1 || "";
  const addressLine2 =
    primaryLocation?.city && primaryLocation?.state
      ? `${primaryLocation.city}, ${primaryLocation.state} ${
          primaryLocation.postalCode || ""
        }`.trim()
      : primaryLocation?.city || "";

  if (!practiceName && !phone && !email && !addressLine1) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-xs space-y-1 font-mono text-gray-600 dark:text-gray-400">
      {practiceName && (
        <p className="font-semibold text-gray-900 dark:text-white">
          {practiceName} — {officerTitle}
        </p>
      )}
      {addressLine1 && <p>{addressLine1}</p>}
      {addressLine2 && <p>{addressLine2}</p>}
      {(phone || email) && (
        <p>
          {phone ? `Telephone: ${phone}` : ""}
          {phone && email ? " · " : ""}
          {email ? `Email: ${email}` : ""}
        </p>
      )}
    </div>
  );
}

export default LegalContactBox;

