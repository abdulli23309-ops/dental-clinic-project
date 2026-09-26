"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Phone, Calendar } from "lucide-react";
import { getOfficeStatus } from "@/lib/utils";

/**
 * Renders a compact floating contact bar on desktop screens in the bottom-left corner.
 * It gives patients immediate access to call the office or jump to the booking page, alongside a live open/closed indicator.
 */
export function FloatingAction() {
  const [status, setStatus] = useState({ isOpen: true, statusText: "Open Now", nextEventText: "" });

  useEffect(() => {
    setStatus(getOfficeStatus());
  }, []);

  return (
    <div
      className="fixed bottom-4 left-4 z-40 hidden md:block"
      role="complementary"
      aria-label="Direct clinic contact actions"
    >
      <div className="flex items-center gap-2 rounded-xl border border-line bg-bone/95 p-1.5 backdrop-blur-md elevation-2 transition-all hover:elevation-3">
        <a
          href="tel:+13125550147"
          className="flex items-center gap-2 rounded-lg bg-cream/80 px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-forest hover:text-bone"
          title="Direct dental line"
        >
          <span className="relative flex h-2 w-2">
            {status.isOpen && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                status.isOpen ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
          </span>
          <Phone className="h-3.5 w-3.5" />
          <span>(312) 555-0147</span>
        </a>

        <Link
          href="/book"
          className="flex items-center gap-1.5 rounded-lg bg-forest px-3 py-2 text-xs font-medium text-[#FAF7F2] transition-colors hover:bg-forest-deep"
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Book Visit</span>
        </Link>
      </div>
    </div>
  );
}
