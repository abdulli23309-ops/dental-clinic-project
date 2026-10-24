"use client";

import Link from "next/link";
import { Phone, Mail, MapPin, ShieldCheck, RefreshCw } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { formatWorkingHoursSchedule } from "@/lib/currency";
import { getUiCopy } from "@/content/ui-copy";

export function Footer() {
  const {
    content,
    organization,
    primaryLocation,
    director,
    workingHours,
    isUnavailable,
    retry,
    status,
  } = usePublicContent();
  const currentYear = new Date().getFullYear();
  const copy = getUiCopy("en");

  const practiceName =
    organization?.displayName ||
    organization?.name ||
    content.general?.practiceName ||
    "";

  const phone = content.general?.phone || primaryLocation?.phone || "";
  const cleanPhone = phone.replace(/[^0-9+]/g, "");
  const email = content.general?.email || primaryLocation?.email || "";

  const addressLine1 = primaryLocation?.addressLine1 || "";
  const addressLine2 =
    primaryLocation?.city && primaryLocation?.state
      ? `${primaryLocation.city}, ${primaryLocation.state} ${
          primaryLocation.postalCode || ""
        }`.trim()
      : primaryLocation?.city || "";

  const tagline = content.footer?.tagline || content.general?.tagline || "";

  const licenseText = director?.licenseNumber
    ? `${director.displayName} · License #${director.licenseNumber}`
    : "";

  if (isUnavailable) {
    return (
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-400 py-8">
        <div className="container-x flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span>&copy; {currentYear}. {copy.allRightsReserved}</span>
            <button
              onClick={() => retry()}
              disabled={status === "loading"}
              className="inline-flex items-center gap-1 text-primary hover:underline ml-2 cursor-pointer"
            >
              <RefreshCw
                className={`h-3 w-3 ${status === "loading" ? "animate-spin" : ""}`}
              />
              <span>{copy.retry}</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-primary transition-colors">
              {copy.privacy}
            </Link>
            <Link href="/accessibility" className="hover:text-primary transition-colors">
              {copy.accessibility}
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              {copy.terms}
            </Link>
          </div>
        </div>
      </footer>
    );
  }

  const scheduleLines = formatWorkingHoursSchedule(workingHours);
  const hasHours = scheduleLines.length > 0;
  const hasContact = phone || email || addressLine1;

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="container-x py-10 md:py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-10">
          {/* Clinic Brand & Summary */}
          <div className="lg:col-span-4 space-y-4">
            {practiceName ? (
              <div className="flex items-center gap-2.5">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-white">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M12 4c-2.5 0-3.2 1.2-4.6 1.2C6 5.2 4.5 6.6 4.5 9.2c0 3.4 1.7 6 2.6 8.6.6 1.7 1 3 2.1 3 1.2 0 1.3-1.6 1.5-3.3.15-1.4.5-2.5 1.3-2.5s1.15 1.1 1.3 2.5c.2 1.7.3 3.3 1.5 3.3 1.1 0 1.5-1.3 2.1-3 .9-2.6 2.6-5.2 2.6-8.6 0-2.6-1.5-4-2.9-4C15.2 5.2 14.5 4 12 4Z" />
                  </svg>
                </span>
                <span className="font-display text-[17px] tracking-tight text-gray-900 dark:text-white">
                  {practiceName}
                </span>
              </div>
            ) : null}

            {tagline ? (
              <p className="max-w-sm text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
                {tagline}
              </p>
            ) : null}

            {hasContact ? (
              <div className="space-y-2">
                {phone ? (
                  <div className="flex items-center gap-2 text-[13px] text-gray-600 dark:text-gray-400">
                    <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                    <a
                      href={`tel:${cleanPhone}`}
                      className="hover:text-primary dark:hover:text-white transition-colors"
                    >
                      {phone}
                    </a>
                    <CopyButton
                      text={phone}
                      label="Copy"
                      className="border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    />
                  </div>
                ) : null}

                {email ? (
                  <div className="flex items-center gap-2 text-[13px] text-gray-600 dark:text-gray-400">
                    <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                    <a
                      href={`mailto:${email}`}
                      className="hover:text-primary dark:hover:text-white transition-colors"
                    >
                      {email}
                    </a>
                    <CopyButton
                      text={email}
                      label="Copy"
                      className="border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Quick Navigation */}
          <div className="lg:col-span-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400 font-semibold">
              Explore
            </p>
            <ul className="mt-3 space-y-2 text-[13px] text-gray-600 dark:text-gray-400">
              <li>
                <Link
                  href="/#services"
                  className="hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {copy.treatments}
                </Link>
              </li>
              <li>
                <Link
                  href="/#commitments"
                  className="hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {copy.successStories}
                </Link>
              </li>
              <li>
                <Link
                  href="/#team"
                  className="hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {copy.team}
                </Link>
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {copy.faqs}
                </Link>
              </li>
              <li>
                <Link
                  href="/book"
                  className="hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {copy.book}
                </Link>
              </li>
            </ul>
          </div>

          {/* Office Location */}
          {addressLine1 ? (
            <div className="lg:col-span-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400 font-semibold">
                Location
              </p>
              <address className="mt-3 not-italic space-y-1.5 text-[13px] text-gray-600 dark:text-gray-400">
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p>{addressLine1}</p>
                    {addressLine2 && <p>{addressLine2}</p>}
                  </div>
                </div>
              </address>
            </div>
          ) : null}

          {/* Practice Hours */}
          {hasHours ? (
            <div className="lg:col-span-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400 font-semibold">
                Office Hours
              </p>
              <div className="mt-3 space-y-1.5 text-[13px] text-gray-600 dark:text-gray-400">
                {scheduleLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`flex justify-between ${
                      idx !== scheduleLines.length - 1
                        ? "border-b border-gray-200 dark:border-gray-800 pb-1"
                        : ""
                    } ${line.isClosed ? "text-gray-400 dark:text-gray-500" : ""}`}
                  >
                    <span>{line.label}</span>
                    <span
                      className={
                        line.isClosed
                          ? ""
                          : "font-mono text-gray-900 dark:text-white text-[12px]"
                      }
                    >
                      {line.timeRange}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Legal Strip */}
        <div className="mt-10 border-t border-gray-200 dark:border-gray-800 pt-6 text-[11.5px] text-gray-500 dark:text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-center sm:text-left">
            <ShieldCheck className="h-3.5 w-3.5 text-primary/60 shrink-0" />
            <span>
              &copy; {currentYear} {practiceName ? `${practiceName}. ` : ""}
              {copy.allRightsReserved}
              {licenseText && <span className="ml-1">· {licenseText}</span>}
            </span>
          </div>

          <div className="flex items-center gap-4 text-center">
            <Link
              href="/privacy"
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {copy.privacy}
            </Link>
            <Link
              href="/accessibility"
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {copy.accessibility}
            </Link>
            <Link
              href="/terms"
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {copy.terms}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
