"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  MapPin,
  Calendar,
  Info,
  ChevronLeft,
  ChevronRight,
  Layers,
  List,
  Award,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { TeamMember, resolveMediaUrl } from "@/lib/api";
import { FilterChips } from "@/components/mobile/FilterChips";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { useMobileBooking } from "@/components/mobile/MobileBookingSheet";
import { SafeImage } from "@/components/ui/safe-image";
import { useT } from "@/i18n/useT";
import { Num } from "@/i18n/Num";
import { tap } from "@/lib/haptics";

function normalizeDoctorName(name?: string | null): string {
  if (!name) return "";
  if (/[\u0600-\u06FF]/.test(name)) return name.trim();
  const parts = name.trim().split(/\s+/);
  return parts
    .map((part) => {
      const upper = part.toUpperCase();
      // Keep credentials uppercase
      if (["BDS", "FCPS", "MS", "RDS", "MDS", "DDS", "MCPS"].includes(upper)) {
        return upper;
      }
      if (/^dr\.?$/i.test(part)) {
        return "Dr.";
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

const CITY_CANONICAL: Record<string, string> = {
  islamabad: "Islamabad",
  lahore: "Lahore",
  karachi: "Karachi",
  rawalpindi: "Rawalpindi",
  "اسلام آباد": "Islamabad",
  "لاہور": "Lahore",
  "کراچی": "Karachi",
  "راولپنڈی": "Rawalpindi",
};

const CITY_URDU_DISPLAY: Record<string, string> = {
  Islamabad: "اسلام آباد",
  Lahore: "لاہور",
  Karachi: "کراچی",
  Rawalpindi: "راولپنڈی",
};

function toCanonicalCity(city?: string | null): string {
  if (!city) return "";
  const clean = city.trim().toLowerCase();
  return CITY_CANONICAL[clean] || city.trim();
}

function getCityDisplay(canonical: string, isUrdu: boolean): string {
  if (isUrdu && CITY_URDU_DISPLAY[canonical]) {
    return CITY_URDU_DISPLAY[canonical];
  }
  return canonical;
}

export function MobileTeam() {
  const { team, locations, locale } = usePublicContent();
  const { openBooking } = useMobileBooking();
  const { t } = useT();
  const isUrdu = locale === "ur";
  const [viewMode, setViewMode] = useState<"deck" | "list">("deck");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inspectingDoctor, setInspectingDoctor] = useState<TeamMember | null>(null);

  const railRef = useRef<HTMLDivElement>(null);

  // Active clinicians
  const activeTeam = team.filter(
    (m) => m.isActive !== false && !m.displayName?.toLowerCase().includes("test")
  );

  // Map doctors to their facility and city
  const doctors = activeTeam.map((member) => {
    const loc = member.locationId
      ? locations.find((l) => l.id === member.locationId)
      : null;
    const rawCity = loc?.city || (isUrdu ? "اسلام آباد" : "Islamabad");
    return {
      ...member,
      displayName: normalizeDoctorName(member.displayName || `${member.firstName} ${member.lastName}`),
      locationName: loc?.name || (isUrdu ? "ڈی ایچ ڈی سی اسپیشلٹی سینٹر" : "DHDC Specialist Center"),
      city: rawCity,
      canonicalCity: toCanonicalCity(rawCity),
    };
  });

  // Unique canonical cities from active locations
  const availableCities = Array.from(
    new Set(locations.filter((l) => l.isActive !== false).map((l) => toCanonicalCity(l.city)).filter(Boolean))
  );

  // Branches in currently selected city
  const branchesInCity =
    selectedCity === "all"
      ? []
      : locations.filter(
          (l) =>
            l.isActive !== false &&
            toCanonicalCity(l.city) === selectedCity
        );

  // Filtered doctors list
  const filteredDoctors = doctors.filter((doc) => {
    if (selectedCity !== "all" && doc.canonicalCity !== selectedCity) {
      return false;
    }
    if (selectedBranch !== "all" && doc.locationId !== selectedBranch) {
      return false;
    }
    return true;
  });

  // Filter options for cities
  const cityFilterOptions = [
    { id: "all", label: isUrdu ? "تمام ڈاکٹرز" : "All Clinicians", count: doctors.length },
    ...availableCities.map((city) => ({
      id: city,
      label: getCityDisplay(city, isUrdu),
      count: doctors.filter((d) => d.canonicalCity === city).length,
    })),
  ];

  // Sub-branch filter options
  const selectedCityDisplay = selectedCity === "all" ? "" : getCityDisplay(selectedCity, isUrdu);
  const branchFilterOptions = [
    { id: "all", label: isUrdu ? `تمام ${selectedCityDisplay}` : `All ${selectedCityDisplay}` },
    ...branchesInCity.map((b) => ({
      id: b.id,
      label: b.name.replace(/^DHDC\s*/i, "").replace(new RegExp(`^${selectedCity}\\s*[-–—]?\\s*`, "i"), ""),
      count: doctors.filter((d) => d.locationId === b.id).length,
    })),
  ];

  const handleScroll = () => {
    if (!railRef.current) return;
    const scrollLeft = railRef.current.scrollLeft;
    const cardWidth = railRef.current.firstElementChild?.clientWidth || 300;
    const newIdx = Math.round(scrollLeft / (cardWidth + 14));
    if (newIdx !== currentIndex && newIdx >= 0 && newIdx < filteredDoctors.length) {
      setCurrentIndex(newIdx);
    }
  };

  const scrollToIndex = (idx: number) => {
    if (!railRef.current) return;
    const targetIdx = Math.max(0, Math.min(idx, filteredDoctors.length - 1));
    const cardWidth = railRef.current.firstElementChild?.clientWidth || 300;
    railRef.current.scrollTo({
      left: targetIdx * (cardWidth + 14),
      behavior: "smooth",
    });
    setCurrentIndex(targetIdx);
    tap(8);
  };

  if (doctors.length === 0) return null;

  const uniqueCitiesList = Array.from(new Set(doctors.map((d) => d.city).filter(Boolean)));
  const teamSubtitle = isUrdu
    ? `${doctors.length} مستند اور ماہر ڈاکٹرز۔`
    : `${doctors.length} specialized clinicians across ${uniqueCitiesList.join(", ")}.`;

  return (
    <div className="py-8 px-4 md:hidden">
      {/* Top Flex Row: Eyebrow + Deck|List Toggle */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {isUrdu ? "بোর্ড میں مصدقہ ڈاکٹرز" : "Board-Certified Clinicians"}
        </span>

        {/* View Toggle */}
        <div className="flex items-center p-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => {
              tap(6);
              setViewMode("deck");
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "deck"
                ? "bg-primary text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            aria-label="Switch to deck swipe view"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isUrdu ? "کارڈز" : "Deck"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              tap(6);
              setViewMode("list");
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "list"
                ? "bg-primary text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            aria-label="Switch to list overview"
          >
            <List className="w-3.5 h-3.5" />
            <span>{isUrdu ? "فہرست" : "List"}</span>
          </button>
        </div>
      </div>

      {/* Full-width Title & Subtitle */}
      <div className="mb-4">
        <h2 className="font-serif text-[28px] leading-[32px] font-bold text-gray-900 dark:text-white">
          {isUrdu ? "ہمارے ڈینٹل عملے سے ملاقات کریں" : "Our Dental Team"}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {teamSubtitle}
        </p>
      </div>

      {/* Row 1: City Filter Chips */}
      <FilterChips
        options={cityFilterOptions}
        activeId={selectedCity}
        onChange={(id) => {
          setSelectedCity(id);
          setSelectedBranch("all");
          setCurrentIndex(0);
          if (railRef.current) railRef.current.scrollTo({ left: 0, behavior: "smooth" });
        }}
        className="mb-2"
      />

      {/* Row 2: Conditional Sub-Branch Filter Chips */}
      {branchesInCity.length >= 2 && (
        <FilterChips
          options={branchFilterOptions}
          activeId={selectedBranch}
          onChange={(bId) => {
            setSelectedBranch(bId);
            setCurrentIndex(0);
            if (railRef.current) railRef.current.scrollTo({ left: 0, behavior: "smooth" });
          }}
          className="mb-3.5 opacity-90"
        />
      )}

      {/* ============================================================== */}
      {/* MODE A: DECK / HORIZONTAL SNAP CARDS                           */}
      {/* ============================================================== */}
      {viewMode === "deck" && (
        <div>
          <div
            ref={railRef}
            onScroll={handleScroll}
            className="flex gap-3.5 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 pt-1 pb-3"
          >
            {filteredDoctors.map((doc) => {
              const photoUrl = resolveMediaUrl(doc.photoUrl) || "/images/doctors/placeholder.jpg";
              const specialties = Array.isArray(doc.specialties) ? doc.specialties : [];

              return (
                <div
                  key={doc.id}
                  className="snap-center shrink-0 w-[82vw] max-w-[325px] rounded-[26px] bg-white dark:bg-[#0d1322] border border-primary/30 dark:border-white/10 p-4 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    {/* Doctor Portrait with floating Credential badge */}
                    <div className="h-[230px] rounded-[20px] overflow-hidden relative bg-slate-100 dark:bg-slate-800">
                      <SafeImage
                        src={doc.photoUrl || null}
                        alt={doc.displayName}
                        fill
                        className="w-full h-full object-cover object-[50%_15%]"
                        fallbackInitials={doc.displayName.replace(/Dr\.?\s*/i, "").charAt(0) || "D"}
                        fallbackSubtitle={doc.professionalTitle || doc.role}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      {/* Credential Badge Floating Top-Right */}
                      {doc.credentials && (
                        <span className="absolute top-2.5 right-2.5 backdrop-blur-md bg-black/65 text-white text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full border border-white/20">
                          {doc.credentials}
                        </span>
                      )}

                      {/* Location Line Bottom-Left */}
                      <span className="absolute bottom-2.5 left-2.5 backdrop-blur-md bg-black/65 text-white text-[10px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary" />
                        <span className="truncate max-w-[190px]">{doc.locationName}</span>
                      </span>
                    </div>

                    {/* Doctor Name (Full name, never truncated) */}
                    <h3 className="font-serif text-[20px] font-bold leading-tight text-slate-900 dark:text-white mt-3.5">
                      {doc.displayName}
                    </h3>

                    {/* Role & Specialty */}
                    <p className="text-xs font-semibold text-primary mt-0.5">
                      {doc.professionalTitle || doc.role || "Licensed Clinician"}
                    </p>

                    {/* Specialty tags */}
                    {Array.isArray(specialties) && specialties.length > 0 && (
                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-2">
                        {specialties.slice(0, 3).map((spec: string, i: number) => (
                          <span
                            key={i}
                            className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions: Book Primary + 44x44 Info button */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        tap(8);
                        setInspectingDoctor(doc);
                      }}
                      className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors cursor-pointer shrink-0"
                      aria-label={`View clinical biography for ${doc.displayName}`}
                    >
                      <Info className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        tap(10);
                        openBooking({ doctorId: doc.id, clinicId: doc.locationId || undefined });
                      }}
                      className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-primary/30 transition-colors cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="truncate">
                        {isUrdu ? `${doc.displayName} کے ساتھ بک کریں` : `Book with ${doc.displayName.replace(/^Dr\.?\s*/i, "") || "Doctor"}`}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stepper Controls & Counter Below Deck */}
          {filteredDoctors.length > 1 && (
            <div className="mt-4 flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                {filteredDoctors.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToIndex(i)}
                    aria-label={`Go to doctor ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      i === currentIndex ? "w-6 bg-primary" : "w-1.5 bg-slate-300 dark:bg-slate-700"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-semibold text-slate-500 tabular-nums">
                  {String(currentIndex + 1).padStart(2, "0")} / {String(filteredDoctors.length).padStart(2, "0")}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() => scrollToIndex(currentIndex - 1)}
                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
                    aria-label="Previous clinician"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    disabled={currentIndex === filteredDoctors.length - 1}
                    onClick={() => scrollToIndex(currentIndex + 1)}
                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
                    aria-label="Next clinician"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE B: COMPACT SCANNABLE DIRECTORY (LIST VIEW)                */}
      {/* ============================================================== */}
      {viewMode === "list" && (
        <div className="space-y-2.5">
          {filteredDoctors.map((doc) => {
            const photoUrl = resolveMediaUrl(doc.photoUrl) || "/images/doctors/placeholder.jpg";

            return (
              <div
                key={doc.id}
                onClick={() => {
                  tap(8);
                  setInspectingDoctor(doc);
                }}
                className="h-[76px] px-3.5 rounded-2xl bg-white dark:bg-[#0d1322] border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between gap-3 active:scale-[0.99] transition-transform cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-[52px] h-[52px] rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800">
                    <img
                      src={photoUrl}
                      alt={doc.displayName}
                      className="w-full h-full object-cover object-[50%_15%]"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-serif text-base font-bold text-gray-900 dark:text-white truncate">
                        {doc.displayName}
                      </h4>
                      {doc.credentials && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                          {doc.credentials}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-primary font-medium truncate">
                      {doc.professionalTitle || doc.role}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{doc.locationName}</span>
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {/* Doctor Detail Bottom Sheet */}
      <BottomSheet
        isOpen={!!inspectingDoctor}
        onClose={() => setInspectingDoctor(null)}
        title={inspectingDoctor?.displayName || (isUrdu ? "ڈاکٹر کی تفصیلات" : "Clinician Details")}
        subtitle={inspectingDoctor?.professionalTitle || inspectingDoctor?.role}
      >
        {inspectingDoctor && (
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
            {/* Header Portrait & Badges */}
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-white/10">
              <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border border-slate-300 dark:border-white/20">
                <img
                  src={resolveMediaUrl(inspectingDoctor.photoUrl) || "/images/doctors/placeholder.jpg"}
                  alt={inspectingDoctor.displayName}
                  className="w-full h-full object-cover object-[50%_15%]"
                />
              </div>

              <div className="min-w-0">
                <h4 className="font-serif text-lg font-bold text-gray-900 dark:text-white truncate">
                  {inspectingDoctor.displayName}
                </h4>
                <p className="text-xs text-primary font-semibold">
                  {inspectingDoctor.professionalTitle || inspectingDoctor.role}
                </p>
                {inspectingDoctor.credentials && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <GraduationCap className="w-3.5 h-3.5 text-primary" />
                    <span>{inspectingDoctor.credentials}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Biography */}
            <div>
              <h5 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                {isUrdu ? "تعارف اور طبی تجربہ" : "Biography & Clinical Experience"}
              </h5>
              <p className="mt-1 leading-relaxed text-sm">
                {inspectingDoctor.biography || (isUrdu
                  ? `${inspectingDoctor.professionalTitle || "ماہر امراض دندان"} - جامع کلینیکل دانتوں کی دیکھ بھال اور علاج فراہم کرتے ہیں۔`
                  : `${inspectingDoctor.professionalTitle || "Dental Specialist"} providing comprehensive clinical oral care and treatment.`)}
              </p>
            </div>

            {/* Education & License */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {inspectingDoctor.education && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 block">
                    {isUrdu ? "تعلیم" : "Education"}
                  </span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white block mt-0.5">
                    {inspectingDoctor.education}
                  </span>
                </div>
              )}

              {inspectingDoctor.licenseNumber && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 block">
                    {isUrdu ? "پی ایم ڈی سی لائسنس" : "PMDC License"}
                  </span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white block mt-0.5">
                    {inspectingDoctor.licenseNumber}
                  </span>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  tap(10);
                  const doc = inspectingDoctor;
                  setInspectingDoctor(null);
                  openBooking({ doctorId: doc.id, clinicId: doc.locationId || undefined });
                }}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-md shadow-primary/30 transition-colors cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>{isUrdu ? `${inspectingDoctor.displayName} کے ساتھ مشاورت بک کریں` : `Book Consultation with ${inspectingDoctor.displayName}`}</span>
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
