"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
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
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [windowWidth, setWindowWidth] = useState<number>(1200);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const dragStartX = useRef<number>(0);
  const hasDragged = useRef<boolean>(false);
  const shouldReduceMotion = useReducedMotion();

  const isRtl = locale === "ur";

  // Window resize listener for responsive 3D geometry
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
  // Always clamp safeIndex synchronously to prevent any out-of-bounds frame when switching city tabs
  const safeIndex = n > 0 ? ((activeIndex % n) + n) % n : 0;

  // Reset active index when switching city tab
  useEffect(() => {
    setActiveIndex(0);
  }, [selectedCity]);

  // Compute circular offset for each doctor in the filtered list
  const getCardOffset = (idx: number): number => {
    if (n <= 1) return 0;
    if (n === 2) return idx === safeIndex ? 0 : 1;
    if (n === 3) {
      let diff = idx - safeIndex;
      if (diff === 2) diff = -1;
      if (diff === -2) diff = 1;
      return diff;
    }
    if (n === 4) {
      let diff = idx - safeIndex;
      if (diff > 2) diff -= 4;
      if (diff < -1) diff += 4;
      return diff;
    }
    // n >= 5
    let diff = idx - safeIndex;
    while (diff > n / 2) diff -= n;
    while (diff < -n / 2) diff += n;
    return diff;
  };

  const handleNext = useCallback(() => {
    if (n <= 1) return;
    setActiveIndex((prev) => (prev + 1) % n);
  }, [n]);

  const handlePrev = useCallback(() => {
    if (n <= 1) return;
    setActiveIndex((prev) => (prev - 1 + n) % n);
  }, [n]);

  // Pointer drag & touch-swipe handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || n <= 1) return;
    setIsDragging(true);
    hasDragged.current = false;
    dragStartX.current = e.clientX;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
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
    const threshold = 35;

    if (Math.abs(deltaX) > threshold) {
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

  const handleImageError = useCallback((id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  }, []);

  // Responsive slot positioning calculation
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const getSlotStyle = (offset: number) => {
    const rtlSign = isRtl ? -1 : 1;

    // Mobile Bespoke Tucked Glass Stack (< 768px)
    if (isMobile) {
      if (offset === 0) {
        return {
          transform: `translate3d(0px, 0px, 40px) scale(1)`,
          zIndex: 30,
          opacity: 1,
          pointerEvents: "auto" as const,
          visibility: "visible" as const,
        };
      }
      if (offset === -1) {
        return {
          transform: `translate3d(${-42 * rtlSign}px, 14px, -60px) rotateY(${12 * rtlSign}deg) scale(0.91)`,
          zIndex: 20,
          opacity: 0.45,
          pointerEvents: "auto" as const,
          visibility: "visible" as const,
        };
      }
      if (offset === 1) {
        return {
          transform: `translate3d(${42 * rtlSign}px, 14px, -60px) rotateY(${-12 * rtlSign}deg) scale(0.91)`,
          zIndex: 20,
          opacity: 0.45,
          pointerEvents: "auto" as const,
          visibility: "visible" as const,
        };
      }
      return {
        transform: `translate3d(0px, 0px, -150px) scale(0.8)`,
        zIndex: 0,
        opacity: 0,
        pointerEvents: "none" as const,
        visibility: "hidden" as const,
      };
    }

    // Desktop & Laptop 5-Card Cylinder Arc (100% Preserved)
    const xStep1 = isTablet ? 220 : 310;
    const xStep2 = isTablet ? 400 : 560;
    const z1 = -60;
    const z2 = -170;
    const rot1 = 22;
    const rot2 = 34;
    const s1 = 0.90;
    const s2 = 0.80;

    if (offset === 0) {
      return {
        transform: `translate3d(0px, 0px, 60px) rotateY(0deg) scale(1)`,
        zIndex: 30,
        opacity: 1,
        pointerEvents: "auto" as const,
        visibility: "visible" as const,
      };
    }
    if (offset === -1) {
      return {
        transform: `translate3d(${-xStep1 * rtlSign}px, 0px, ${z1}px) rotateY(${rot1 * rtlSign}deg) scale(${s1})`,
        zIndex: 20,
        opacity: 0.92,
        pointerEvents: "auto" as const,
        visibility: "visible" as const,
      };
    }
    if (offset === 1) {
      return {
        transform: `translate3d(${xStep1 * rtlSign}px, 0px, ${z1}px) rotateY(${-rot1 * rtlSign}deg) scale(${s1})`,
        zIndex: 20,
        opacity: 0.92,
        pointerEvents: "auto" as const,
        visibility: "visible" as const,
      };
    }
    if (offset === -2) {
      return {
        transform: `translate3d(${-xStep2 * rtlSign}px, 0px, ${z2}px) rotateY(${rot2 * rtlSign}deg) scale(${s2})`,
        zIndex: 10,
        opacity: 0.70,
        pointerEvents: "auto" as const,
        visibility: "visible" as const,
      };
    }
    if (offset === 2) {
      return {
        transform: `translate3d(${xStep2 * rtlSign}px, 0px, ${z2}px) rotateY(${-rot2 * rtlSign}deg) scale(${s2})`,
        zIndex: 10,
        opacity: 0.70,
        pointerEvents: "auto" as const,
        visibility: "visible" as const,
      };
    }
    return {
      transform: `translate3d(0px, 0px, -300px) scale(0.5)`,
      zIndex: 0,
      opacity: 0,
      pointerEvents: "none" as const,
      visibility: "hidden" as const,
    };
  };

  // If no doctors exist, return null
  if (!isLoading && activeTeam.length === 0) {
    return null;
  }

  return (
    <section
      id="team"
      className="border-t border-gray-200 dark:border-gray-800 bg-[#FAF9F6] dark:bg-gray-950 py-24 md:py-32 overflow-hidden select-none relative"
      onKeyDown={handleKeyDown}
      tabIndex={0}
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
              onClick={() => setSelectedCity("all")}
              className={`rounded-full px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCity === "all"
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "bg-white/80 dark:bg-gray-900/80 backdrop-blur-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/80 dark:border-gray-800/80"
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
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "bg-white/80 dark:bg-gray-900/80 backdrop-blur-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/80 dark:border-gray-800/80"
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
          /* NON-OVERLAPPING 3D CYLINDRICAL GLASS CAROUSEL STAGE            */
          /* ============================================================== */
          <div className="relative w-full overflow-visible py-4 md:py-6">
            {/* Ambient Radial Round Glass Aura behind carousel */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              aria-hidden="true"
            >
              <div className="w-[450px] h-[450px] sm:w-[650px] sm:h-[650px] rounded-full bg-primary/10 blur-3xl" />
            </div>

            {/* Curved Glass Base Ring Pedestal */}
            <div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[340px] sm:w-[500px] h-12 rounded-[100%] bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-md pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[300px] sm:w-[440px] h-6 rounded-[100%] border border-primary/20 bg-primary/5 backdrop-blur-sm pointer-events-none"
              aria-hidden="true"
            />

            {/* Floating Round Glass Navigation Controls (Desktop/Tablet Only) */}
            {n > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label={copy.previousClinicians}
                  className="hidden md:flex absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 z-40 h-11 w-11 sm:h-12 sm:w-12 rounded-full border border-white/60 dark:border-white/15 bg-white/90 dark:bg-slate-900/90 text-gray-800 dark:text-gray-100 shadow-xl backdrop-blur-xl items-center justify-center hover:scale-105 active:scale-95 hover:border-primary/40 hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label={copy.nextClinicians}
                  className="hidden md:flex absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 z-40 h-11 w-11 sm:h-12 sm:w-12 rounded-full border border-white/60 dark:border-white/15 bg-white/90 dark:bg-slate-900/90 text-gray-800 dark:text-gray-100 shadow-xl backdrop-blur-xl items-center justify-center hover:scale-105 active:scale-95 hover:border-primary/40 hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer"
                >
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 rtl:rotate-180" />
                </button>
              </>
            )}

            {/* 3D Perspective Stage Container with touch-swipe */}
            <div
              className="relative w-full h-[540px] sm:h-[570px] md:h-[590px] flex items-center justify-center cursor-grab active:cursor-grabbing touch-pan-y"
              style={{ perspective: "1600px", perspectiveOrigin: "50% 50%" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {/* Relative Slot-Based Cards (Zero Ring Overlap!) */}
              <div
                className="relative w-full h-full flex items-center justify-center"
                style={{ transformStyle: "preserve-3d" }}
              >
                {filteredDoctors.map((doc, idx) => {
                  const offset = getCardOffset(idx);
                  const isFront = offset === 0;
                  const isVisible = Math.abs(offset) <= 2;
                  const hasImage = Boolean(doc.photoUrl && !imageErrors[doc.id]);
                  const slotStyle = getSlotStyle(offset);

                  return (
                    <div
                      key={doc.id}
                      className="absolute will-change-transform"
                      style={{
                        ...slotStyle,
                        transition: isDragging
                          ? "none"
                          : "transform 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms ease",
                      }}
                      onClick={(e) => {
                        if (!isFront && isVisible && !hasDragged.current) {
                          e.stopPropagation();
                          setActiveIndex(idx);
                        }
                      }}
                    >
                      {/* Frosted Glass Card Shell with Specular Top Highlight */}
                      <div
                        className={`relative w-[280px] sm:w-[310px] md:w-[320px] h-[495px] sm:h-[525px] rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border p-3.5 sm:p-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)] flex flex-col justify-between transition-all duration-300 ${
                          isFront
                            ? "ring-2 ring-primary border-primary shadow-[0_25px_60px_-15px_hsl(var(--primary)/0.25)] scale-[1.01]"
                            : "border-slate-200/80 dark:border-white/10 hover:border-primary/40"
                        }`}
                      >
                        {/* Specular top-edge glass highlight */}
                        <div
                          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/30 to-transparent pointer-events-none z-20"
                          aria-hidden="true"
                        />

                        <div>
                          {/* Portrait Photo Container with branded fallback avatar */}
                          <div className="w-full h-[215px] sm:h-[245px] rounded-2xl overflow-hidden bg-stone-100 dark:bg-gray-800 mb-2.5 relative shadow-inner">
                            {hasImage ? (
                              <Image
                                src={resolveMediaUrl(doc.photoUrl) || doc.photoUrl!}
                                alt={doc.displayName}
                                width={320}
                                height={320}
                                priority={isFront}
                                sizes="(max-width: 640px) 280px, 320px"
                                className={`w-full h-full object-cover pointer-events-none transition-transform duration-300 ${getDoctorFocalClass(
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
                                <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/75 backdrop-blur-md text-white px-2.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 shadow-sm z-10">
                                  <Users className="h-3 w-3 text-primary" />
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
                                <span className="text-[9.5px] sm:text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                                  {doc.credentials}
                                </span>
                              )}
                            </div>

                            {doc.professionalTitle && (
                              <p className="text-[10.5px] sm:text-[11px] font-medium text-primary truncate">
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
                                    className="rounded-full bg-white/70 dark:bg-gray-800/70 border border-gray-200/60 dark:border-gray-700/60 px-2 py-0.5 text-[9px] sm:text-[9.5px] text-gray-600 dark:text-gray-300"
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
                            className={`w-full justify-center text-xs font-semibold rounded-full py-2.5 transition-all shadow-md ${
                              isFront
                                ? "bg-primary text-primary-foreground shadow-sm hover:opacity-95"
                                : "bg-primary/90 text-primary-foreground hover:bg-primary shadow-xs"
                            }`}
                          >
                            <Calendar className="h-3.5 w-3.5 mr-1.5" />
                            <span>{copy.bookConsultation}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Bottom Dock Navigation (Mobile Only) */}
            {n > 1 && (
              <div className="flex md:hidden items-center justify-center gap-4 pt-4 pb-2 z-40">
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label={copy.previousClinicians}
                  className="grid h-10 w-10 place-items-center rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
                </button>

                <div className="rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-mono font-bold text-primary">
                  {String(safeIndex + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  aria-label={copy.nextClinicians}
                  className="grid h-10 w-10 place-items-center rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <ChevronRight className="h-5 w-5 rtl:rotate-180" />
                </button>
              </div>
            )}

            {/* Pagination Indicators (Desktop/Tablet Only) */}
            {n > 1 && (
              <div className="hidden md:flex items-center justify-center gap-1.5 pt-4 md:pt-6">
                {filteredDoctors.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveIndex(i)}
                    aria-label={`Go to clinician ${i + 1}`}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      i === safeIndex
                        ? "w-6 sm:w-7 bg-primary"
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
