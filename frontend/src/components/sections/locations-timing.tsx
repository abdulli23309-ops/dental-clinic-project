"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Clock,
  MapPin,
  Navigation,
  Phone,
  Calendar,
  ChevronDown,
  ChevronUp,
  User,
  Building2,
  Stethoscope,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { getOfficeStatus } from "@/lib/utils";
import { formatTimeRangeString } from "@/lib/currency";
import { resolveMediaUrl } from "@/lib/api";

export function LocationsTiming() {
  const {
    content,
    locations,
    team,
    workingHours,
    currency,
    organization,
    copy,
    isLoading,
  } = usePublicContent();

  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);

  const activeLocations = locations.filter((l) => l.isActive !== false);

  // A section with no data is not rendered at all
  if (!isLoading && activeLocations.length === 0) {
    return null;
  }

  // Derive unique cities dynamically from database locations
  const availableCities = Array.from(
    new Set(activeLocations.map((l) => l.city).filter(Boolean))
  );

  const filteredLocations =
    selectedCity === "all"
      ? activeLocations
      : activeLocations.filter(
          (l) => l.city.toLowerCase() === selectedCity.toLowerCase()
        );

  const officeStatusGlobal = getOfficeStatus(
    workingHours,
    currency?.timezone || organization?.timezone || undefined
  );

  const toggleExpand = (locId: string) => {
    setExpandedLocationId((prev) => (prev === locId ? null : locId));
  };

  return (
    <section
      id="locations"
      className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 py-20 md:py-28 overflow-hidden"
    >
      {/* Anchor alias for backwards compatibility */}
      <span id="visit" className="sr-only" />

      <div className="container-x space-y-12">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SectionHeading
            eyebrow={copy.facilitiesEyebrow}
            title={copy.locationsAndTiming}
          />

          {officeStatusGlobal && (
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/80 dark:border-gray-800/80 bg-white/90 dark:bg-gray-900/90 px-4 py-2 shadow-xs backdrop-blur-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  officeStatusGlobal.isOpen
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-amber-500"
                }`}
              />
              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                {officeStatusGlobal.statusText}
              </span>
              {officeStatusGlobal.nextEventText && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  · {officeStatusGlobal.nextEventText}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Dynamic City Filter Tabs */}
        {availableCities.length > 1 && (
          <div
            className="border-b border-gray-200 dark:border-gray-800 pb-4 flex items-center gap-2 overflow-x-auto scrollbar-none"
            role="tablist"
          >
            <button
              role="tab"
              aria-selected={selectedCity === "all"}
              onClick={() => setSelectedCity("all")}
              className={`rounded-full px-5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCity === "all"
                  ? "bg-primary text-white shadow-subtle font-semibold"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
              }`}
            >
              {copy.allClinics} ({activeLocations.length})
            </button>
            {availableCities.map((city) => {
              const isSelected = selectedCity.toLowerCase() === city.toLowerCase();
              const count = activeLocations.filter(
                (l) => l.city.toLowerCase() === city.toLowerCase()
              ).length;
              return (
                <button
                  key={city}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedCity(city)}
                  className={`rounded-full px-5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-white shadow-subtle font-semibold"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {city} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Locations Cards List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {filteredLocations.map((loc) => {
            const isPrimary = loc.isPrimary || activeLocations.length === 1;
            const fullAddress =
              isPrimary && content.general?.address?.trim()
                ? content.general.address.trim()
                : [
                    loc.addressLine1,
                    loc.addressLine2,
                    loc.city,
                    loc.state,
                    loc.postalCode,
                  ]
                    .filter(Boolean)
                    .join(", ");

            const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${loc.name}, ${fullAddress}`
            )}`;

            const phone =
              isPrimary && content.general?.phone?.trim()
                ? content.general.phone.trim()
                : loc.phone || "";
            const cleanPhone = phone.replace(/[^0-9+]/g, "");

            const locHours = workingHours.filter((wh) => {
              const clinicId = (loc as { clinicId?: string }).clinicId;
              if (clinicId) {
                return wh.clinicId === clinicId;
              }
              if (loc.isPrimary) {
                return true;
              }
              return wh.clinicId === loc.id;
            });

            const dayNames = copy.daysOfWeek || [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ];

            const consolidatedDays = Array.from({ length: 7 }, (_, dow) => {
              const dayItems = locHours.filter((h) => h.dayOfWeek === dow);
              if (dayItems.length === 0) {
                return {
                  dayOfWeek: dow,
                  dayName: dayNames[dow],
                  timeStr: copy.closed,
                  isClosed: true,
                };
              }
              const openItems = dayItems.filter((h) => !h.isClosed);
              if (openItems.length === 0) {
                return {
                  dayOfWeek: dow,
                  dayName: dayNames[dow],
                  timeStr: copy.closed,
                  isClosed: true,
                };
              }
              const blockStrings = openItems.map((h) =>
                formatTimeRangeString(h.openTime, h.closeTime)
              );
              return {
                dayOfWeek: dow,
                dayName: dayNames[dow],
                timeStr: blockStrings.join(", "),
                isClosed: false,
              };
            });

            const officeStatus = getOfficeStatus(
              locHours.length > 0 ? locHours : null,
              organization?.timezone || "Asia/Karachi"
            );

            // Resident doctors assigned to this clinic
            const assignedDoctors = team.filter(
              (m) => m.locationId === loc.id && m.isActive !== false
            );

            const isExpanded = expandedLocationId === loc.id;
            const photoSrc = loc.imageUrl
              ? resolveMediaUrl(loc.imageUrl) || loc.imageUrl
              : null;

            return (
              <div
                key={loc.id}
                className={`rounded-3xl border transition-all duration-300 bg-white dark:bg-gray-950 overflow-hidden shadow-xs hover:border-primary/40 ${
                  isExpanded
                    ? "border-primary/50 shadow-md ring-1 ring-primary/20"
                    : "border-gray-200/90 dark:border-gray-800/90"
                }`}
              >
                {/* Branch Photo or Soft Gradient Placeholder */}
                <div className="p-4 sm:p-6 pb-0">
                  <div className="relative w-full aspect-[16/9] overflow-hidden rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 group">
                    {photoSrc ? (
                      <Image
                        src={photoSrc}
                        alt={loc.name}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 text-gray-400">
                        <Building2 className="h-12 w-12 stroke-[1.2] mb-2 text-gray-500" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          {loc.name}
                        </span>
                      </div>
                    )}

                    {/* Gradient overlay for badges readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

                    {/* Badges Overlay */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 flex-wrap pointer-events-none">
                      <div className="flex items-center gap-2 flex-wrap">
                        {loc.isPrimary && (
                          <span className="rounded-full bg-primary text-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-sm">
                            {copy.primaryClinic}
                          </span>
                        )}
                        {officeStatus && (
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-md shadow-sm ${
                              officeStatus.isOpen
                                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                                : "bg-black/60 text-gray-300 border border-white/20"
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                officeStatus.isOpen
                                  ? "bg-emerald-400 animate-pulse"
                                  : "bg-gray-400"
                              }`}
                            />
                            <span>{officeStatus.statusText}</span>
                          </span>
                        )}
                      </div>

                      {loc.city && (
                        <span className="rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 px-3 py-1 text-xs font-semibold">
                          {loc.city}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 sm:p-8 pt-4 sm:pt-6 space-y-6">
                  {/* Branch Name & Address */}
                  <div className="space-y-3">
                    <h3 className="font-display text-2xl font-bold text-gray-950 dark:text-white leading-snug">
                      {loc.name}
                    </h3>

                    {fullAddress && (
                      <div className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                        <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="leading-relaxed whitespace-pre-line">
                          {fullAddress}
                        </span>
                      </div>
                    )}

                    {/* Phone with Click-to-call and Copy */}
                    {phone ? (
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                        <Phone className="h-4 w-4 text-primary shrink-0" />
                        <a
                          href={`tel:${cleanPhone}`}
                          className="hover:text-primary font-semibold transition-colors"
                        >
                          <bdi dir="ltr">{phone}</bdi>
                        </a>
                        <CopyButton
                          text={phone}
                          label={copy.copyPhone}
                          className="h-7 px-2 text-[11px]"
                        />
                      </div>
                    ) : null}
                  </div>

                  {/* Collapsed/Expanded Details Section */}
                  {isExpanded && (
                    <div className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      {/* Operating Hours */}
                      {locHours.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                            <Clock className="h-4 w-4 text-primary" />
                            <span>{copy.branchSchedule}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50/80 dark:bg-gray-900/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                            {consolidatedDays.map((wh) => (
                              <div
                                key={wh.dayOfWeek}
                                className="flex justify-between py-1 border-b border-gray-200/50 dark:border-gray-800/50"
                              >
                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                  {wh.dayName}:
                                </span>
                                <span className={wh.isClosed ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
                                  {wh.timeStr}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : loc.hoursInfo ? (
                        <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/60 p-4 rounded-2xl">
                          <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <p className="whitespace-pre-line leading-relaxed">
                            {loc.hoursInfo}
                          </p>
                        </div>
                      ) : null}

                      {/* Assigned Doctors */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                          <Stethoscope className="h-4 w-4 text-primary" />
                          <span>{copy.assignedDoctors}</span>
                        </div>

                        {assignedDoctors.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {assignedDoctors.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800"
                              >
                                <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 bg-gray-200 dark:bg-gray-800 relative">
                                  {doc.photoUrl ? (
                                    <Image
                                      src={resolveMediaUrl(doc.photoUrl) || doc.photoUrl}
                                      alt={doc.displayName}
                                      fill
                                      unoptimized
                                      className="object-cover object-top"
                                    />
                                  ) : (
                                    <div className="w-full h-full grid place-items-center text-gray-400">
                                      <User className="h-6 w-6 stroke-[1.5]" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                    {doc.displayName}
                                  </h4>
                                  {doc.professionalTitle && (
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                      {doc.professionalTitle}
                                    </p>
                                  )}
                                  {doc.specialties && doc.specialties.length > 0 && (
                                    <p className="text-[10px] text-primary font-medium truncate pt-0.5">
                                      {doc.specialties.slice(0, 2).join(" · ")}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-900/60 p-3 rounded-2xl">
                            {copy.noAssignedDoctors}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 flex-wrap">
                    {/* Directions link */}
                    {fullAddress && (
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                      >
                        <Navigation className="h-4 w-4 text-primary" />
                        <span>{copy.getDirections}</span>
                      </a>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                      {/* Expand / Collapse Details Button */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(loc.id)}
                        className="rounded-full px-4 py-2 text-xs font-semibold border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        aria-expanded={isExpanded}
                      >
                        <span>{isExpanded ? copy.hideDetails : copy.viewDetails}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {/* Book Appointment CTA */}
                      <Button
                        href={`/book?clinic=${encodeURIComponent(loc.id)}`}
                        variant="primary"
                        size="sm"
                        className="rounded-full px-5 text-xs font-semibold"
                      >
                        <Calendar className="h-3.5 w-3.5 mr-1.5" />
                        <span>{copy.bookAppointment}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default LocationsTiming;
