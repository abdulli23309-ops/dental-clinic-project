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
import { resolveMediaUrl } from "@/lib/api";

// Helper for per-doctor portrait focal point framing
function getDoctorFocalClass(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("maral")) {
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
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const dragStartX = useRef<number>(0);
  const dragStartAngle = useRef<number>(0);
  const hasDragged = useRef<boolean>(false);
  const ringRef = useRef<HTMLDivElement>(null);
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
  // Arc mode for n < 8 so cards never turn 90deg edge-on
  const isArcMode = n < 8;
  const cardWidth = 320;
  const cardGap = 36;

  // Geometry calculations:
  // For n >= 8: 360deg cylinder ring
  // For n < 8: 28deg open stage arc
  const stepAngle = isArcMode ? 28 : n > 0 ? 360 / n : 0;
  const radius = isArcMode
    ? 580
    : n > 0
    ? Math.max(420, Math.round((cardWidth + cardGap) / (2 * Math.tan(Math.PI / n))))
    : 450;

  // Reset active card and camera angle when city filter changes
  useEffect(() => {
    setActiveIndex(0);
    if (isArcMode && n > 0) {
      const centerOffset = (n - 1) / 2;
      setRotationAngle(-(0 - centerOffset) * stepAngle * (isRtl ? -1 : 1));
    } else {
      setRotationAngle(0);
    }
  }, [selectedCity, isArcMode, n, stepAngle, isRtl]);

  // Rotate ring to target doctor
  const rotateToDoctor = useCallback(
    (targetIndex: number) => {
      if (n === 0) return;
      const safeIndex = isArcMode
        ? Math.max(0, Math.min(n - 1, targetIndex))
        : ((targetIndex % n) + n) % n;
      setActiveIndex(safeIndex);

      if (isArcMode) {
        const centerOffset = (n - 1) / 2;
        const targetDeg = -(safeIndex - centerOffset) * stepAngle * (isRtl ? -1 : 1);
        setRotationAngle(targetDeg);
      } else {
        const baseAngle = -safeIndex * stepAngle * (isRtl ? -1 : 1);
        setRotationAngle((curr) => {
          const diff = ((((baseAngle - curr) % 360) + 540) % 360) - 180;
          return curr + diff;
        });
      }
    },
    [n, isArcMode, stepAngle, isRtl]
  );

  const handleNext = useCallback(() => {
    if (n <= 1) return;
    if (isArcMode) {
      rotateToDoctor(activeIndex >= n - 1 ? 0 : activeIndex + 1);
    } else {
      rotateToDoctor(activeIndex + 1);
    }
  }, [activeIndex, n, isArcMode, rotateToDoctor]);

  const handlePrev = useCallback(() => {
    if (n <= 1) return;
    if (isArcMode) {
      rotateToDoctor(activeIndex <= 0 ? n - 1 : activeIndex - 1);
    } else {
      rotateToDoctor(activeIndex - 1);
    }
  }, [activeIndex, n, isArcMode, rotateToDoctor]);

  // Pointer drag & touch-swipe handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || n <= 1) return;
    setIsDragging(true);
    hasDragged.current = false;
    dragStartX.current = e.clientX;
    dragStartAngle.current = rotationAngle;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX.current;
    if (Math.abs(deltaX) > 4) {
      hasDragged.current = true;
    }
    const angleDelta = deltaX * 0.28 * (isRtl ? -1 : 1);
    setRotationAngle(dragStartAngle.current + angleDelta);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (!hasDragged.current) return;

    // Snap to nearest card
    const effectiveAngle = isRtl ? -rotationAngle : rotationAngle;
    if (isArcMode) {
      const centerOffset = (n - 1) / 2;
      const rawIndex = Math.round(-effectiveAngle / stepAngle + centerOffset);
      const clampedIndex = Math.max(0, Math.min(n - 1, rawIndex));
      rotateToDoctor(clampedIndex);
    } else {
      const rawIndex = Math.round(-effectiveAngle / stepAngle);
      rotateToDoctor(rawIndex);
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

  const handleImageError = (id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
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
          /* UNIFIED 3D COVERFLOW PERSPECTIVE STAGE (Desktop & Mobile)      */
          /* ============================================================== */
          <div className="relative w-full overflow-visible py-4 md:py-8">
            {/* Navigation Arrows */}
            {n > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label={copy.previousClinicians}
                  className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-30 h-10 w-10 sm:h-12 sm:w-12 rounded-full border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 text-gray-800 dark:text-gray-100 shadow-xl backdrop-blur-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label={copy.nextClinicians}
                  className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-30 h-10 w-10 sm:h-12 sm:w-12 rounded-full border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 text-gray-800 dark:text-gray-100 shadow-xl backdrop-blur-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 rtl:rotate-180" />
                </button>
              </>
            )}

            {/* 3D Perspective Coverflow Stage Container with touch-swipe & spring physics */}
            <div
              className="relative w-full h-[540px] sm:h-[580px] md:h-[620px] flex items-center justify-center cursor-grab active:cursor-grabbing touch-pan-y overflow-visible"
              style={{ perspective: "1400px" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div
                className="relative w-[280px] sm:w-[320px] h-[500px] sm:h-[540px] flex items-center justify-center"
                style={{ transformStyle: "preserve-3d" }}
              >
                {filteredDoctors.map((doc, idx) => {
                  const offset = isArcMode
                    ? idx - activeIndex
                    : ((((idx - activeIndex) % n) + n + Math.floor(n / 2)) % n) - Math.floor(n / 2);

                  const isCenter = offset === 0;
                  const distance = Math.abs(offset);
                  const isVisible = distance <= 2;

                  // 3D Coverflow transforms with inward tilt
                  const rotateY = isCenter ? 0 : offset < 0 ? 22 : -22;
                  const translateZ = isCenter ? 0 : -60 * distance;
                  const scale = isCenter ? 1.04 : Math.max(0.86, 0.94 - 0.04 * (distance - 1));
                  const translateX = offset * (isRtl ? -250 : 250);
                  const opacity = isCenter ? 1 : Math.max(0.3, 0.78 - 0.25 * (distance - 1));
                  const zIndex = isCenter ? 30 : 20 - distance * 5;

                  const docInitials =
                    doc.displayName
                      .split(" ")
                      .filter((w) => !w.toLowerCase().includes("dr"))
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("") || "HS";

                  return (
                    <motion.div
                      key={doc.id}
                      animate={{
                        x: translateX,
                        rotateY: shouldReduceMotion ? 0 : rotateY,
                        z: shouldReduceMotion ? 0 : translateZ,
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
                        className={`w-full h-full rounded-3xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border p-4 sm:p-5 shadow-xl flex flex-col justify-between transition-all ${
                          isCenter
                            ? "border-emerald-600 dark:border-emerald-400 ring-2 ring-emerald-500/30 shadow-2xl"
                            : "border-gray-200/90 dark:border-gray-800/90 hover:border-emerald-500/40"
                        }`}
                      >
                        <div>
                          {/* Portrait Photo Container with luxury initials fallback */}
                          <div className="w-full h-[220px] sm:h-[255px] rounded-2xl overflow-hidden bg-stone-100 dark:bg-gray-800 mb-3 relative shadow-inner">
                            {doc.photoUrl && !imageErrors[doc.id] ? (
                              <SafeImage
                                src={doc.photoUrl}
                                alt={doc.displayName}
                                fallbackInitials={docInitials}
                                fallbackSubtitle={doc.role || "Specialist"}
                                fill
                                sizes="(max-width: 640px) 280px, 320px"
                                className={`w-full h-full object-cover pointer-events-none transition-transform duration-300 ${getDoctorFocalClass(
                                  doc.displayName
                                )}`}
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#E8F3EE] via-[#D6EBE2] to-[#FAF9F5] dark:from-[#0E241C] dark:via-[#0B1E17] dark:to-[#070D0B] text-emerald-950 dark:text-emerald-100 select-none p-4 text-center">
                                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/80 dark:bg-emerald-950/60 border border-emerald-700/20 shadow-sm backdrop-blur-sm mb-2">
                                  <span className="font-serif text-2xl font-bold tracking-wider text-emerald-900 dark:text-emerald-200">
                                    {docInitials}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-800 dark:text-emerald-300 font-semibold mt-1">
                                  {doc.role || "Clinical Specialist"}
                                </span>
                              </div>
                            )}

                            {/* Director / Role Badge */}
                            {doc.role === "Director" && (
                              <span className="absolute top-2.5 left-2.5 rounded-full btn-premium-emerald text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
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
                                <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/75 backdrop-blur-md text-white px-2.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 shadow-sm">
                                  <Users className="h-3 w-3 text-emerald-400" />
                                  <span>
                                    {count.toLocaleString()}+ {copy.patientsTreatedSuffix}
                                  </span>
                                </span>
                              );
                            })()}
                          </div>

                          {/* Name, Credentials, Title */}
                          <div className="space-y-1">
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

                            {doc.professionalTitle && (
                              <p className="text-[10.5px] sm:text-[11px] font-medium text-gray-600 dark:text-gray-300 truncate">
                                {doc.professionalTitle}
                              </p>
                            )}

                            {doc.biography && (
                              <p className="text-[10.5px] sm:text-[11px] leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2 pt-0.5">
                                {doc.biography}
                              </p>
                            )}

                            {doc.locationName && (
                              <div className="flex items-center gap-1 text-[10.5px] sm:text-[11px] text-gray-500 dark:text-gray-400 pt-0.5">
                                <MapPin className="h-3 w-3 text-primary shrink-0" />
                                <span className="truncate">{doc.locationName}</span>
                              </div>
                            )}

                            {/* Specialties Tags */}
                            {doc.specialties && doc.specialties.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {doc.specialties.slice(0, 3).map((spec, i) => (
                                  <span
                                    key={i}
                                    className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] sm:text-[9.5px] text-gray-600 dark:text-gray-300"
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
                            className="w-full justify-center text-xs font-semibold rounded-full py-2"
                          >
                            <Calendar className="h-3.5 w-3.5 mr-1.5" />
                            <span>{copy.bookConsultation}</span>
                          </Button>
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
                        ? "w-6 sm:w-7 bg-emerald-700 dark:bg-emerald-500"
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
