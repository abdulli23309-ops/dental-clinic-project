"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  RefreshCw,
  Globe,
  ChevronDown,
} from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { formatWorkingHoursSchedule } from "@/lib/currency";
import { getPublicSocialLinks, getServices, batchTranslate, SocialLink, ServiceItem, resolveMediaUrl } from "@/lib/api";

const DAY_URDU_MAP: Record<string, string> = {
  "Mon - Thu": "پیر تا جمعرات",
  "Mon - Fri": "پیر تا جمعہ",
  "Mon - Sat": "پیر تا ہفتہ",
  "Fri": "جمعہ",
  "Sat": "ہفتہ",
  "Sun": "اتوار",
  "Daily": "روزانہ",
  "Closed": "بند ہے",
};

const ADDRESS_URDU_MAP: Record<string, string> = {
  "Soan Garden, Block C, Islamabad": "سوان گارڈن، بلاک سی، اسلام آباد",
  "Soan Garden, Block C": "سوان گارڈن، بلاک سی",
  "Islamabad": "اسلام آباد",
  "Lahore": "لاہور",
  "Karachi": "کراچی",
  "Rawalpindi": "راولپنڈی",
  "Shop 8 & 9, Sukoon Heights, Lower Ground": "شاپ نمبر 8 اور 9، اسکون ہائٹس، لوئر گراؤنڈ",
};

function translateAddress(addr: string, isUrdu: boolean): string {
  if (!isUrdu || !addr) return addr;
  const trimmed = addr.trim();
  if (ADDRESS_URDU_MAP[trimmed]) return ADDRESS_URDU_MAP[trimmed];
  return addr
    .replace(/Soan Garden/gi, "سوان گارڈن")
    .replace(/Block C/gi, "بلاک سی")
    .replace(/Sukoon Heights/gi, "اسکون ہائٹس")
    .replace(/Lower Ground/gi, "لوئر گراؤنڈ")
    .replace(/Shop\s*8\s*&\s*9/gi, "شاپ نمبر 8 اور 9")
    .replace(/Islamabad/gi, "اسلام آباد")
    .replace(/Lahore/gi, "لاہور")
    .replace(/Karachi/gi, "کراچی")
    .replace(/Rawalpindi/gi, "راولپنڈی");
}

