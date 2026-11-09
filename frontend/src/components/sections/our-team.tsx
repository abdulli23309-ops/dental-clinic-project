"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
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
import { SafeImage } from "@/components/ui/safe-image";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { resolveDoctorPhoto } from "@/lib/clinical-media-fallback";

// Helper for per-doctor portrait focal point framing
function getDoctorFocalClass(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("maral") || lower.includes("meral")) {
    return "object-[50%_45%] scale-105";
  }
  if (lower.includes("bilal")) {
    return "object-[50%_25%]";
  }
  if (lower.includes("sarah") || lower.includes("faraz")) {
    return "object-[50%_20%]";
  }
  return "object-[50%_20%]";
}

export function OurTeam() {
  const { team, locations, isLoading, copy, locale } = usePublicContent();
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const dragStartX = useRef<number>(0);
  const hasDragged = useRef<boolean>(false);
  const shouldReduceMotion = useReducedMotion();

  const isRtl = locale === "ur";

  // Filter only active team members
  const activeTeam = team.filter((m) => m.isActive !== false);

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

  const filteredDoctors =
    selectedCity === "all"
      ? doctorsWithLocations
      : doctorsWithLocations.filter(
          (d) => d.city.toLowerCase() === selectedCity.toLowerCase()
        );

  const n = filteredDoctors.length;

  // Reset active card when city filter changes
  useEffect(() => {
    setActiveIndex(0);
  }, [selectedCity]);

  // Navigate to specific doctor
  const rotateToDoctor = useCallback(
    (targetIndex: number) => {
      if (n === 0) return;
      const safeIndex = ((targetIndex % n) + n) % n;
      setActiveIndex(safeIndex);
    },
    [n]
  );

  const handleNext = useCallback(() => {
    if (n <= 1) return;
    rotateToDoctor(activeIndex + 1);
  }, [activeIndex, n, rotateToDoctor]);

  const handlePrev = useCallback(() => {
    if (n <= 1) return;
    rotateToDoctor(activeIndex - 1);
  }, [activeIndex, n, rotateToDoctor]);

  // Pointer drag & touch-swipe handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || n <= 1) return;
    setIsDragging(true);
    hasDragged.current = false;
    dragStartX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX.current;
    if (Math.abs(deltaX) > 10) {
      hasDragged.current = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (!hasDragged.current) return;
    const deltaX = e.clientX - dragStartX.current;
    if (Math.abs(deltaX) > 40) {
      if (deltaX > 0) {
        isRtl ? handleNext() : handlePrev();
      } else {
        isRtl ? handlePrev() : handleNext();
      }
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      isRtl ? handleNext() : handlePrev();
    } else if (e.key === "ArrowRight") {
      isRtl ? handlePrev() : handleNext();
    }
  };

  // If no doctors exist, return null
  if (!isLoading && activeTeam.length === 0) {
    return null;
  }

  return (
    <section
      id="team"
      className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-28 md:py-36 overflow-hidden select-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Our Clinical Specialists"
    >
      <div className="container-x space-y-12 md:space-y-16">
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
              onClick={() => setSelectedCity("all")}
              className={`rounded-full px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCity === "all"
                  ? "btn-premium-emerald text-white font-semibold"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
              }`}
            >
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
                  onClick={() => setSelectedCity(city)}
                  className={`rounded-full px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? "btn-premium-emerald text-white font-semibold"
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
        ) : filteredDoctors.length === 0 ? (
          /* Empty State */
          <div className="rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-12 text-center text-gray-500 dark:text-gray-400 text-sm">
            <User className="h-10 w-10 mx-auto text-gray-400 mb-3" />
            <p>{copy.noDoctorsForCity}</p>
          </div>
        ) : (
          /* ============================================================== */
          /* 5-CARD VISIBLE 3D COVERFLOW PERSPECTIVE STAGE                  */
          /* ============================================================== */
          <div className="relative w-full overflow-visible py-4 md:py-8">
            {/* Navigation Floating Arrow Buttons */}
            {n > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label={copy.previousClinicians}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 h-11 w-11 sm:h-12 sm:w-12 rounded-full border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 text-gray-800 dark:text-gray-100 shadow-xl backdrop-blur-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label={copy.nextClinicians}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 h-11 w-11 sm:h-12 sm:w-12 rounded-full border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 text-gray-800 dark:text-gray-100 shadow-xl backdrop-blur-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 rtl:rotate-180" />
                </button>
              </>
            )}

            {/* 3D Perspective Stage Container */}
            <div
              className="relative w-full h-[560px] sm:h-[600px] flex items-center justify-center cursor-grab active:cursor-grabbing touch-pan-y overflow-visible"
              style={{ perspective: "1200px" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div
                className="relative w-[280px] sm:w-[320px] h-[520px] sm:h-[560px] flex items-center justify-center"
                style={{ transformStyle: "preserve-3d" }}
              >
                {filteredDoctors.map((doc, idx) => {
                  // Calculate relative offset with circular wrap-around
                  let offset = idx - activeIndex;
                  if (offset > n / 2) offset -= n;
                  if (offset < -n / 2) offset += n;

                  const isCenter = offset === 0;
                  const distance = Math.abs(offset);
                  const isVisible = distance <= 2;

                  // PR #13 / PR #14 Exact 5-Card Geometry Specification:
                  // Center Card (offset === 0): translateX(0%) translateZ(0px) rotateY(0deg) scale(1)
                  // Immediate Neighbors (offset ±1): translateX(±55%) translateZ(-120px) rotateY(∓28deg) scale(0.88)
                  // Outer Neighbors (offset ±2): translateX(±95%) translateZ(-240px) rotateY(∓38deg) scale(0.76)
                  let translateX = 0;
                  let translateZ = 0;
                  let rotateY = 0;
                  let scale = 1;
                  let opacity = 0;
                  let zIndex = 0;

                  if (isCenter) {
                    translateX = 0;
                    translateZ = 0;
                    rotateY = 0;
                    scale = 1;
                    opacity = 1;
                    zIndex = 30;
                  } else if (offset === -1) {
                    translateX = isRtl ? 55 : -55;
                    translateZ = -120;
                    rotateY = isRtl ? -28 : 28;
                    scale = 0.88;
                    opacity = 0.85;
                    zIndex = 20;
                  } else if (offset === 1) {
                    translateX = isRtl ? -55 : 55;
                    translateZ = -120;
                    rotateY = isRtl ? 28 : -28;
                    scale = 0.88;
                    opacity = 0.85;
                    zIndex = 20;
                  } else if (offset === -2) {
                    translateX = isRtl ? 95 : -95;
                    translateZ = -240;
                    rotateY = isRtl ? -38 : 38;
                    scale = 0.76;
                    opacity = 0.55;
                    zIndex = 10;
                  } else if (offset === 2) {
                    translateX = isRtl ? -95 : 95;
                    translateZ = -240;
                    rotateY = isRtl ? 38 : -38;
                    scale = 0.76;
                    opacity = 0.55;
                    zIndex = 10;
                  }

                  const doctorPhoto = resolveDoctorPhoto(doc);

                  return (
                    <motion.div
                      key={doc.id}
                      initial={false}
                      animate={{
                        x: `${translateX}%`,
                        z: shouldReduceMotion ? 0 : translateZ,
                        rotateY: shouldReduceMotion ? 0 : rotateY,
                        scale: shouldReduceMotion ? 1 : scale,
                        opacity: isVisible ? opacity : 0,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 280,
                        damping: 28,
                        mass: 0.8,
                      }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        zIndex,
                        transformStyle: "preserve-3d",
                        pointerEvents: isVisible ? "auto" : "none",
                      }}
                      onClick={() => {
                        if (!isCenter && !hasDragged.current) {
                          rotateToDoctor(idx);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <div
                        className={`w-full h-full rounded-3xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border shadow-xl flex flex-col justify-between overflow-hidden transition-all ${
                          isCenter
                            ? "border-2 border-emerald-500 ring-2 ring-emerald-500/20 shadow-2xl scale-100"
                            : "border-gray-200/90 dark:border-gray-800/90 hover:border-emerald-500/40"
                        }`}
                      >
                        {/* Top 52% Height: Full-Bleed High-Resolution Clinician Portrait */}
                        <div className="relative w-full h-[52%] min-h-[260px] sm:min-h-[285px] bg-stone-100 dark:bg-gray-800 overflow-hidden">
                          <Image
                            src={doctorPhoto}
                            alt={doc.displayName}
                            fill
                            sizes="(max-width: 640px) 280px, 320px"
                            priority={isCenter}
                            className={`w-full h-full object-cover object-top pointer-events-none transition-transform duration-500 ${getDoctorFocalClass(
                              doc.displayName
                            )}`}
                          />

                          {/* Director / Role Badge */}
                          {doc.role === "Director" && (
                            <span className="absolute top-3 left-3 rounded-full btn-premium-emerald text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm z-10">
                              <Award className="h-3 w-3" />
                              <span>{copy.director}</span>
                            </span>
                          )}

                          {/* Patients Treated Badge */}
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
                              <span className="absolute bottom-3 left-3 rounded-full bg-black/75 backdrop-blur-md text-white px-2.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 shadow-sm z-10">
                                <Users className="h-3 w-3 text-emerald-400" />
                                <span>
                                  {count.toLocaleString()}+ {copy.patientsTreatedSuffix}
                                </span>
                              </span>
                            );
                          })()}
                        </div>

                        {/* Bottom 48% Height: Clinical Information & Booking CTA */}
                        <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 space-y-3">
                          <div className="space-y-1.5">
                            {/* Doctor Name + Credential */}
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-display text-sm sm:text-base font-bold text-gray-950 dark:text-white leading-tight truncate">
                                {doc.displayName}
                              </h3>
                              {doc.credentials && (
                                <span className="text-[9.5px] sm:text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                                  {doc.credentials}
                                </span>
                              )}
                            </div>

                            {/* Green Role Subtitle & Professional Title */}
                            <p className="text-[11px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-400 truncate">
                              {doc.professionalTitle || doc.role || "Clinical Specialist"}
                            </p>

                            {/* 2-Line Biography */}
                            {doc.biography && (
                              <p className="text-[10.5px] sm:text-[11px] leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2">
                                {doc.biography}
                              </p>
                            )}

                            {/* Clinic Branch Location */}
                            {doc.locationName && (
                              <div className="flex items-center gap-1 text-[10.5px] sm:text-[11px] text-gray-500 dark:text-gray-400 pt-0.5">
                                <MapPin className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="truncate">{doc.locationName}</span>
                              </div>
                            )}

                            {/* Specialties Pills */}
                            {doc.specialties && doc.specialties.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {doc.specialties.slice(0, 3).map((spec, i) => (
                                  <span
                                    key={i}
                                    className="rounded-full bg-stone-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] sm:text-[9.5px] text-gray-600 dark:text-gray-300"
                                  >
                                    {spec}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Full-Width Book Consultation CTA Button */}
                          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-auto">
                            <Button
                              href={`/book?doctor=${encodeURIComponent(doc.id)}`}
                              variant="primary"
                              size="sm"
                              className={`w-full justify-center text-xs font-semibold rounded-full py-2.5 transition-all shadow-md ${
                                isCenter
                                  ? "btn-premium-emerald text-white"
                                  : "bg-emerald-900/90 text-white hover:bg-emerald-800"
                              }`}
                            >
                              <Calendar className="h-3.5 w-3.5 mr-1.5" />
                              <span>{copy.bookConsultation}</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Pagination Indicators */}
            {n > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-4 md:pt-6">
                {filteredDoctors.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => rotateToDoctor(i)}
                    aria-label={`Go to clinician ${i + 1}`}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      i === activeIndex
                        ? "w-7 bg-emerald-600 dark:bg-emerald-400"
                        : "w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default OurTeam;
