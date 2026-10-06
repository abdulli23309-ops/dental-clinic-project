"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { getOfficeStatus, OfficeStatus } from "@/lib/utils";

export function AnnouncementMarquee() {
  const { announcements, content, primaryLocation } = usePublicContent();
  const [status, setStatus] = useState<OfficeStatus>({
    isOpen: true,
    statusText: "Open Now",
    nextEventText: "",
  });

  useEffect(() => {
    setStatus(getOfficeStatus());
  }, []);

  const phone = content.general?.phone || primaryLocation?.phone || "(312) 555-0147";
  const hoursText = primaryLocation?.hoursInfo || "Mon – Thu: 8:00 AM – 6:00 PM · Fri: 8:00 AM – 2:00 PM";

  const dbItems = announcements && announcements.filter((a) => a.isActive).length > 0
    ? announcements.filter((a) => a.isActive).map((a) => a.content)
    : [
        "Now welcoming new patients across all nationwide clinic branches",
        "100% upfront fee transparency with zero hidden facility surcharges",
        "Same-day emergency dental relief & reserved triage appointments available",
      ];

  const combinedItems = [
    `${status.statusText} (${status.nextEventText || "Walk-ins welcome"})`,
    `Call Clinic: ${phone}`,
    ...dbItems,
    `Clinic Hours: ${hoursText.replace(/\n/g, " · ")}`,
  ];

  // Duplicate list to form a seamless infinite loop from 0% to -50%
  const tickerItems = [...combinedItems, ...combinedItems];

  return (
    <div
      role="region"
      aria-label="Practice Announcements and Status"
      className="relative z-30 w-full overflow-hidden bg-transparent border-b border-line/40 py-2 text-xs select-none"
    >
      <div className="flex w-full overflow-hidden">
        <motion.div
          className="flex shrink-0 items-center gap-10 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: Math.max(30, tickerItems.length * 6),
          }}
        >
          {tickerItems.map((text, idx) => (
            <div
              key={`${idx}-${text}`}
              className="inline-flex items-center gap-3 text-ink/85 text-[12px] font-medium tracking-wide"
            >
              <span className="text-secondary font-bold text-xs">✦</span>
              <span>{text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export default AnnouncementMarquee;
