"use client";

import { usePublicContent } from "@/components/providers/public-content-provider";

export function LegalContactBox({
  officerTitle = "Office Administration",
}: {
  officerTitle?: string;
}) {
  const { content, primaryLocation } = usePublicContent();
  const practiceName = content.general?.practiceName || "Marlow Dental";
  const phone = content.general?.phone || primaryLocation?.phone || "(312) 555-0147";
  const email = content.general?.email || primaryLocation?.email || "care@marlowdental.com";
  const addressLine1 = primaryLocation?.addressLine1 || "214 Alder Street, Suite 3";
  const addressLine2 =
    primaryLocation?.city && primaryLocation?.state
      ? `${primaryLocation.city}, ${primaryLocation.state} ${primaryLocation.postalCode || ""}`
      : "Chicago, IL 60614";

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-bone p-4 text-xs space-y-1 font-mono">
      <p className="font-semibold text-ink">
        {practiceName} — {officerTitle}
      </p>
      <p>{addressLine1}</p>
      <p>{addressLine2}</p>
      <p>
        Telephone: {phone} · Email: {email}
      </p>
    </div>
  );
}
