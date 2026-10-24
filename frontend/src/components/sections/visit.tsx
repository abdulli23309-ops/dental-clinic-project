"use client";

import { useState } from "react";
import { Clock, MapPin, Navigation, Phone } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { getOfficeStatus } from "@/lib/utils";
import { getUiCopy } from "@/content/ui-copy";

export function Visit() {
  const { locations, workingHours, currency, isLoading } = usePublicContent();
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const copy = getUiCopy("en");

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

  const officeStatus = getOfficeStatus(workingHours, currency.timezone);

  return (
    <section
      id="visit"
      className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-20 md:py-28 overflow-hidden"
    >
      <div className="container-x space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Facilities & Office Timing"
            title={copy.locationsAndTiming}
          />
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
              All ({activeLocations.length})
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

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex flex-col md:flex-row w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 gap-6 animate-pulse"
              >
                <div className="flex-1 space-y-3 py-2">
                  <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredLocations.length === 0 ? null : (
          <div className="space-y-4">
            {filteredLocations.map((loc) => {
              const fullAddress = [
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

              const phone = loc.phone || "";
              const cleanPhone = phone.replace(/[^0-9+]/g, "");

              return (
                <div
                  key={loc.id}
                  className="flex flex-col md:flex-row w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-6 gap-6 items-stretch md:items-center justify-between hover:border-primary/40 transition-all"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-lg sm:text-xl text-gray-900 dark:text-white font-semibold leading-snug">
                        {loc.name}
                      </h3>
                      {loc.city && (
                        <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                          {loc.city}
                          {loc.state ? `, ${loc.state}` : ""}
                        </span>
                      )}
                      {loc.isPrimary && (
                        <span className="rounded-full bg-primary text-white px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider">
                          Primary Clinic
                        </span>
                      )}
                    </div>

                    {fullAddress && (
                      <div className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{fullAddress}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 pt-1 flex-wrap">
                      {phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                          <a
                            href={`tel:${cleanPhone}`}
                            className="hover:text-primary font-medium"
                          >
                            {phone}
                          </a>
                        </div>
                      ) : null}

                      {officeStatus ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              officeStatus.isOpen ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          <span className="font-medium">
                            {officeStatus.statusText}
                            {officeStatus.nextEventText ? ` · ${officeStatus.nextEventText}` : ""}
                          </span>
                        </div>
                      ) : null}

                      {loc.hoursInfo && (
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate max-w-xs">
                            {loc.hoursInfo.split("\n")[0]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-gray-800">
                    {fullAddress && (
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <Navigation className="h-3.5 w-3.5 text-primary" />
                        <span>{copy.getDirections}</span>
                      </a>
                    )}

                    <Button
                      href="/book"
                      variant="primary"
                      size="sm"
                      className="rounded-full px-5 text-xs"
                    >
                      <span>{copy.book}</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default Visit;
