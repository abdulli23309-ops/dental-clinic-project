"use client";

import { usePublicContent } from "@/components/providers/public-content-provider";
import { Bell } from "lucide-react";

export function AnnouncementMarquee() {
  const { announcements } = usePublicContent();

  const activeItems = announcements.filter((a) => a.isActive);

  if (!activeItems || activeItems.length === 0) {
    return null;
  }

  // Double list to create a seamless infinite marquee scroll
  const marqueeItems = [...activeItems, ...activeItems, ...activeItems];

  return (
    <div
      role="region"
      aria-label="Practice Announcements"
      className="relative z-30 overflow-hidden border-b border-line/60 bg-forest text-[#FAF7F2] py-2 text-xs"
    >
      <div className="flex items-center">
        {/* Fixed Left Badge */}
        <div className="z-10 flex shrink-0 items-center gap-1.5 bg-forest px-4 font-mono text-[10.5px] font-bold uppercase tracking-wider text-gold shadow-md">
          <Bell className="h-3.5 w-3.5 animate-pulse" />
          <span>Announcements</span>
        </div>

        {/* Scrolling Ticker Track */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex shrink-0 animate-marquee items-center gap-8 whitespace-nowrap hover:[animation-play-state:paused]">
            {marqueeItems.map((item, idx) => (
              <span key={`${item.id}-${idx}`} className="inline-flex items-center gap-3 font-medium">
                <span>{item.content}</span>
                <span className="text-gold/60">✦</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
