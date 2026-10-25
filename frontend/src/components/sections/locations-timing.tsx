"use client";

import { useState } from "react";
import { Clock, MapPin, Navigation, Phone, Calendar } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { getOfficeStatus } from "@/lib/utils";
import { formatTimeRangeString } from "@/lib/currency";

export function LocationsTiming() {
  const { content, locations, workingHours, currency, organization, copy, isLoading } = usePublicContent();
  const [selectedCity, setSelectedCity] = useState<string>("all");

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

  const officeStatus = getOfficeStatus(workingHours, currency?.timezone || organization?.timezone || undefined);

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
            eyebrow="Facilities & Office Timing"
            title={copy.locationsAndTiming}
          />

          {officeStatus && (
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/80 dark:border-gray-800/80 bg-white/90 dark:bg-gray-900/90 px-4 py-2 shadow-xs backdrop-blur-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  officeStatus.isOpen ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                {officeStatus.statusText}
              </span>
              {officeStatus.nextEventText && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  · {officeStatus.nextEventText}
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

        {/* Locations Grid */}
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

            const dayNames = [
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

            return (
              <div
                key={loc.id}
                className="rounded-3xl border border-gray-200/90 dark:border-gray-800/90 bg-white dark:bg-gray-950 p-6 sm:p-8 shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  {/* Branch Name & Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-xl sm:text-2xl font-bold text-gray-950 dark:text-white leading-snug">
                        {loc.name}
                      </h3>
                      {loc.isPrimary && (
                        <span className="rounded-full bg-primary text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          {copy.primaryClinic}
                        </span>
                      )}
                      {officeStatus && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1.5 ${
                            officeStatus.isOpen
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              officeStatus.isOpen ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                            }`}
                          />
                          <span>{officeStatus.statusText}</span>
                          {officeStatus.nextEventText && (
                            <span className="text-[10px] opacity-75 font-normal">
                              • {officeStatus.nextEventText}
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {loc.city && (
                      <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {loc.city}
                      </span>
                    )}
                  </div>

                  {/* Address */}
                  {fullAddress && (
                    <div className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="leading-relaxed whitespace-pre-line">{fullAddress}</span>
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
                      <CopyButton text={phone} label={copy.copyPhone} className="h-7 px-2 text-[11px]" />
                    </div>
                  ) : null}

                  {/* Hours Info / Working Hours Summary */}
                  {locHours.length > 0 ? (
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span>{copy.weeklySchedule}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                        {consolidatedDays.map((wh) => (
                          <div
                            key={wh.dayOfWeek}
                            className="flex justify-between py-1 border-b border-gray-100/60 dark:border-gray-800/60"
                          >
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {wh.dayName}:
                            </span>
                            <span>{wh.timeStr}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : loc.hoursInfo ? (
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <p className="whitespace-pre-line leading-relaxed">{loc.hoursInfo}</p>
                    </div>
                  ) : null}
                </div>

                {/* Actions Footer */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 flex-wrap">
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

                  <Button
                    href="/book"
                    variant="primary"
                    size="sm"
                    className="rounded-full px-5 text-xs font-semibold ml-auto"
                  >
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    <span>{copy.book}</span>
                  </Button>
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
