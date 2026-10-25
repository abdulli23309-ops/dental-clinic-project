"use client";

import { useState, useRef } from "react";
import { motion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  Calendar,
  Award,
  Users,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { resolveMediaUrl } from "@/lib/api";

export function OurTeam() {
  const { team, locations, isLoading, copy } = usePublicContent();
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter only active team members
  const activeTeam = team.filter((m) => m.isActive !== false);

  // A section with no data is not rendered at all
  if (!isLoading && activeTeam.length === 0) {
    return null;
  }

  // Derive unique cities from active locations
  const availableCities = Array.from(
    new Set(
      locations
        .filter((l) => l.isActive !== false)
        .map((l) => l.city)
        .filter(Boolean)
    )
  );

  // Map each doctor to facility
  const doctorsWithLocations = activeTeam.map((member) => {
    const loc = member.locationId
      ? locations.find((l) => l.id === member.locationId)
      : null;
    return {
      ...member,
      locationName: loc?.name || "",
      city: loc?.city || "",
    };
  });

  const filteredDoctors =
    selectedCity === "all"
      ? doctorsWithLocations
      : doctorsWithLocations.filter(
          (d) => d.city.toLowerCase() === selectedCity.toLowerCase()
        );

  const scroll = (offset: number) => {
    scrollRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <section
      id="team"
      className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-20 md:py-28 overflow-hidden"
    >
      <div className="container-x space-y-12">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Clinical Specialists"
            title={copy.team}
          />
          <p className="max-w-md text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Dedicated clinicians committed to continuous medical education, compassionate communication, and meticulous clinical artistry.
          </p>
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
              All Clinicians ({activeTeam.length})
            </button>
            {availableCities.map((city) => {
              const isSelected = selectedCity.toLowerCase() === city.toLowerCase();
              const count = doctorsWithLocations.filter(
                (d) => d.city.toLowerCase() === city.toLowerCase()
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

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                className="h-80 rounded-3xl border border-gray-200 dark:border-gray-800"
              />
            ))}
          </div>
        ) : filteredDoctors.length === 0 ? null : (
          /* Clinician Cards Grid / Scroll */
          <div className="relative w-full group">
            {filteredDoctors.length > 3 && (
              <>
                <button
                  onClick={() => scroll(-340)}
                  aria-label="Previous clinicians"
                  className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-full shadow-lg border border-gray-200 dark:border-gray-700 items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => scroll(340)}
                  aria-label="Next clinicians"
                  className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-full shadow-lg border border-gray-200 dark:border-gray-700 items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            <div
              ref={scrollRef}
              className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-6 hide-scrollbar scrollbar-none scroll-smooth"
            >
              {filteredDoctors.map((doc, idx) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.45, delay: idx * 0.08 }}
                  className="w-[82%] sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)] min-w-[280px] md:min-w-[320px] shrink-0 snap-start bg-white dark:bg-gray-900 rounded-xl border border-gray-200/90 dark:border-gray-800/90 p-4 shadow-xs hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    {/* Portrait Photo Container */}
                    <div className="w-full aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3.5 relative shadow-inner">
                      {doc.photoUrl ? (
                        <img
                          src={resolveMediaUrl(doc.photoUrl) || doc.photoUrl}
                          alt={doc.displayName}
                          width={320}
                          height={400}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 text-gray-400">
                          <User className="h-16 w-16 stroke-[1.2]" />
                        </div>
                      )}

                      {/* Director / Role Badge */}
                      {doc.role === "Director" && (
                        <span className="absolute top-3 left-3 rounded-full bg-primary text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                          <Award className="h-3 w-3" />
                          <span>Director</span>
                        </span>
                      )}

                      {/* Optional Patients Treated Badge: only shown if admin toggle is on AND real API count > 0 */}
                      {(() => {
                        const count =
                          (doc as any).patientsTreated ??
                          (doc as any).patientsTreatedCount;
                        if (
                          !doc.showPatientsTreated ||
                          typeof count !== "number" ||
                          count <= 0
                        ) {
                          return null;
                        }
                        return (
                          <span className="absolute bottom-3 left-3 rounded-full bg-black/70 backdrop-blur-md text-white px-2.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 shadow-sm">
                            <Users className="h-3 w-3 text-primary" />
                            <span>{count.toLocaleString()}+ Patients Treated</span>
                          </span>
                        );
                      })()}
                    </div>

                    {/* Name, Credentials, Title */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-lg font-bold text-gray-950 dark:text-white leading-snug">
                          {doc.displayName}
                        </h3>
                        {doc.credentials && (
                          <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {doc.credentials}
                          </span>
                        )}
                      </div>

                      {doc.professionalTitle && (
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {doc.professionalTitle}
                        </p>
                      )}

                      {doc.biography && (
                        <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-3 pt-1">
                          {doc.biography}
                        </p>
                      )}

                      {doc.locationName && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 pt-1">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{doc.locationName}</span>
                        </div>
                      )}

                      {/* Specialties Tags */}
                      {doc.specialties && doc.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {doc.specialties.slice(0, 3).map((spec, i) => (
                            <span
                              key={i}
                              className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-[10px] text-gray-600 dark:text-gray-300"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Book Consultation Button */}
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                    <Button
                      href={`/book?doctor=${encodeURIComponent(doc.id)}`}
                      variant="primary"
                      size="sm"
                      className="w-full justify-center text-xs font-semibold rounded-xl"
                    >
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      <span>{copy.book} Consultation</span>
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default OurTeam;
