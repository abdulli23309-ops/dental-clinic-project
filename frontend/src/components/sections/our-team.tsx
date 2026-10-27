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
import { usePublicContent } from "@/components/providers/public-content-provider";
import { resolveMediaUrl } from "@/lib/api";

export function OurTeam() {
  const { team, locations, isLoading, copy, locale } = usePublicContent();
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartX = useRef<number>(0);
  const dragStartAngle = useRef<number>(0);
  const hasDragged = useRef<boolean>(false);
  const ringRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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
  const isArcMode = n <= 3;
  const cardWidth = 320;
  const cardGap = 36;

  // Geometry calculations: exact rules
  // For n >= 4: stepAngle = 360 / n, r = max(420, round((320 + 36) / (2 * tan(PI / n))))
  // For n <= 3 (Karachi = 2): stepAngle = 32deg, r = 520px
  const stepAngle = isArcMode ? 32 : n > 0 ? 360 / n : 0;
  const radius = isArcMode
    ? 520
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

  // Rotate ring to target doctor with shortest-arc rotation
  const rotateToDoctor = useCallback(
    (targetIndex: number) => {
      if (n === 0) return;
      const safeIndex = ((targetIndex % n) + n) % n;
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
    rotateToDoctor(activeIndex + 1);
  }, [activeIndex, n, rotateToDoctor]);

  const handlePrev = useCallback(() => {
    if (n <= 1) return;
    rotateToDoctor(activeIndex - 1);
  }, [activeIndex, n, rotateToDoctor]);

  // Pointer drag handlers
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

  const scrollMobile = (offset: number) => {
    scrollRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  };

  // If no doctors exist, return null
  if (!isLoading && activeTeam.length === 0) {
    return null;
  }

  return (
    <section
      id="team"
      className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-20 md:py-28 overflow-hidden select-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Our Clinical Specialists"
    >
      <div className="container-x space-y-12">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
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
              className={`rounded-full px-5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
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
                  className={`rounded-full px-5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
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
          <>
            {/* ============================================================== */}
            {/* DESKTOP: Pure-CSS 3D Cylindrical Ring / Stage Arc (lg+)       */}
            {/* ============================================================== */}
            <div className="hidden lg:block relative w-full overflow-visible py-8">
              {/* Navigation Arrows */}
              {n > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label={copy.previousClinicians}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-30 h-12 w-12 rounded-full border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 text-gray-800 dark:text-gray-100 shadow-xl backdrop-blur-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="h-6 w-6 rtl:rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label={copy.nextClinicians}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-30 h-12 w-12 rounded-full border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 text-gray-800 dark:text-gray-100 shadow-xl backdrop-blur-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <ChevronRight className="h-6 w-6 rtl:rotate-180" />
                  </button>
                </>
              )}

              {/* 3D Perspective Stage Container */}
              <div
                className="team-perspective-container relative w-full h-[580px] flex items-center justify-center cursor-grab active:cursor-grabbing"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {/* 3D Ring */}
                <div
                  ref={ringRef}
                  className="team-3d-ring"
                  style={{
                    ["--r" as any]: `${radius}px`,
                    ["--ring-rotation" as any]: `${rotationAngle}deg`,
                    transform: `translateZ(calc(${radius}px * -1)) rotateX(-3deg) rotateY(${rotationAngle}deg)`,
                    transition: isDragging ? "none" : "transform 750ms cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  {filteredDoctors.map((doc, idx) => {
                    const isActive = idx === activeIndex;

                    // Angle for card i
                    const cardAngle = isArcMode
                      ? (idx - (n - 1) / 2) * stepAngle * (isRtl ? -1 : 1)
                      : idx * stepAngle * (isRtl ? -1 : 1);

                    // Shortest circular index distance between each card i and activeIndex
                    const distance = isArcMode
                      ? Math.abs(idx - activeIndex)
                      : Math.min(
                          Math.abs(idx - activeIndex),
                          n - Math.abs(idx - activeIndex)
                        );

                    const isFront = distance === 0;
                    const isSide = distance === 1 || distance === 2;
                    const isBack = distance > 2;

                    return (
                      <div
                        key={doc.id}
                        className={`team-3d-card transition-all duration-350 ${
                          isFront
                            ? "opacity-100 filter-none z-10 pointer-events-auto"
                            : isSide
                            ? "opacity-85 filter brightness-[0.94] z-[5] cursor-pointer pointer-events-auto"
                            : "opacity-0 pointer-events-none z-0"
                        }`}
                        style={{
                          transform: `rotateY(${cardAngle}deg) translateZ(${radius}px)`,
                        }}
                        onClick={(e) => {
                          if (!isFront && isSide && !hasDragged.current) {
                            e.stopPropagation();
                            rotateToDoctor(idx);
                          }
                        }}
                      >
                        <div
                          className={`w-[320px] h-[510px] rounded-2xl bg-white dark:bg-gray-900 border p-4 shadow-xl flex flex-col justify-between transition-all ${
                            isFront
                              ? "border-emerald-600 dark:border-emerald-500 ring-2 ring-emerald-500/40 shadow-2xl"
                              : "border-gray-200/90 dark:border-gray-800/90 hover:border-emerald-500/40"
                          }`}
                        >
                          <div>
                            {/* Portrait Photo Container */}
                            <div className="w-full h-[225px] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2.5 relative shadow-inner">
                              {doc.photoUrl ? (
                                <Image
                                  src={resolveMediaUrl(doc.photoUrl) || doc.photoUrl}
                                  alt={doc.displayName}
                                  width={320}
                                  height={300}
                                  sizes="320px"
                                  className="w-full h-full object-cover object-top pointer-events-none"
                                />
                              ) : (
                                <div className="w-full h-full grid place-items-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 text-gray-400">
                                  <User className="h-16 w-16 stroke-[1.2]" />
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
                                <h3 className="font-display text-base font-bold text-gray-950 dark:text-white leading-tight truncate">
                                  {doc.displayName}
                                </h3>
                                {doc.credentials && (
                                  <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                                    {doc.credentials}
                                  </span>
                                )}
                              </div>

                              {doc.professionalTitle && (
                                <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300 truncate">
                                  {doc.professionalTitle}
                                </p>
                              )}

                              {doc.biography && (
                                <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2 pt-0.5">
                                  {doc.biography}
                                </p>
                              )}

                              {doc.locationName && (
                                <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 pt-0.5">
                                  <MapPin className="h-3 w-3 text-primary shrink-0" />
                                  <span className="truncate">{doc.locationName}</span>
                                </div>
                              )}

                              {/* Specialties Tags */}
                              {doc.specialties && doc.specialties.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1.5">
                                  {doc.specialties.slice(0, 3).map((spec, i) => (
                                    <span
                                      key={i}
                                      className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9.5px] text-gray-600 dark:text-gray-300"
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
                              className="w-full justify-center text-xs font-semibold rounded-full"
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

              {/* Ring Pagination Indicators */}
              {n > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-6">
                  {filteredDoctors.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => rotateToDoctor(i)}
                      aria-label={`Go to clinician ${i + 1}`}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        i === activeIndex
                          ? "w-7 bg-emerald-700 dark:bg-emerald-500"
                          : "w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ============================================================== */}
            {/* MOBILE & TABLET FALLBACK: Touch-Snapping Horizontal Carousel   */}
            {/* ============================================================== */}
            <div className="lg:hidden relative w-full group">
              {filteredDoctors.length > 1 && (
                <>
                  <button
                    onClick={() => scrollMobile(-300)}
                    aria-label={copy.previousClinicians}
                    className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-white rounded-full shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
                  </button>
                  <button
                    onClick={() => scrollMobile(300)}
                    aria-label={copy.nextClinicians}
                    className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-white rounded-full shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                  >
                    <ChevronRight className="h-5 w-5 rtl:rotate-180" />
                  </button>
                </>
              )}

              <div
                ref={scrollRef}
                className="flex overflow-x-auto snap-x snap-mandatory gap-5 pb-6 hide-scrollbar scrollbar-none scroll-smooth px-1"
              >
                {filteredDoctors.map((doc, idx) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.45, delay: idx * 0.05 }}
                    className="w-[85%] sm:w-[320px] min-w-[280px] shrink-0 snap-start bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-800/90 p-4 shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div>
                      {/* Portrait Photo Container */}
                      <div className="w-full aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3 relative shadow-inner">
                        {doc.photoUrl ? (
                          <Image
                            src={resolveMediaUrl(doc.photoUrl) || doc.photoUrl}
                            alt={doc.displayName}
                            width={320}
                            height={400}
                            sizes="(max-width: 640px) 280px, 320px"
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div className="w-full h-full grid place-items-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 text-gray-400">
                            <User className="h-16 w-16 stroke-[1.2]" />
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
                          <h3 className="font-display text-base font-bold text-gray-950 dark:text-white leading-tight">
                            {doc.displayName}
                          </h3>
                          {doc.credentials && (
                            <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
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
                          <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-3 pt-0.5">
                            {doc.biography}
                          </p>
                        )}

                        {doc.locationName && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 pt-0.5">
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate">{doc.locationName}</span>
                          </div>
                        )}

                        {/* Specialties Tags */}
                        {doc.specialties && doc.specialties.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
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
                    <div className="pt-2.5 border-t border-gray-100 dark:border-gray-800">
                      <Button
                        href={`/book?doctor=${encodeURIComponent(doc.id)}`}
                        variant="primary"
                        size="sm"
                        className="w-full justify-center text-xs font-semibold rounded-full"
                      >
                        <Calendar className="h-3.5 w-3.5 mr-1.5" />
                        <span>{copy.bookConsultation}</span>
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default OurTeam;
