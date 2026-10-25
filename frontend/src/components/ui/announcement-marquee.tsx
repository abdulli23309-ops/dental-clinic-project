"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { fetchPublicAnnouncements, Announcement } from "@/lib/api";

export function AnnouncementMarquee() {
  const { announcements: contextAnnouncements } = usePublicContent();
  const [liveAnnouncements, setLiveAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchPublicAnnouncements()
      .then((data) => {
        if (isMounted) {
          setLiveAnnouncements(data || []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLiveAnnouncements([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Prefer directly fetched fresh announcements, fallback to context
  const activeAnnouncements = (liveAnnouncements.length > 0 ? liveAnnouncements : contextAnnouncements)
    .filter((a) => a.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // If loading hasn't completed and context is empty, or no active announcements exist, or dismissed, render nothing
  if (dismissed || activeAnnouncements.length === 0) {
    return null;
  }

  const items = activeAnnouncements.map((a) => a.content);
  // Duplicate list to form a seamless infinite loop
  const tickerItems = [...items, ...items];

  return (
    <div
      role="region"
      aria-label="Practice Announcements"
      className="relative z-30 w-full overflow-hidden bg-white/95 dark:bg-black/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 py-2 text-xs select-none pr-10"
    >
      <div className="flex w-full overflow-hidden">
        <motion.div
          className="flex shrink-0 items-center gap-12 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: Math.max(25, tickerItems.length * 8),
          }}
        >
          {tickerItems.map((text, idx) => (
            <div
              key={`${idx}-${text}`}
              className="inline-flex items-center gap-3 text-black dark:text-white text-[12.5px] font-medium tracking-wide"
            >
              <span className="text-primary font-bold text-xs">✦</span>
              <span>{text}</span>
            </div>
          ))}
        </motion.div>
      </div>

      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default AnnouncementMarquee;
