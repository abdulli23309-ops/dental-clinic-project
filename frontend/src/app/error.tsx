"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, ArrowLeft, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary that catches unexpected client-side rendering crashes.
 * It displays a polite recovery message offering a retry button or a return to the homepage.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client exceptions
    console.error("Route error boundary caught exception:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bone flex flex-col justify-between">
      <header className="border-b border-line bg-bone/80 py-4">
        <div className="container-x flex items-center justify-between">
          <Link href="/" className="font-display text-[18px] tracking-tight text-ink">
            Marlow <span className="text-forest dark:text-emerald-500">Dental</span>
          </Link>
          <a
            href="tel:+13125550147"
            className="text-xs text-ink-soft hover:text-forest transition-colors"
          >
            Office: (312) 555-0147
          </a>
        </div>
      </header>

      <main className="container-x py-20 text-center max-w-xl mx-auto space-y-6">
        <p className="eyebrow">Notice</p>

        <h1 className="text-[32px] sm:text-[40px] leading-tight text-ink font-normal">
          We encountered an unexpected pause.
        </h1>

        <p className="text-sm sm:text-base leading-relaxed text-ink-soft">
          The page did not load as expected. Your connection is secure, and you can try refreshing the view or returning to our homepage.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="primary" onClick={() => reset()}>
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>

          <Button href="/" variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Homepage</span>
          </Button>
        </div>

        <div className="pt-8 border-t border-line/60 text-xs text-ink-soft">
          <p>
            If you need immediate scheduling or have an urgent clinical question, please call our Lincoln Park desk directly at{" "}
            <a href="tel:+13125550147" className="text-forest font-semibold underline">
              (312) 555-0147
            </a>.
          </p>
        </div>
      </main>

      <footer className="border-t border-line py-6 text-center text-xs text-ink-soft/75">
        <p>&copy; {new Date().getFullYear()} Marlow Dental, P.C. · Lincoln Park, Chicago</p>
      </footer>
    </div>
  );
}
