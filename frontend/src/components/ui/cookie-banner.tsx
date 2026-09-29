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
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-xl border border-line bg-bone/95 p-5 backdrop-blur-md elevation-3 sm:bottom-6 sm:left-6"
      role="region"
      aria-label="Privacy and cookies notice"
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="font-display text-[16px] font-medium text-ink">
            Privacy &amp; Site Cookies
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
            We use essential cookies to maintain your appointment scheduling progress and remember your theme preferences. We do not sell your personal data or run behavioral ad trackers. Read our{" "}
            <Link href="/privacy" className="text-forest underline underline-offset-2">
              Privacy Policy
            </Link>{" "}
            for full details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button size="sm" variant="primary" onClick={handleAccept}>
            Accept Essential Cookies
          </Button>
          <Button size="sm" variant="secondary" onClick={handleDecline}>
            Decline Optional Analytics
          </Button>
        </div>
      </div>
    </aside>
  );
}
