"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  Car,
  Clock,
  Compass,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Train,
} from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
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

export function Visit() {
  const { content, clinics, primaryLocation } = usePublicContent();
  const [selectedCity, setSelectedCity] = useState<string>("All Cities");
  const [selectedClinicId, setSelectedClinicId] = useState<string>(primaryLocation.id);

  const [status, setStatus] = useState<OfficeStatus>({
    isOpen: true,
    statusText: "Open Now",
    nextEventText: "",
  });

  useEffect(() => {
    setStatus(getOfficeStatus());
  }, []);

  const activeClinics = clinics.filter((l) => l.isActive);

  // Extract unique cities
  const uniqueCities = Array.from(
    new Set(activeClinics.map((c) => c.city).filter(Boolean))
  );
  const cityTabs = ["All Cities", ...uniqueCities];

  const filteredClinics =
    selectedCity === "All Cities"
      ? activeClinics
      : activeClinics.filter((c) => c.city.toLowerCase() === selectedCity.toLowerCase());

  const activeClinic =
    activeClinics.find((l) => l.id === selectedClinicId) ||
    filteredClinics[0] ||
    primaryLocation ||
    activeClinics[0];

  const fullAddress = `${activeClinic.addressLine1}${
    activeClinic.addressLine2 ? `, ${activeClinic.addressLine2}` : ""
  }, ${activeClinic.city}, ${activeClinic.state} ${activeClinic.postalCode || ""}`;

  const phone = activeClinic.phone || content.general?.phone || "(312) 555-0147";
  const cleanPhone = phone.replace(/[^0-9+]/g, "");
  const email = activeClinic.email || content.general?.email || "care@marlowdental.com";

  return (
    <section id="visit" className="border-t border-line bg-bone py-20 md:py-28">
      <div className="container-x space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Nationwide Network"
            title={
              <>
                Our Nationwide Clinics
                <br />
                &amp; Modern Facilities
              </>
            }
          />
          <p className="max-w-md text-sm leading-relaxed text-ink-soft">
            Explore dedicated branch clinics designed with quiet single-chair operatory suites, ground-floor accessibility, and dedicated parking.
          </p>
        </div>

        {/* Dynamic City Filter Tabs */}
        {cityTabs.length > 1 && (
          <div className="border-b border-line pb-4 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider font-mono mr-1">
              Cities:
            </span>
            {cityTabs.map((city) => {
              const isSelected = selectedCity === city;
              return (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? "bg-forest text-white shadow-subtle font-semibold"
                      : "bg-cream text-ink-soft hover:text-ink hover:bg-sand/60 border border-line"
                  }`}
                >
                  {city}
                </button>
              );
            })}
          </div>
        )}

        {/* Horizontal Cards for Clinics in Selected City */}
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin snap-x snap-mandatory">
          {filteredClinics.map((clinic) => {
            const isCurrent = activeClinic.id === clinic.id;
            const clinicFullAddr = `${clinic.addressLine1}${
              clinic.addressLine2 ? `, ${clinic.addressLine2}` : ""
            }, ${clinic.city}, ${clinic.state}`;

            return (
              <div
                key={clinic.id}
                className="w-[300px] sm:w-[340px] md:w-[380px] shrink-0 snap-start"
              >
                <Card
                  surface={isCurrent ? "cream" : "bone"}
                  shadow={isCurrent ? "card" : "subtle"}
                  hoverLift={true}
                  className={`h-full flex flex-col justify-between p-6 rounded-2xl border transition-all ${
                    isCurrent ? "ring-2 ring-forest border-forest" : "border-line"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-line/60 pb-3">
                      <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-[10.5px] font-mono font-bold text-forest uppercase">
                        {clinic.city}
                      </span>
                      {clinic.isPrimary && (
                        <span className="rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-[10px] font-semibold">
                          Primary Headquarters
                        </span>
                      )}
                    </div>

                    <h3 className="font-display text-lg sm:text-xl font-bold text-ink leading-snug">
                      {clinic.name}
                    </h3>

                    <p className="text-xs text-ink-soft leading-relaxed">
                      {clinicFullAddr}
                    </p>

                    <div className="pt-2 text-xs text-ink-soft space-y-1">
                      {clinic.phone && (
                        <p className="flex items-center gap-1.5 font-medium text-ink">
                          <Phone className="h-3 w-3 text-forest" />
                          <span>{clinic.phone}</span>
                        </p>
                      )}
                      {clinic.hoursInfo && (
                        <p className="flex items-center gap-1.5 text-[11px] text-ink-soft line-clamp-2">
                          <Clock className="h-3 w-3 text-clay shrink-0" />
                          <span>{clinic.hoursInfo}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-line/60 flex items-center gap-2">
                    <Button
                      href={`/book?clinic=${clinic.id}`}
                      variant="primary"
                      size="sm"
                      className="flex-1 justify-center text-xs"
                    >
                      <span>Book Here</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                    <button
                      onClick={() => setSelectedClinicId(clinic.id)}
                      className="px-3 py-1.5 rounded-lg border border-line bg-white/70 dark:bg-black/30 text-xs text-ink hover:bg-sand/60 transition-colors"
                    >
                      View Map
                    </button>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Selected Clinic Map & Detailed Information */}
        <div className="pt-6 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14 items-start">
          {/* Practice Location & Transit Info - 5 cols */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="eyebrow">{activeClinic.name}</span>
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
              <h3 className="font-display text-2xl text-ink font-bold leading-tight">
                {activeClinic.name}
              </h3>
            </div>

            {/* Address */}
            <div className="space-y-2 rounded-2xl bg-cream/60 border border-line p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft/70">
                  Facility Address
                </p>
                <CopyButton text={fullAddress} label="Copy Address" />
              </div>
              <p className="font-display text-base text-ink">
                {activeClinic.addressLine1}
                {activeClinic.addressLine2 && <><br />{activeClinic.addressLine2}</>}
                <br />
                {activeClinic.city}, {activeClinic.state} {activeClinic.postalCode}
              </p>
            </div>

            {/* Parking & Transit */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-ink font-medium text-xs">
                <Car className="h-4 w-4 text-forest" />
                <span>Dedicated Patient Parking Available</span>
              </div>
              <div className="flex items-center gap-2 text-ink font-medium text-xs">
                <Train className="h-4 w-4 text-forest" />
                <span>Nearby Rapid Transit &amp; Metropolitan Bus Lines</span>
              </div>
            </div>

            {/* Direct Contact */}
            <div className="pt-2 border-t border-line/60 flex flex-wrap gap-4 text-xs font-medium">
              <a
                href={`tel:${cleanPhone}`}
                className="flex items-center gap-1.5 text-forest hover:underline"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>{phone}</span>
              </a>
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-1.5 text-forest hover:underline"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>{email}</span>
              </a>
            </div>
          </div>

          {/* Interactive Map & Hours Schedule - 7 cols */}
          <div className="lg:col-span-7 space-y-6">
            <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl border border-line bg-cream shadow-subtle">
              <iframe
                title={`${activeClinic.name} Map`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  fullAddress
                )}&output=embed`}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Office Hours */}
            <Card surface="cream" shadow="subtle" className="p-5 rounded-2xl border border-line">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-clay" />
                  <h4 className="font-display text-sm font-bold text-ink">
                    Operating Schedule
                  </h4>
                </div>
                <span className="text-xs text-ink-soft">
                  {activeClinic.hoursInfo ? "Published Schedule" : "Central Time"}
                </span>
              </div>

              {activeClinic.hoursInfo ? (
                <div className="mt-3 p-3 rounded-xl bg-bone border border-line/60 text-xs text-ink leading-relaxed whitespace-pre-line">
                  {activeClinic.hoursInfo}
                </div>
              ) : (
                <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                  {DEFAULT_SCHEDULE.map((item) => (
                    <div
                      key={item.day}
                      className="flex items-center justify-between border-b border-line/40 py-1 text-xs"
                    >
                      <dt className="text-ink-soft">{item.day}</dt>
                      <dd className="font-mono text-ink font-medium">{item.hours}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Visit;
