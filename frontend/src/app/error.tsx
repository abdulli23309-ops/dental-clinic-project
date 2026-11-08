"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUiCopy } from "@/content/ui-copy";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const copy = getUiCopy("en");

  useEffect(() => {
    console.error("Route error boundary caught exception:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bone flex flex-col justify-between">
      <header className="border-b border-line bg-bone/80 py-4">
        <div className="container-x flex items-center justify-between">
          <Link href="/" className="font-display text-[18px] tracking-tight text-ink">
            Homepage
          </Link>
          <Link
            href="/"
            className="text-xs text-ink-soft hover:text-forest transition-colors"
          >
            {copy.returnToHomepage}
          </Link>
        </div>
      </header>

      <main className="container-x py-20 text-center max-w-xl mx-auto space-y-6">
        <p className="eyebrow">Notice</p>

        <h1 className="text-[32px] sm:text-[40px] leading-tight text-ink font-normal">
          We encountered an unexpected pause.
        </h1>

        <p className="text-sm sm:text-base leading-relaxed text-ink-soft">
          The page did not load as expected. Your connection is secure, and you can try refreshing the view or returning to the homepage.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="primary" onClick={() => reset()}>
            <RefreshCw className="h-4 w-4" />
            <span>{copy.retry}</span>
          </Button>

          <Button href="/" variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            <span>{copy.returnToHomepage}</span>
          </Button>
        </div>
      </main>

      <footer className="border-t border-line py-6 text-center text-xs text-ink-soft/75">
        <p>&copy; {new Date().getFullYear()}. {copy.allRightsReserved}</p>
      </footer>
    </div>
  );
}
