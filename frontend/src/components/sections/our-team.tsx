"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  User,
  MapPin,
  Calendar,
  Award,
  Users,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CoverflowCarousel } from "@/components/ui/coverflow-carousel";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { resolveMediaUrl } from "@/lib/api";

// Helper for per-doctor portrait focal point framing
function getDoctorFocalClass(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("maral") || lower.includes("meral")) {
    return "object-[50%_65%] scale-110";
  }
  if (lower.includes("bilal")) {
    return "object-[50%_25%]";
  }
  if (lower.includes("sarah") || lower.includes("faraz")) {
    return "object-[50%_15%]";
  }
  return "object-[50%_15%]";
}

export function OurTeam() {
  const { team, locations, isLoading, copy, locale } = usePublicContent();
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const shouldReduceMotion = useReducedMotion();
  const isRtl = locale === "ur";

  // Filter only active team members
  const activeTeam = team.filter(
    (m) => m.isActive !== false && !m.displayName?.toLowerCase().includes("test")
  );

  // Derive unique cities from active locations
  const availableCities = Array.from(
    new Set(
      locations
        .filter((l) => l.isActive !== false)
        .map((l) => l.city)
        .filter(Boolean)
    )
  );

  // Map each doctor to facility and city
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

  // Calculate active branches in the currently selected city
  const branchesInSelectedCity =
    selectedCity === "all"
      ? []
      : locations.filter(
          (l) =>
            l.isActive !== false &&
            l.city &&
            l.city.toLowerCase() === selectedCity.toLowerCase()
        );

  const filteredDoctors = doctorsWithLocations.filter((d) => {
    if (
      selectedCity !== "all" &&
      d.city.toLowerCase() !== selectedCity.toLowerCase()
    ) {
      return false;
    }
    if (selectedBranch !== "all") {
      if (
        d.locationId !== selectedBranch &&
        d.locationName.toLowerCase() !== selectedBranch.toLowerCase()
      ) {
        return false;
      }
    }
    return true;
  });

  const handleImageError = useCallback((id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  }, []);

  // If no doctors exist, return null
  if (!isLoading && activeTeam.length === 0) {
    return null;
  }

  return (
    <section
      id="team"
      className="border-t border-gray-200 dark:border-gray-800 bg-[#FAF9F6] dark:bg-gray-950 py-24 md:py-32 overflow-hidden select-none relative"
      aria-label="Our Clinical Specialists"
    >
      <div className="container-x space-y-10 md:space-y-14 relative z-10">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <SectionHeading
            eyebrow={copy.specialistsEyebrow}
            title={copy.team}
          />
          <p className="max-w-md text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {copy.specialistsDesc}
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
              onClick={() => {
                setSelectedCity("all");
                setSelectedBranch("all");
                setActiveIndex(0);
              }}
              className={`rounded-full px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCity === "all"
                  ? "relative z-0 text-primary-foreground font-semibold shadow-sm"
                  : "bg-white/80 dark:bg-gray-900/80 backdrop-blur-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/80 dark:border-gray-800/80"
              }`}
            >
              {selectedCity === "all" && (
                <motion.span
                  layoutId="active-pill-team"
                  className="absolute inset-0 -z-10 rounded-full bg-primary shadow-sm"
                  transition={shouldReduceMotion ? { duration: 0.01 } : { type: "spring", stiffness: 500, damping: 40, mass: 1 }}
                />
              )}
              {copy.allSpecialists} ({activeTeam.length})
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
                  onClick={() => {
                    setSelectedCity(city);
                    setSelectedBranch("all");
                    setActiveIndex(0);
                  }}
                  className={`rounded-full px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? "relative z-0 text-primary-foreground font-semibold shadow-sm"
                      : "bg-white/80 dark:bg-gray-900/80 backdrop-blur-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/80 dark:border-gray-800/80"
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="active-pill-team"
                      className="absolute inset-0 -z-10 rounded-full bg-primary shadow-sm"
                      transition={shouldReduceMotion ? { duration: 0.01 } : { type: "spring", stiffness: 500, damping: 40, mass: 1 }}
                    />
                  )}
                  {city} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Conditional Multi-Branch Sub-Filter */}
        {(() => {
          if (selectedCity === "all" || branchesInSelectedCity.length <= 1) {
            return null;
          }
          const activeCityLabel =
            availableCities.find(
              (c) => c.toLowerCase() === selectedCity.toLowerCase()
            ) || selectedCity;

          return (
            <div
              className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-1 pb-2"
              role="tablist"
              aria-label="Branch sub-filter"
            >
              {/* All in selected city pill */}
              <button
                type="button"
                role="tab"
                aria-selected={selectedBranch === "all"}
                onClick={() => {
                  setSelectedBranch("all");
                  setActiveIndex(0);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  selectedBranch === "all"
                    ? "relative z-0 text-primary dark:text-white border border-primary/40 shadow-sm font-semibold"
                    : "bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/10 hover:border-primary/30 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {selectedBranch === "all" && (
                  <motion.span
                    layoutId="active-pill-team-branch"
                    className="absolute inset-0 -z-10 rounded-full bg-primary/15 dark:bg-primary/25"
                    transition={shouldReduceMotion ? { duration: 0.01 } : { type: "spring", stiffness: 500, damping: 40, mass: 1 }}
                  />
                )}
                {selectedBranch === "all" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                )}
                <span>All {activeCityLabel}</span>
              </button>

              {/* Specific branch pills */}
              {branchesInSelectedCity.map((b) => {
                const isBranchActive =
                  selectedBranch === b.id ||
                  selectedBranch.toLowerCase() === b.name.toLowerCase();

                const branchNameClean = b.name.includes("–")
                  ? b.name.split("–")[1].trim()
                  : b.name.includes("-")
                  ? b.name.split("-")[1].trim()
                  : b.name;

                return (
                  <button
                    key={b.id}
                    type="button"
                    role="tab"
                    aria-selected={isBranchActive}
                    onClick={() => {
                      setSelectedBranch(b.id);
                      setActiveIndex(0);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      isBranchActive
                        ? "relative z-0 text-primary dark:text-white border border-primary/40 shadow-sm font-semibold"
                        : "bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/10 hover:border-primary/30 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {isBranchActive && (
                      <motion.span
                        layoutId="active-pill-team-branch"
                        className="absolute inset-0 -z-10 rounded-full bg-primary/15 dark:bg-primary/25"
                        transition={shouldReduceMotion ? { duration: 0.01 } : { type: "spring", stiffness: 500, damping: 40, mass: 1 }}
                      />
                    )}
                    {isBranchActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    )}
                    <span>{branchNameClean}</span>
                  </button>
                );
              })}
            </div>
          );
        })()}

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
        ) : filteredDoctors.length === 0 ? (
          /* Empty State */
          <div className="rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-12 text-center text-gray-500 dark:text-gray-400 text-sm">
            <User className="h-10 w-10 mx-auto text-gray-400 mb-3" />
            <p>{copy.noDoctorsForCity}</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedCity}-${selectedBranch}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.01 : 0.2, ease: "easeInOut" }}
              className="w-full overflow-x-clip md:overflow-visible"
            >
              <CoverflowCarousel
                items={filteredDoctors}
                activeIndex={activeIndex}
                onChange={setActiveIndex}
                prevAriaLabel={copy.previousClinicians}
                nextAriaLabel={copy.nextClinicians}
                itemAriaLabelPrefix="clinician"
                ariaLabel={copy.team}
                getItemKey={(doc) => doc.id}
                isRtl={isRtl}
                renderItem={(doc, idx, { isFront }) => {
                  const hasImage = Boolean(doc.photoUrl && !imageErrors[doc.id]);

                  return (
                    <div
                      className={`group relative w-[min(300px,80vw)] sm:w-[310px] md:w-[320px] h-[495px] sm:h-[525px] rounded-3xl bg-white dark:bg-[#0B0F19] border p-3.5 sm:p-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)] flex flex-col justify-between transition-all duration-300 select-none ${
                        isFront
                          ? "ring-2 ring-primary border-primary shadow-[0_25px_60px_-15px_hsl(var(--primary)/0.28)] scale-[1.01]"
                          : "border-slate-200/80 dark:border-white/10 hover:border-primary/40 shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
                      }`}
                    >
                      {/* Specular top-edge glass highlight */}
                      <div
                        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/30 to-transparent pointer-events-none z-20"
                        aria-hidden="true"
                      />

                      <div>
                        {/* Portrait Photo Container with branded fallback avatar */}
                        <div className="relative w-full h-[200px] sm:h-[225px] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800/60 mb-3 shadow-inner">
                          {hasImage ? (
                            <Image
                              src={resolveMediaUrl(doc.photoUrl) || doc.photoUrl!}
                              alt={doc.displayName}
                              width={340}
                              height={340}
                              priority={isFront}
                              sizes="(max-width: 640px) 320px, 340px"
                              className={`w-full h-full object-cover object-top pointer-events-none transition-transform duration-700 group-hover:scale-[1.03] ${getDoctorFocalClass(
                                doc.displayName
                              )}`}
                              onError={() => handleImageError(doc.id)}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-stone-100 via-stone-200/70 to-stone-100 dark:from-gray-850 dark:via-gray-800 dark:to-gray-850 text-primary select-none p-4 text-center">
                              <span className="font-display text-3xl font-bold tracking-wider">
                                {doc.displayName
                                  .split(" ")
                                  .filter((w) => !w.toLowerCase().includes("dr"))
                                  .slice(0, 2)
                                  .map((w) => w[0])
                                  .join("") || "MD"}
                              </span>
                              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">
                                {doc.role || "Clinical Specialist"}
                              </span>
                            </div>
                          )}

                          {/* Director / Role Badge */}
                          {doc.role === "Director" && (
                            <span className="absolute top-2.5 left-2.5 rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm z-10">
                              <Award className="h-3 w-3" />
                              <span>{copy.director}</span>
                            </span>
                          )}

                          {/* Sleek Frosted-Glass Credential Pill at Bottom-Left of Portrait */}
                          {doc.credentials && (
                            <span className="absolute bottom-2.5 left-2.5 backdrop-blur-md bg-black/55 dark:bg-slate-950/70 text-white border border-white/15 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase z-10 shadow-sm">
                              {doc.credentials}
                            </span>
                          )}

                          {/* Patients Treated Badge */}
                          {(() => {
                            const doctorCounts = doc as typeof doc & {
                              patientsTreated?: number | null;
                              patientsTreatedCount?: number | null;
                            };
                            const count =
                              doctorCounts.patientsTreated ??
                              doctorCounts.patientsTreatedCount;
                            if (
                              !doc.showPatientsTreated ||
                              typeof count !== "number" ||
                              count <= 0
                            ) {
                              return null;
                            }
                            return (
                              <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/75 backdrop-blur-md text-white px-2.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 shadow-sm z-10">
                                <Users className="h-3 w-3 text-primary" />
                                <span>
                                  {count.toLocaleString()}+ {copy.patientsTreatedSuffix}
                                </span>
                              </span>
                            );
                          })()}
                        </div>

                        {/* Full Doctor Name without Truncation */}
                        <div className="space-y-1">
                          <h3 className="w-full text-[18px] sm:text-[19px] font-serif font-bold tracking-tight text-slate-900 dark:text-white leading-snug break-words">
                            {doc.displayName}
                          </h3>

                          {doc.professionalTitle && (
                            <p className="text-xs font-medium text-primary mt-0.5 truncate">
                              {doc.professionalTitle}
                            </p>
                          )}

                          {doc.biography && (
                            <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300/85 line-clamp-2 mt-2">
                              {doc.biography}
                            </p>
                          )}

                          {doc.locationName && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2.5">
                              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="truncate">{doc.locationName}</span>
                            </div>
                          )}

                          {/* Specialties Tags */}
                          {doc.specialties && doc.specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {doc.specialties.slice(0, 3).map((spec, i) => (
                                <span
                                  key={i}
                                  className="rounded-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 px-2.5 py-1 text-[10px] font-medium text-slate-700 dark:text-slate-300"
                                >
                                  {spec}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Book Consultation Button */}
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                        <Button
                          href={`/book?doctor=${encodeURIComponent(doc.id)}`}
                          variant="primary"
                          size="sm"
                          tabIndex={isFront ? 0 : -1}
                          className={`w-full justify-center text-xs font-semibold rounded-xl py-2.5 transition-all shadow-md shadow-primary/25 ${
                            isFront
                              ? "bg-primary text-primary-foreground shadow-sm hover:opacity-95"
                              : "bg-primary/90 text-primary-foreground hover:bg-primary shadow-xs pointer-events-none"
                          }`}
                        >
                          <Calendar className="h-3.5 w-3.5 mr-1.5" />
                          <span>{copy.bookConsultation}</span>
                        </Button>
                      </div>
                    </div>
                  );
                }}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}

export default OurTeam;
