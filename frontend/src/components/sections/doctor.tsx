"use client";

import { useState, useRef } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  Award,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { usePublicContent } from "@/components/providers/public-content-provider";

export function Doctor() {
  const { content, director, team, clinics } = usePublicContent();
  const [selectedCity, setSelectedCity] = useState<string>("All Cities");
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeTeam = team.filter((m) => m.isActive);

  // Helper to resolve city for a team member based on assigned clinic
  const getMemberCity = (memberLocationId?: string | null) => {
    if (!memberLocationId) return "Chicago";
    const clinic = clinics.find((c) => c.id === memberLocationId);
    return clinic?.city || "Chicago";
  };

  const getMemberClinicName = (memberLocationId?: string | null) => {
    if (!memberLocationId) return "Main Medical Complex";
    const clinic = clinics.find((c) => c.id === memberLocationId);
    return clinic?.name || "Main Medical Complex";
  };

  // Extract unique cities represented by team members
  const memberCities = Array.from(
    new Set(activeTeam.map((m) => getMemberCity(m.locationId)).filter(Boolean))
  );
  const cityTabs = ["All Cities", ...memberCities];

  const filteredTeam =
    selectedCity === "All Cities"
      ? activeTeam
      : activeTeam.filter((m) => getMemberCity(m.locationId).toLowerCase() === selectedCity.toLowerCase());

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -340, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 340, behavior: "smooth" });
    }
  };

  return (
    <section id="about" className="border-t border-line bg-forest-deep text-[#FAF7F2] py-20 md:py-28 overflow-hidden">
      <div className="container-x space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <Users className="h-4 w-4" />
              <p className="eyebrow tracking-widest text-[11px] text-emerald-300 uppercase">
                Clinical Medical Group
              </p>
            </div>
            <h2 className="fluid-h2 tracking-[-0.02em] text-white font-normal">
              Meet Our Team
              <br />
              &amp; Clinical Specialists
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <p className="max-w-md text-sm leading-relaxed text-[#FAF7F2]/80">
              Dedicated doctors, clinical directors, and dental practitioners maintaining continuity of care across all nationwide clinic branches.
            </p>
            {/* Scroll Navigation Arrows */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <button
                onClick={scrollLeft}
                aria-label="Scroll clinicians left"
                className="h-10 w-10 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white grid place-items-center transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={scrollRight}
                aria-label="Scroll clinicians right"
                className="h-10 w-10 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white grid place-items-center transition-colors cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic City Filter Tabs */}
        {cityTabs.length > 1 && (
          <div className="border-b border-white/15 pb-4 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider font-mono mr-1">
              Branches By City:
            </span>
            {cityTabs.map((city) => {
              const isSelected = selectedCity === city;
              return (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500 text-black shadow-subtle font-bold"
                      : "bg-white/10 text-white/80 hover:text-white hover:bg-white/20 border border-white/15"
                  }`}
                >
                  {city}
                </button>
              );
            })}
          </div>
        )}

        {/* Horizontal Team Cards Track */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin snap-x snap-mandatory"
        >
          {filteredTeam.map((member, idx) => {
            const cityName = getMemberCity(member.locationId);
            const clinicName = getMemberClinicName(member.locationId);

            return (
              <div
                key={member.id}
                className="w-[300px] sm:w-[340px] md:w-[380px] shrink-0 snap-start"
              >
                <div className="h-full flex flex-col justify-between rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-sm hover:border-emerald-400/40 transition-colors">
                  <div className="space-y-4">
                    {/* Header info */}
                    <div className="flex items-start gap-4">
                      {member.photoUrl ? (
                        <img
                          src={member.photoUrl}
                          alt={member.displayName}
                          className="h-16 w-16 rounded-2xl object-cover border border-white/15 shrink-0 shadow-md"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-2xl bg-forest border border-white/10 text-emerald-200 grid place-items-center font-display text-xl font-bold shrink-0">
                          {member.firstName[0]}
                          {member.lastName[0]}
                        </div>
                      )}

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="rounded-full bg-emerald-950/90 border border-emerald-700/80 text-emerald-300 px-2 py-0.5 text-[9px] font-mono uppercase font-bold">
                            {member.role}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-white/60 font-mono">
                            <MapPin className="h-3 w-3 text-clay shrink-0" />
                            <span>{cityName}</span>
                          </span>
                        </div>

                        <h3 className="font-display text-lg font-bold text-white leading-tight truncate">
                          {member.displayName}
                        </h3>

                        <p className="text-xs text-white/70 truncate">
                          {member.professionalTitle}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-emerald-400/90 font-medium">
                      <span>Assigned: {clinicName}</span>
                    </div>

                    {/* Bio */}
                    {member.biography && (
                      <p className="text-xs text-white/75 line-clamp-3 leading-relaxed">
                        {member.biography}
                      </p>
                    )}

                    {/* Specialties */}
                    {member.specialties && member.specialties.length > 0 && (
                      <div className="pt-2 border-t border-white/10 space-y-1.5">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                          Focus Areas
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {member.specialties.map((spec, i) => (
                            <span
                              key={i}
                              className="rounded-md bg-white/10 px-2 py-0.5 text-[10.5px] text-white/90"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[10.5px] font-mono text-emerald-300">
                      {member.credentials ? `Credentials: ${member.credentials}` : "Verified Staff"}
                    </span>
                    <Button
                      href={`/book?team_member=${member.id}`}
                      variant="primary"
                      size="sm"
                      className="text-xs"
                    >
                      <span>Book with Clinician</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Doctor;
