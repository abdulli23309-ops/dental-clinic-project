"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import {
  MapPin,
  Clock,
  Phone,
  Navigation,
  Calendar,
  ChevronDown,
  Copy,
  Check,
  AlertCircle,
  Building2,
  Stethoscope,
} from "lucide-react";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { resolveMediaUrl } from "@/lib/api";
import { SafeImage } from "@/components/ui/safe-image";
import { getOpenStatus, parseBranchHoursRows } from "@/lib/branchHours";
import { useMobileBooking } from "@/components/mobile/MobileBookingSheet";
import { useT } from "@/i18n/useT";
import { Num } from "@/i18n/Num";
import { tap } from "@/lib/haptics";

const CITY_URDU_MAP: Record<string, string> = {
  "Islamabad": "اسلام آباد",
  "Lahore": "لاہور",
  "Karachi": "کراچی",
  "Rawalpindi": "راولپنڈی",
};

export function MobileLocationsTiming() {
  const { locations, team, organization, content, locale } = usePublicContent();
  const { openBooking } = useMobileBooking();
  const { t } = useT();
  const isUrdu = locale === "ur";
  const activeLocations = locations.filter((l) => l.isActive !== false);

  const [activeIdx, setActiveIdx] = useState(0);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (activeLocations.length === 0) return null;

  const currentLoc = activeLocations[Math.min(activeIdx, activeLocations.length - 1)];
  const status = getOpenStatus(currentLoc.hoursInfo || "");
  const branchHoursList = parseBranchHoursRows(currentLoc.hoursInfo || "");
  const dynamicCities = Array.from(
    new Set(activeLocations.map((l) => (isUrdu ? (CITY_URDU_MAP[l.city] || l.city) : l.city)).filter(Boolean))
  );
  const locationsSubtitle = isUrdu
    ? `${dynamicCities.join("، ")} میں جدید سہولیات کے حامل کلینکس۔`
    : `State-of-the-art facilities across ${dynamicCities.join(", ")}.`;

  const getStatusLabel = () => {
    if (!isUrdu) return status.label;
    if (status.open) {
      const time = status.label.replace(/^Open now\s*·?\s*Closes\s*/i, "").replace(/^Open today\s*·?\s*/i, "");
      return `اب کھلا ہے · بند ہوگا ${time}`;
    } else {
      const time = status.label.replace(/^Closed\s*·?\s*Opens\s*/i, "");
      return `بند ہے · کھلے گا ${time}`;
    }
  };

  const formatDayLabel = (days: string) => {
    if (!isUrdu) return days;
    const lower = days.toLowerCase();
    if (lower.includes("mon") && lower.includes("sat")) return "پیر تا ہفتہ";
    if (lower.includes("sun")) return "اتوار";
    if (lower.includes("daily")) return "روزانہ";
    return days;
  };

  const handleCopy = async (text: string) => {
    tap(12);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  // Doctors practicing at this clinic
  const clinicDoctors = team.filter((d) => {
    if (!d.isActive) return false;
    if (d.locationId && d.locationId === currentLoc.id) return true;
    return false;
  });

  const fullAddress = [currentLoc.addressLine1, currentLoc.addressLine2, currentLoc.city]
    .filter(Boolean)
    .join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${organization?.name || "Hira Dental Clinic"} ${fullAddress}`
  )}`;

  const clinicPhone = currentLoc.phone || content.general?.phone || organization?.contactPhone || "";
  const emergencyPhone = content.general?.emergencyPhone || clinicPhone;

  return (
    <div className="w-full px-4 space-y-6">
      {/* Section Eyebrow & Title */}
      <div className="text-center space-y-1.5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider bg-primary/10 text-primary dark:bg-primary/20">
          <MapPin className="w-3 h-3 text-primary" />
          {isUrdu ? "ہمارے کلینک" : "Our Clinics"}
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white font-serif">
          {isUrdu ? "ہمارے برانچز کا دورہ کریں" : "Visit Our Branches"}
        </h2>
        <p className="text-xs text-gray-600 dark:text-gray-400 max-w-xs mx-auto">
          {locationsSubtitle}
        </p>
      </div>

      {/* Branch Switcher Chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 snap-x">
        {activeLocations.map((loc, idx) => {
          const isSelected = idx === activeIdx;
          const conciseName = loc.name
            .replace(/^DHDC\s*/i, "")
            .replace(/Clinic|Dental/gi, "")
            .replace(new RegExp(`[-–—]?\\s*${loc.city}\\s*[-–—]?`, "gi"), "")
            .trim() || loc.name;

          return (
            <button
              key={loc.id || idx}
              type="button"
              onClick={() => {
                tap(8);
                setActiveIdx(idx);
                setHoursOpen(false);
              }}
              className={`snap-start whitespace-nowrap max-w-[210px] px-3.5 py-2 rounded-xl text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 active:scale-95 ${
                isSelected
                  ? "bg-primary text-white shadow-sm ring-1 ring-primary/40"
                  : "bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-gray-200/70 dark:border-gray-700/60"
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-white" : "text-primary"}`} />
              <span className="truncate">{conciseName}</span>
              {loc.city && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full shrink-0 ${
                    isSelected ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {isUrdu ? (CITY_URDU_MAP[loc.city] || loc.city) : loc.city}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Branch Showcase Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentLoc.id || activeIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white/90 dark:bg-gray-900/90 shadow-md backdrop-blur-sm overflow-hidden"
        >
          {/* Branch Image or Branded Hero Banner */}
          <div className="relative w-full h-36 bg-gradient-to-br from-slate-900 via-primary/30 to-slate-950 overflow-hidden">
            <SafeImage
              src={resolveMediaUrl(currentLoc.imageUrl)}
              alt={currentLoc.name}
              fallbackInitials={
                currentLoc.name
                  .split(" ")
                  .filter((w) => !w.toLowerCase().includes("dhdc"))
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("") || "DHDC"
              }
              fallbackSubtitle={currentLoc.city || "Clinic Branch"}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
              <span className="text-white font-semibold text-sm drop-shadow-sm font-serif truncate pr-2">
                {currentLoc.name}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-sm shrink-0 ${
                  status.open
                    ? "bg-emerald-500/90 text-white"
                    : "bg-rose-500/90 text-white"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {getStatusLabel()}
              </span>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Header when no image */}
            {!currentLoc.imageUrl && (
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base font-serif">
                    {currentLoc.name}
                  </h3>
                  <p className="text-xs text-primary font-medium">{currentLoc.city}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase shrink-0 ${
                    status.open
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30"
                      : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/30"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      status.open ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                  {getStatusLabel()}
                </span>
              </div>
            )}

            {/* Address */}
            <div className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="leading-snug">{fullAddress}</p>
              </div>
            </div>

            {/* Hours Accordion */}
            <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  tap(8);
                  setHoursOpen(!hoursOpen);
                }}
                className="w-full flex items-center justify-between p-3 text-left min-h-[48px]"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{branchHoursList[0]?.days ? `${formatDayLabel(branchHoursList[0].days)}: ${branchHoursList[0].time}` : (isUrdu ? "کلینک کے معیاری اوقات" : "Standard Clinic Hours")}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    hoursOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {hoursOpen && (
                <div className="px-3 pb-3 pt-1 border-t border-gray-150 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400 space-y-1.5">
                  {branchHoursList.map((row, i) => (
                    <div key={i} className="flex justify-between py-0.5 border-b border-gray-200/40 dark:border-gray-800/40 last:border-0">
                      <span className="font-medium text-gray-800 dark:text-gray-300">{formatDayLabel(row.days)}:</span>
                      <span className="font-mono text-gray-900 dark:text-gray-100" dir="ltr">{row.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Doctors at this clinic */}
            {clinicDoctors.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Stethoscope className="w-3 h-3 text-primary" />
                  {isUrdu ? "اس برانچ کے ماہر ڈاکٹرز" : "Specialists at this branch"}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {clinicDoctors.slice(0, 4).map((doc) => (
                    <span
                      key={doc.id}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    >
                      {doc.displayName || `${doc.firstName} ${doc.lastName}`}
                    </span>
                  ))}
                  {clinicDoctors.length > 4 && (
                    <span className="text-[11px] px-1.5 py-0.5 text-gray-400">
                      {isUrdu ? `+${clinicDoctors.length - 4} مزید` : `+${clinicDoctors.length - 4} more`}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 4-Button Action Grid */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              {/* Call */}
              <a
                href={`tel:${clinicPhone}`}
                onClick={() => tap(10)}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary active:scale-95 transition-all min-h-[52px]"
                aria-label="Call clinic"
              >
                <Phone className="w-4 h-4 mb-0.5" />
                <span className="text-[10px] font-semibold">{isUrdu ? "کال" : "Call"}</span>
              </a>

              {/* Directions */}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => tap(10)}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 active:scale-95 transition-all min-h-[52px]"
                aria-label="Get directions"
              >
                <Navigation className="w-4 h-4 mb-0.5" />
                <span className="text-[10px] font-semibold">{isUrdu ? "راستہ" : "Directions"}</span>
              </a>

              {/* Copy Address */}
              <button
                type="button"
                onClick={() => handleCopy(fullAddress)}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 active:scale-95 transition-all min-h-[52px]"
                aria-label="Copy address"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mb-0.5 text-emerald-500" />
                    <span className="text-[10px] font-semibold text-emerald-600">{isUrdu ? "کاپی ہو گیا" : "Copied"}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mb-0.5" />
                    <span className="text-[10px] font-semibold">{isUrdu ? "کاپی" : "Copy"}</span>
                  </>
                )}
              </button>

              {/* Book Appointment at this branch */}
              <button
                type="button"
                onClick={() => {
                  tap(10);
                  openBooking({ clinicId: currentLoc.id });
                }}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-primary text-white active:scale-95 transition-all shadow-sm min-h-[52px] cursor-pointer"
                aria-label="Book at this branch"
              >
                <Calendar className="w-4 h-4 mb-0.5" />
                <span className="text-[10px] font-bold">{isUrdu ? "بک کریں" : "Book"}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Emergency Triage Banner */}
      <div className="rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-950/40 dark:to-orange-950/30 p-3.5 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
              {isUrdu ? "24/7 ڈینٹل ایمرجنسی؟" : "24/7 Dental Emergency?"}
            </p>
            <p className="text-[11px] text-rose-700 dark:text-rose-300">
              {isUrdu ? "ہنگامی درد یا چوٹ کے لیے فوری معائنہ آن کال" : "Immediate triage & trauma relief on-call"}
            </p>
          </div>
        </div>
        <a
          href={`tel:${emergencyPhone}`}
          onClick={() => tap(12)}
          className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold shrink-0 shadow-sm active:scale-95 min-h-[38px] flex items-center gap-1.5"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>{isUrdu ? "24/7 کال کریں" : "Call 24/7"}</span>
        </a>
      </div>
    </div>
  );
}
