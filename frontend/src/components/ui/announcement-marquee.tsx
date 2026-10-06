"use client";

import { motion } from "motion/react";
import { usePublicContent } from "@/components/providers/public-content-provider";

const DEFAULT_ANNOUNCEMENTS = [
  { id: "def-1", content: "Now welcoming new patients across all nationwide clinic branches" },
  { id: "def-2", content: "Same-day emergency dental relief available · Call your nearest clinic" },
  { id: "def-3", content: "100% upfront fee transparency with zero hidden facility surcharges" },
  { id: "def-4", content: "Advanced 3D digital imaging & quiet single-operatory suites" },
];

export function AnnouncementMarquee() {
  const { announcements } = usePublicContent();

  const activeItems = announcements && announcements.filter((a) => a.isActive).length > 0
    ? announcements.filter((a) => a.isActive)
    : DEFAULT_ANNOUNCEMENTS;

  // Duplicate items to form a seamless infinite loop from 0% to -50%
  const tickerItems = [...activeItems, ...activeItems];

  return (
    <div
      role="region"
      aria-label="Practice Announcements"
      className="relative z-30 w-full overflow-hidden bg-transparent border-b border-line/40 py-2.5 text-xs select-none"
    >
      <div className="flex w-full overflow-hidden">
        <motion.div
          className="flex shrink-0 items-center gap-12 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: Math.max(25, tickerItems.length * 5),
          }}
        >
          {tickerItems.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className="inline-flex items-center gap-3 text-ink/80 text-[12.5px] font-medium tracking-wide"
            >
              <span className="text-secondary font-bold text-sm">✦</span>
              <span>{item.content}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export default AnnouncementMarquee;
