"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "./button";

const COOKIE_CONSENT_KEY = "marlow_cookie_consent";

/**
 * Renders a privacy and cookie notice at the bottom of the screen for first-time visitors.
 * It explains that cookies are only used for essential scheduling and theme preferences, remembering the visitor's choice.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) {
        // Delay slightly for smooth entrance without blocking initial render
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage restricted
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    } catch {}
    setVisible(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-xl rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 p-5 backdrop-blur-md shadow-2xl sm:bottom-6 sm:left-6 max-md:bottom-[calc(var(--mobile-dock-h,76px)+env(safe-area-inset-bottom,0px)+8px)] max-md:mx-3 max-md:p-3 max-md:max-h-[120px]"
      role="region"
      aria-label="Privacy and cookies notice"
    >
      <div className="flex flex-col gap-4 max-md:gap-2">
        <div>
          <p className="font-display text-[16px] font-medium text-gray-900 dark:text-white max-md:text-xs">
            Privacy &amp; Site Cookies
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600 dark:text-gray-400 max-md:mt-0.5 max-md:text-[11px] max-md:leading-snug max-md:line-clamp-2">
            We use essential cookies to maintain your appointment scheduling progress and remember your theme preferences. Read our{" "}
            <Link href="/privacy" className="text-primary underline underline-offset-2">
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 max-md:flex-row max-md:gap-2 max-md:mt-0">
          <Button size="sm" variant="primary" onClick={handleAccept} className="max-md:h-8 max-md:px-2.5 max-md:text-[11px] max-md:flex-1">
            Accept Essential Cookies
          </Button>
          <Button size="sm" variant="secondary" onClick={handleDecline} className="max-md:h-8 max-md:px-2.5 max-md:text-[11px] max-md:flex-1">
            Decline Analytics
          </Button>
        </div>
      </div>
    </aside>
  );
}
