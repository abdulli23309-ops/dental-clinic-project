"use client";

import { useEffect, useState, useMemo } from "react";
import { X, Sparkles } from "lucide-react";
import { usePublicContent } from "@/components/providers/public-content-provider";

export function AnnouncementMarquee() {
  const { announcements } = usePublicContent();
  const [dismissed, setDismissed] = useState(false);

  // Check session storage on mount
  useEffect(() => {
    try {
      if (sessionStorage.getItem("hira_announcement_dismissed") === "true") {
        setDismissed(true);
      }
    } catch {
      // Storage access may be restricted
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("hira_announcement_dismissed", "true");
    } catch {
      // Ignore
    }
  };

  // Filter active, non-empty announcements sorted by displayOrder
  const activeAnnouncements = useMemo(() => {
    return (announcements || [])
      .filter((a) => a && a.isActive && typeof a.content === "string" && a.content.trim().length > 0)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [announcements]);

  // Ensure each track has enough repeated items to comfortably exceed 2000px width on any screen
  const trackItems = useMemo(() => {
    if (activeAnnouncements.length === 0) return [];
    const minItems = 8;
    const repeatCount = Math.max(2, Math.ceil(minItems / activeAnnouncements.length));
    const items: typeof activeAnnouncements = [];
    for (let i = 0; i < repeatCount; i++) {
      items.push(...activeAnnouncements);
    }
    return items;
  }, [activeAnnouncements]);

  // If user dismissed it or there are no active announcements, render nothing (no empty container)
  if (dismissed || activeAnnouncements.length === 0) {
    return null;
  }

  // Calculate duration so reading speed is comfortable (approx 3.5s per item, min 28s)
  const durationSeconds = Math.max(28, trackItems.length * 4);

  return (
    <aside
      role="region"
      aria-label="Practice Announcements"
      className="group relative z-30 w-full max-w-full overflow-hidden border-b border-gray-200/80 dark:border-gray-800/80 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md py-2 select-none"
      style={{ "--marquee-duration": `${durationSeconds}s` } as React.CSSProperties}
    >
      {/* Edge gradient scrims for luxury editorial entrance/exit */}
      <div
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-white dark:from-gray-950 to-transparent z-10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-l from-white dark:from-gray-950 to-transparent z-10"
        aria-hidden="true"
      />

      {/* Marquee Tracks Container */}
      <div className="flex w-full overflow-hidden pr-10 sm:pr-12">
        {/* Track 1 (Primary) */}
        <div className="flex shrink-0 items-center gap-8 sm:gap-12 animate-marquee group-hover:[animation-play-state:paused] motion-reduce:[animation:none]">
          {trackItems.map((ann, idx) => (
            <div
              key={`t1-${ann.id || idx}-${idx}`}
              className="inline-flex items-center gap-2.5 sm:gap-3 text-gray-900 dark:text-gray-100 text-[12px] sm:text-[12.5px] font-medium tracking-wide whitespace-nowrap"
            >
              <Sparkles className="h-3 w-3 text-primary shrink-0 select-none" aria-hidden="true" />
              <span>{ann.content}</span>
            </div>
          ))}
        </div>

        {/* Track 2 (Synchronized Duplicate for seamless infinite loop) */}
        <div
          className="flex shrink-0 items-center gap-8 sm:gap-12 animate-marquee group-hover:[animation-play-state:paused] motion-reduce:[animation:none] motion-reduce:hidden"
          aria-hidden="true"
        >
          {trackItems.map((ann, idx) => (
            <div
              key={`t2-${ann.id || idx}-${idx}`}
              className="inline-flex items-center gap-2.5 sm:gap-3 text-gray-900 dark:text-gray-100 text-[12px] sm:text-[12.5px] font-medium tracking-wide whitespace-nowrap"
            >
              <Sparkles className="h-3 w-3 text-primary shrink-0 select-none" aria-hidden="true" />
              <span>{ann.content}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss announcements"
        type="button"
        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 rounded-full p-1 text-gray-400 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </aside>
  );
}

export default AnnouncementMarquee;
