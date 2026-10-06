"use client";

import { usePublicContent } from "@/components/providers/public-content-provider";

export function AnnouncementMarquee() {
  const { announcements } = usePublicContent();

  const activeItems = announcements.filter((a) => a.isActive);

  if (!activeItems || activeItems.length === 0) {
    return null;
  }

  // Triple list to create a seamless infinite marquee scroll
  const marqueeItems = [...activeItems, ...activeItems, ...activeItems];

  return (
    <div
      role="region"
      aria-label="Practice Announcements"
      className="relative z-30 overflow-hidden bg-transparent border-b border-line/40 text-ink py-2 text-xs"
    >
      <div className="flex items-center">
        {/* Floating Ticker Track without solid background bar */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex shrink-0 animate-marquee items-center gap-10 whitespace-nowrap hover:[animation-play-state:paused]">
            {marqueeItems.map((item, idx) => (
              <span key={`${item.id}-${idx}`} className="inline-flex items-center gap-3 font-medium text-ink/90">
                <span className="text-secondary font-bold">✦</span>
                <span className="tracking-wide">{item.content}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
