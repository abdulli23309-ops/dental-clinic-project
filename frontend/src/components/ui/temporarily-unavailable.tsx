"use client";

import { RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUiCopy, SupportedLocale } from "@/content/ui-copy";

interface TemporarilyUnavailableProps {
  onRetry: () => void;
  locale?: SupportedLocale;
  isRetrying?: boolean;
}

export function TemporarilyUnavailable({
  onRetry,
  locale = "en",
  isRetrying = false,
}: TemporarilyUnavailableProps) {
  const copy = getUiCopy(locale);

  return (
    <section
      role="alert"
      aria-live="polite"
      className="min-h-[50vh] flex items-center justify-center py-20 px-4"
    >
      <div className="max-w-md w-full text-center space-y-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          <AlertCircle className="h-6 w-6" />
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-xl text-gray-900 dark:text-white font-medium">
            {copy.temporarilyUnavailableTitle}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {copy.temporarilyUnavailableMessage}
          </p>
        </div>

        <div className="pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
            <span>{copy.retry}</span>
          </Button>
        </div>
      </div>
    </section>
  );
}

export default TemporarilyUnavailable;

