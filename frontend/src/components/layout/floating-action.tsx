"use client";

import Link from "next/link";
import { Phone, Calendar } from "lucide-react";
import { getOfficeStatus } from "@/lib/utils";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { getUiCopy } from "@/content/ui-copy";

export function FloatingAction() {
  const { content, primaryLocation, workingHours, currency, isUnavailable } =
    usePublicContent();
  const copy = getUiCopy("en");

  if (isUnavailable) return null;

  const phone = content.general?.phone || primaryLocation?.phone || "";
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  const status = getOfficeStatus(workingHours, currency.timezone);

  if (!phone) return null;

  return (
    <div
      className="fixed bottom-4 left-4 z-40 hidden md:block"
      role="complementary"
      aria-label="Direct clinic contact actions"
    >
      <div className="flex items-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 p-1.5 backdrop-blur-md shadow-lg transition-all">
        <a
          href={`tel:${cleanPhone}`}
          className="flex items-center gap-2 rounded-xl bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-900 dark:text-white transition-colors hover:bg-primary hover:text-white dark:hover:bg-primary cursor-pointer"
          title="Direct clinic line"
        >
          {status && (
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
          )}
          <Phone className="h-3.5 w-3.5" />
          <span>{phone}</span>
        </a>

        <Link
          href="/book"
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:brightness-110 shadow-xs"
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>{copy.book}</span>
        </Link>
      </div>
    </div>
  );
}

export default FloatingAction;