function getSocialIcon(platform: string) {
  const p = platform.toLowerCase();
  if (p.includes("facebook")) {
    return (
      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    );
  }
  if (p.includes("instagram")) {
    return (
      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    );
  }
  if (p.includes("linkedin")) {
    return (
      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
      </svg>
    );
  }
  if (p.includes("youtube")) {
    return (
      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    );
  }
  if (p.includes("twitter") || p.includes("x.com") || p === "x") {
    return (
      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  return <Globe className="h-4 w-4" />;
}

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
    copy,
    locale,
  } = usePublicContent();
  const isUrdu = locale === "ur";
  const currentYear = new Date().getFullYear();
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const toggleAccordion = (key: string) => {
    setOpenAccordion((prev) => (prev === key ? null : key));
  };

  useEffect(() => {
    let mounted = true;
    if (!isUnavailable) {
      getPublicSocialLinks()
        .then((data) => {
          if (mounted && Array.isArray(data)) {
            setSocialLinks(data.filter((l) => l.isActive !== false));
          }
        })
        .catch(() => {});

      getServices()
        .then(async (data) => {
          if (mounted && Array.isArray(data)) {
            const active = data.filter((s) => s.isActive !== false).slice(0, 5);
            if (isUrdu) {
              try {
                const trans = await batchTranslate(active.map((s) => s.title), "ur");
                if (mounted && trans) {
                  setServices(active.map((s) => ({ ...s, title: trans[s.title] || s.title })));
                  return;
                }
              } catch (_) {}
            }
            if (mounted) {
              setServices(active);
            }
          }
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [isUnavailable, isUrdu]);

  const [logoError, setLogoError] = useState(false);
  const practiceName =
    content.general?.practiceName ||
    organization?.displayName ||
    organization?.name ||
    "";
  const rawLogoUrl = content.general?.logoUrl || organization?.logoUrl || null;
  const logoUrl = resolveMediaUrl(rawLogoUrl);

  useEffect(() => {
    setLogoError(false);
  }, [rawLogoUrl]);

  const phone =
    content.general?.phone ||
    content.contact?.phone ||
    primaryLocation?.phone ||
    organization?.contactPhone ||
    "";
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  const email =
    content.general?.email ||
    content.contact?.email ||
    primaryLocation?.email ||
    organization?.contactEmail ||
    "";

  const rawAddressLine1 =
    content.general?.address?.trim() ||
    content.contact?.addressLine1?.trim() ||
    primaryLocation?.addressLine1 ||
    (organization as unknown as { address?: string })?.address ||
    "";
  const addressLine1 = translateAddress(rawAddressLine1, isUrdu);

  const rawAddressLine2 =
    content.contact?.addressLine2?.trim() ||
    (!content.general?.address?.trim() && primaryLocation?.city && primaryLocation?.state
      ? `${primaryLocation.city}, ${primaryLocation.state} ${
          primaryLocation.postalCode || ""
        }`.trim()
      : !content.general?.address?.trim() && primaryLocation?.city
      ? primaryLocation.city
      : "");
  const addressLine2 = translateAddress(rawAddressLine2, isUrdu);

  const tagline =
    content.footer?.tagline ||
    content.general?.tagline ||
    (isUrdu ? "جدید ڈینٹسٹری میں مصدقہ طبی معیار اور ہمدردی۔" : "Precision & Compassion in Modern Dentistry.");
  const copyrightNotice =
    content.footer?.copyrightNotice ||
    (isUrdu
      ? `© ${currentYear} ${practiceName ? `${practiceName}. ` : ""}جملہ حقوق محفوظ ہیں۔`
      : `© ${currentYear} ${practiceName ? `${practiceName}. ` : ""}${copy.allRightsReserved}`);
  const cancellationPolicy = isUrdu && !content.footer?.cancellationPolicy
    ? "منسوخی کی پالیسی: برائے مہربانی 24 گھنٹے قبل مطلع کریں۔"
    : content.footer?.cancellationPolicy;

  const licenseText = director?.licenseNumber
    ? `${director.displayName} · License #${director.licenseNumber}`
    : "";

  if (isUnavailable) {
    return (
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-400 py-8">
        <div className="container-x flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span>
              &copy; {currentYear}. {copy.allRightsReserved}
            </span>
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
            <Link
              href="/accessibility"
              className="hover:text-primary transition-colors"
            >
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
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 pb-dock md:pb-0">
      <div className="container-x py-12 md:py-16">
        {/* Mobile Accordions (< 768px) */}
        <div className="md:hidden space-y-3 mb-8">
          {/* Clinic Brand & Contacts */}
          <div className="space-y-3 pb-4 border-b border-gray-200 dark:border-gray-800">
            {practiceName && (
              <div className="flex items-center gap-2.5">
                {logoUrl && !logoError ? (
                  <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-white/95 border border-slate-200/80 dark:border-white/90 shadow-sm ring-1 ring-black/5 dark:ring-2 dark:ring-primary/40 p-1.5 shrink-0">
                    <img
                      src={logoUrl}
                      alt={practiceName}
                      className="h-full w-full object-contain"
                      width="36"
                      height="36"
                    />
                  </div>
                ) : null}
                <span className="font-serif text-lg font-bold tracking-tight text-gray-950 dark:text-white">
                  {practiceName}
                </span>
              </div>
            )}
            {tagline && (
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {tagline}
              </p>
            )}
            {phone && (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                <a href={`tel:${cleanPhone}`} className="hover:text-primary">
                  {phone}
                </a>
              </div>
            )}
          </div>

          {/* Accordion 1: Treatments */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleAccordion("treatments")}
              className="w-full flex items-center justify-between p-3.5 text-left min-h-[48px]"
              aria-expanded={openAccordion === "treatments"}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                {copy.treatments}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-gray-400 transition-transform ${
                  openAccordion === "treatments" ? "rotate-180" : ""
                }`}
              />
            </button>
            {openAccordion === "treatments" && (
              <div className="px-3.5 pb-3.5 pt-1 border-t border-gray-150 dark:border-gray-800 space-y-2 text-xs text-gray-600 dark:text-gray-400">
                {services.map((svc) => (
                  <div key={svc.id}>
                    <Link href="/#treatments" className="hover:text-primary block py-0.5">
                      {svc.title}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Accordion 2: Explore Navigation */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleAccordion("explore")}
              className="w-full flex items-center justify-between p-3.5 text-left min-h-[48px]"
              aria-expanded={openAccordion === "explore"}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                {copy.explore}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-gray-400 transition-transform ${
                  openAccordion === "explore" ? "rotate-180" : ""
                }`}
              />
            </button>
            {openAccordion === "explore" && (
              <div className="px-3.5 pb-3.5 pt-1 border-t border-gray-150 dark:border-gray-800 space-y-2 text-xs text-gray-600 dark:text-gray-400">
                <div>
                  <Link href="/#why-us" className="hover:text-primary block py-0.5">
                    {copy.whyUs || "Why Choose Us"}
                  </Link>
                </div>
                <div>
                  <Link href="/#reviews" className="hover:text-primary block py-0.5">
                    {copy.successStories}
                  </Link>
                </div>
                <div>
                  <Link href="/#team" className="hover:text-primary block py-0.5">
                    {copy.team}
                  </Link>
                </div>
                <div>
                  <Link href="/#locations" className="hover:text-primary block py-0.5">
                    {copy.locationsAndTiming}
                  </Link>
                </div>
                <div>
                  <Link href="/#faq" className="hover:text-primary block py-0.5">
                    {copy.faqs}
                  </Link>
                </div>
                <div>
                  <Link href="/blog" className="hover:text-primary block py-0.5">
                    {copy.blogs}
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Accordion 3: Branches & Hours */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleAccordion("hours")}
              className="w-full flex items-center justify-between p-3.5 text-left min-h-[48px]"
              aria-expanded={openAccordion === "hours"}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                {copy.clinicHours}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-gray-400 transition-transform ${
                  openAccordion === "hours" ? "rotate-180" : ""
                }`}
              />
            </button>
            {openAccordion === "hours" && (
              <div className="px-3.5 pb-3.5 pt-1 border-t border-gray-150 dark:border-gray-800 space-y-2 text-xs text-gray-600 dark:text-gray-400">
                {addressLine1 && (
                  <p className="py-0.5 text-gray-800 dark:text-gray-300">
                    {addressLine1}
                  </p>
                )}
                {scheduleLines.slice(0, 4).map((line, idx) => {
                  const dayLabel = isUrdu ? (DAY_URDU_MAP[line.label] || line.label) : line.label;
                  const isClosed = line.timeRange.toLowerCase().includes("closed");
                  const timeDisplay = isUrdu && isClosed ? "بند ہے" : line.timeRange;
                  return (
                    <div key={idx} className="flex justify-between py-0.5">
                      <span>{dayLabel}:</span>
                      <span dir="ltr" className="inline-block font-mono text-gray-900 dark:text-white">
                        {timeDisplay}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Footer Grid (>= 768px, untouched) */}
        <div className="max-md:hidden grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-10">
          {/* Column 1: Brand, Tagline, Contact Info, Social Links */}
          <div className="lg:col-span-4 space-y-5">
            {practiceName ? (
              <div className="flex items-center gap-2.5">
                {logoUrl && !logoError ? (
                  <div className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white dark:bg-white/95 border border-slate-200/80 dark:border-white/90 shadow-sm dark:shadow-[0_0_20px_rgba(255,255,255,0.14)] ring-1 ring-black/5 dark:ring-2 dark:ring-primary/40 p-1.5 shrink-0 transition-all">
                    <img
                      src={logoUrl}
                      alt={practiceName || "Clinic Logo"}
                      onError={() => setLogoError(true)}
                      className="h-full w-full object-contain"
                      width="40"
                      height="40"
                    />
                  </div>
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-white shadow-xs shrink-0">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M12 4c-2.5 0-3.2 1.2-4.6 1.2C6 5.2 4.5 6.6 4.5 9.2c0 3.4 1.7 6 2.6 8.6.6 1.7 1 3 2.1 3 1.2 0 1.3-1.6 1.5-3.3.15-1.4.5-2.5 1.3-2.5s1.15 1.1 1.3 2.5c.2 1.7.3 3.3 1.5 3.3 1.1 0 1.5-1.3 2.1-3 .9-2.6 2.6-5.2 2.6-8.6 0-2.6-1.5-4-2.9-4C15.2 5.2 14.5 4 12 4Z" />
                    </svg>
                  </span>
                )}
                <span className="font-display text-lg font-bold tracking-tight text-gray-950 dark:text-white">
                  {practiceName}
                </span>
              </div>
            ) : null}

            {tagline ? (
              <p className="max-w-sm text-xs sm:text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
                {tagline}
              </p>
            ) : null}

            {hasContact ? (
              <div className="space-y-2 text-xs sm:text-[13px] text-gray-600 dark:text-gray-400">
                {phone ? (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="inline-flex items-center gap-2" dir="ltr">
                      <a
                        href={`tel:${cleanPhone}`}
                        className="hover:text-primary dark:hover:text-white transition-colors"
                      >
                        {phone}
                      </a>
                      <CopyButton
                        text={phone}
                        label={isUrdu ? "کاپی" : "Copy"}
                        className="h-6 px-1.5 text-[10px]"
                      />
                    </span>
                  </div>
                ) : null}

                {email ? (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="inline-flex items-center gap-2" dir="ltr">
                      <a
                        href={`mailto:${email}`}
                        className="hover:text-primary dark:hover:text-white transition-colors"
                      >
                        {email}
                      </a>
                      <CopyButton
                        text={email}
                        label={isUrdu ? "کاپی" : "Copy"}
                        className="h-6 px-1.5 text-[10px]"
                      />
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Social Links (Strictly rendered ONLY in Footer) */}
            {socialLinks.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-2">
                  {copy.followUs}
                </span>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {socialLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.platform}
                      className="grid h-8 w-8 place-items-center rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:text-primary hover:border-primary/50 transition-colors shadow-xs"
                    >
                      {getSocialIcon(link.platform)}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Treatments We Offer */}
          <div className="lg:col-span-2 space-y-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400 font-bold">
              {copy.treatments}
            </p>
            <ul className="space-y-2 text-xs sm:text-[13px] text-gray-600 dark:text-gray-400">
              {services.length > 0 ? (
                services.map((svc) => (
                  <li key={svc.id}>
                    <Link
                      href={`/#treatments`}
                      className="hover:text-primary transition-colors"
                    >
                      {svc.title}
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li>
                    <Link
                      href="/#treatments"
                      className="hover:text-primary transition-colors"
                    >
                      {isUrdu ? "احتیاطی چیک اپ" : "Preventive Checkups"}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/#treatments"
                      className="hover:text-primary transition-colors"
                    >
                      {isUrdu ? "کاسمیٹک ڈینٹسٹری" : "Cosmetic Dentistry"}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/#treatments"
                      className="hover:text-primary transition-colors"
                    >
                      {isUrdu ? "ایمرجنسی نگہداشت" : "Emergency Care"}
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Column 3: Quick Navigation */}
          <div className="lg:col-span-2 space-y-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400 font-bold">
              {copy.explore}
            </p>
            <ul className="space-y-2 text-xs sm:text-[13px] text-gray-600 dark:text-gray-400">
              <li>
                <Link
                  href="/#why-us"
                  className="hover:text-primary transition-colors"
                >
                  {copy.whyUs || "Why Choose Us"}
                </Link>
              </li>
              <li>
                <Link
                  href="/#reviews"
                  className="hover:text-primary transition-colors"
                >
                  {copy.successStories}
                </Link>
              </li>
              <li>
                <Link
                  href="/#team"
                  className="hover:text-primary transition-colors"
                >
                  {copy.team}
                </Link>
              </li>
              <li>
                <Link
                  href="/#locations"
                  className="hover:text-primary transition-colors"
                >
                  {copy.locationsAndTiming}
                </Link>
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="hover:text-primary transition-colors"
                >
                  {copy.faqs}
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="hover:text-primary transition-colors"
                >
                  {copy.blogs}
                </Link>
              </li>
              <li>
                <Link
                  href="/book"
                  className="hover:text-primary transition-colors font-medium text-primary"
                >
                  {copy.book}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Location & Hours */}
          <div className="lg:col-span-4 space-y-4">
            {addressLine1 ? (
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400 font-bold">
                  {copy.location}
                </p>
                <address className="not-italic text-xs sm:text-[13px] text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="whitespace-pre-line">{addressLine1}</p>
                    {addressLine2 && <p>{addressLine2}</p>}
                  </div>
                </address>
              </div>
            ) : null}

            {hasHours ? (
              <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400 font-bold">
                  {copy.clinicHours}
                </p>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  {scheduleLines.slice(0, 4).map((line, idx) => {
                    const dayLabel = isUrdu ? (DAY_URDU_MAP[line.label] || line.label) : line.label;
                    const isClosed = line.timeRange.toLowerCase().includes("closed");
                    const timeDisplay = isUrdu && isClosed ? "بند ہے" : line.timeRange;
                    return (
                      <div key={idx} className="flex justify-between">
                        <span>{dayLabel}:</span>
                        <span dir="ltr" className="inline-block font-mono text-[11.5px] text-gray-900 dark:text-white">
                          {timeDisplay}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Legal Strip */}
        <div className="mt-12 border-t border-gray-200 dark:border-gray-800 pt-6 text-[11.5px] text-gray-500 dark:text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-1.5 text-center sm:text-left">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary/70 shrink-0" />
              <span className="inline-flex items-center gap-1.5 flex-wrap">
                <bdi>{copyrightNotice}</bdi>
                {licenseText && <span className="mx-1">· <bdi>{licenseText}</bdi></span>}
              </span>
            </div>
            {cancellationPolicy && (
              <span className="text-gray-400 dark:text-gray-500 text-[10.5px] sm:ml-2">
                · {cancellationPolicy}
              </span>
            )}
          </div>

          <div className="flex items-center gap-5 text-center">
            <Link
              href="/privacy"
              className="hover:text-primary transition-colors"
            >
              {copy.privacy}
            </Link>
            <Link
              href="/accessibility"
              className="hover:text-primary transition-colors"
            >
              {copy.accessibility}
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              {copy.terms}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
