"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Car, Train, Clock, Phone, Mail, MapPin } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { Card } from "@/components/ui/card";
import { getOfficeStatus, OfficeStatus } from "@/lib/utils";
import { usePublicContent } from "@/components/providers/public-content-provider";

const DEFAULT_SCHEDULE = [
  { day: "Monday", hours: "8:00 AM to 6:00 PM" },
  { day: "Tuesday", hours: "8:00 AM to 6:00 PM" },
  { day: "Wednesday", hours: "8:00 AM to 6:00 PM" },
  { day: "Thursday", hours: "8:00 AM to 6:00 PM" },
  { day: "Friday", hours: "8:00 AM to 2:00 PM" },
  { day: "Saturday", hours: "9:00 AM to 1:00 PM" },
  { day: "Sunday", hours: "Closed" },
];

/**
 * Renders office locations, transit directions, parking availability, and weekly hours.
 * Dynamically populated from CMS and multi-location backend data.
 */
export function Visit() {
  const { content, locations, primaryLocation } = usePublicContent();
  const [selectedLocationId, setSelectedLocationId] = useState<string>(primaryLocation.id);

  const [status, setStatus] = useState<OfficeStatus>({
    isOpen: true,
    statusText: "Open Now",
    nextEventText: "",
  });

  useEffect(() => {
    setStatus(getOfficeStatus());
  }, []);

  const activeLocations = locations.filter((l) => l.isActive);
  const activeLoc =
    activeLocations.find((l) => l.id === selectedLocationId) ||
    primaryLocation ||
    activeLocations[0];

  const fullAddress = `${activeLoc.addressLine1}${
    activeLoc.addressLine2 ? `, ${activeLoc.addressLine2}` : ""
  }, ${activeLoc.city}, ${activeLoc.state} ${activeLoc.postalCode || ""}`;

  const phone = activeLoc.phone || content.general?.phone || "(312) 555-0147";
  const cleanPhone = phone.replace(/[^0-9+]/g, "");
  const email = activeLoc.email || content.general?.email || "care@marlowdental.com";

  return (
    <section id="visit" className="border-t border-line bg-bone py-20 md:py-28">
      <div className="container-x">
        {/* Multi-Location Switcher Tabs if practice has multiple locations */}
        {activeLocations.length > 1 && (
          <div className="mb-10 flex flex-wrap gap-2 border-b border-line pb-4">
            <span className="text-xs text-ink-soft flex items-center gap-1.5 mr-2">
              <MapPin className="h-3.5 w-3.5 text-forest" />
              Practice Locations:
            </span>
            {activeLocations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => setSelectedLocationId(loc.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  activeLoc.id === loc.id
                    ? "bg-forest text-white shadow-sm"
                    : "bg-cream text-ink-soft hover:bg-sand/60 hover:text-ink"
                }`}
              >
                {loc.name} {loc.isPrimary && "(Primary)"}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Practice Location & Transit Info - 5 cols */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-5 space-y-8"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="eyebrow">{activeLoc.name || "Location & Hours"}</p>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${
                    status.isOpen
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      status.isOpen ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  {status.statusText}
                </span>
              </div>
              <h2 className="fluid-h2 tracking-[-0.02em] text-ink font-normal">
                Easy to find,
                <br />
                easy to park,
                <br />
                easy to enter.
              </h2>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft/70">
                  Facility Address
                </p>
                <CopyButton text={fullAddress} label="Copy Address" />
              </div>
              <p className="font-display text-[20px] leading-snug text-ink">
                {activeLoc.addressLine1}
                {activeLoc.addressLine2 && <><br />{activeLoc.addressLine2}</>}
                <br />
                {activeLoc.city}, {activeLoc.state} {activeLoc.postalCode}
              </p>
              <p className="text-xs sm:text-[13px] leading-relaxed text-ink-soft">
                Ground-floor private practice with step-free, wheelchair accessible entrance directly from the sidewalk.
              </p>
            </div>

            {/* Parking */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-ink font-medium text-sm">
                <Car className="h-4 w-4 text-forest dark:text-emerald-400" />
                <span>Dedicated Patient Parking</span>
              </div>
              <p className="text-xs sm:text-[13px] leading-relaxed text-ink-soft">
                Free patient parking stalls behind the building (first-come, first-served), plus ample street parking.
              </p>
            </div>

            {/* Public Transit */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-ink font-medium text-sm">
                <Train className="h-4 w-4 text-forest dark:text-emerald-400" />
                <span>Transit Access</span>
              </div>
              <p className="text-xs sm:text-[13px] leading-relaxed text-ink-soft">
                {content.contact?.transitNote ||
                  "Convenient access via nearby rapid transit stations and major metropolitan bus lines."}
              </p>
            </div>

            {/* Direct Contact */}
            <div className="pt-2 border-t border-line/60 flex flex-wrap gap-4 text-sm">
              <a
                href={`tel:${cleanPhone}`}
                className="flex items-center gap-1.5 text-forest dark:text-emerald-400 font-medium hover:underline"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>{phone}</span>
              </a>
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-1.5 text-forest dark:text-emerald-400 font-medium hover:underline"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>{email}</span>
              </a>
            </div>
          </motion.div>

          {/* Map & Office Hours Schedule - 7 cols */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-7 space-y-8"
          >
            {/* Map Frame */}
            <div className="aspect-[16/10] w-full overflow-hidden rounded-[var(--radius-card)] border border-line bg-cream shadow-subtle">
              <iframe
                title={`${activeLoc.name} Location Map`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  fullAddress
                )}&output=embed`}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Office Hours Table */}
            <Card surface="cream" shadow="subtle" className="p-6">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-clay" />
                  <h3 className="font-display text-base text-ink font-medium">
                    Office Hours Schedule
                  </h3>
                </div>
                <span className="text-xs text-ink-soft">
                  {activeLoc.hoursInfo ? "Published Schedule" : "Central Time"}
                </span>
              </div>

              {activeLoc.hoursInfo ? (
                <div className="mt-4 p-4 rounded-xl bg-bone border border-line/60 text-xs text-ink leading-relaxed">
                  {activeLoc.hoursInfo}
                </div>
              ) : (
                <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
                  {DEFAULT_SCHEDULE.map((item) => (
                    <div
                      key={item.day}
                      className="flex items-center justify-between border-b border-line/60 py-1.5 text-xs sm:text-[13px]"
                    >
                      <dt className="text-ink-soft">{item.day}</dt>
                      <dd
                        className={`font-mono ${
                          item.hours === "Closed"
                            ? "text-ink-soft/60"
                            : "font-medium text-ink"
                        }`}
                      >
                        {item.hours}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default Visit;
