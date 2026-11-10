"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { usePublicContent } from "@/components/providers/public-content-provider";

/**
 * Permanent, Infinite-Scrolling Frosted Glass Announcement Marquee
 * Features:
 * - 100% seamless, continuous motor animation (translates 0% to -100% on dual synchronized tracks)
 * - Zero dismiss/close button (permanently active for high-priority clinic updates)
 * - Ultra-luxurious frosted glassmorphism: backdrop-blur-md, transparent border, subtle gradient edge scrims
 * - Hover-to-pause for effortless readability
 */
export function AnnouncementMarquee() {
  const { announcements } = usePublicContent();

  // Filter active, non-empty announcements sorted by displayOrder
  const activeAnnouncements = useMemo(() => {
    return (announcements || [])
      .filter((a) => a && a.isActive && typeof a.content === "string" && a.content.trim().length > 0)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [announcements]);

  // Ensure each track has enough repeated items to comfortably exceed 4K display widths
  const trackItems = useMemo(() => {
    if (activeAnnouncements.length === 0) return [];
    const minItems = 6;
    const repeatCount = Math.max(2, Math.ceil(minItems / activeAnnouncements.length));
    const items: typeof activeAnnouncements = [];
    for (let i = 0; i < repeatCount; i++) {
      items.push(...activeAnnouncements);
    }
    return items;
  }, [activeAnnouncements]);

  // If there are no active announcements, render nothing
  if (activeAnnouncements.length === 0) {
    return null;
  }

  // Smooth, readable speed: ~6s per item, minimum 35s for continuous gentle glide
  const durationSeconds = Math.max(35, trackItems.length * 6);

  return (
    <aside
      role="region"
      aria-label="Practice Announcements"
      className="group relative z-30 w-full max-w-full overflow-hidden backdrop-blur-md bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/50 dark:border-white/10 shadow-xs py-2.5 select-none"
      style={{ "--marquee-duration": `${durationSeconds}s` } as React.CSSProperties}
    >
      {/* Edge gradient scrims for frosted luxury entrance/exit */}
      <div
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-r from-white/90 dark:from-slate-950/90 to-transparent z-10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-l from-white/90 dark:from-slate-950/90 to-transparent z-10"
        aria-hidden="true"
      />

      {/* Marquee Tracks Container */}
      <div className="flex w-full overflow-hidden">
        {/* Track 1 (Primary) */}
        <div className="flex shrink-0 items-center gap-12 sm:gap-16 pr-12 sm:pr-16 animate-marquee group-hover:[animation-play-state:paused]">
          {trackItems.map((ann, idx) => (
            <div
              key={`t1-${ann.id || idx}-${idx}`}
              className="inline-flex items-center gap-3 text-sm font-medium text-slate-800 dark:text-slate-200 tracking-wide whitespace-nowrap"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                <Sparkles className="h-3 w-3 select-none" aria-hidden="true" />
              </span>
              <span>{ann.content}</span>
              <span className="text-slate-300 dark:text-slate-700 select-none ml-3" aria-hidden="true">
                •
              </span>
            </div>
          ))}
        </div>

        {/* Track 2 (Synchronized Duplicate for seamless infinite loop) */}
        <div
          className="flex shrink-0 items-center gap-12 sm:gap-16 pr-12 sm:pr-16 animate-marquee group-hover:[animation-play-state:paused]"
          aria-hidden="true"
        >
          {trackItems.map((ann, idx) => (
            <div
              key={`t2-${ann.id || idx}-${idx}`}
              className="inline-flex items-center gap-3 text-sm font-medium text-slate-800 dark:text-slate-200 tracking-wide whitespace-nowrap"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                <Sparkles className="h-3 w-3 select-none" aria-hidden="true" />
              </span>
              <span>{ann.content}</span>
              <span className="text-slate-300 dark:text-slate-700 select-none ml-3" aria-hidden="true">
                •
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default AnnouncementMarquee;
