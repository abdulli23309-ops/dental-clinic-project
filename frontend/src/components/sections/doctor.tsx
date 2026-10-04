"use client";

import { motion } from "motion/react";
import { Award, GraduationCap, ShieldCheck, Users } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { usePublicContent } from "@/components/providers/public-content-provider";

export function Doctor() {
  const { content, director, team } = usePublicContent();

  const practiceName = content.general?.practiceName || "Marlow Dental";
  const aboutTitle = content.about?.title || "Unhurried, conservative dental excellence.";
  const aboutStory =
    content.about?.storyParagraphs && content.about.storyParagraphs.length > 0
      ? content.about.storyParagraphs
      : [
          director.biography ||
            "Our clinicians provide patient-first continuity from initial checkup to treatment completion.",
          "When you sit in our chair, we will never recommend aggressive interventions or unnecessary procedures. If a tooth can be maintained conservatively with diligent care, that is exactly what we advise.",
        ];

  // Other doctors/specialists on the team besides the Director
  const associateTeam = team.filter((m) => m.id !== director.id && m.isActive);

  return (
    <section id="about" className="border-t border-line bg-forest-deep text-[#FAF7F2] py-20 md:py-28">
      <div className="container-x space-y-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16 items-center">
          {/* Portrait & Credentials Column - 5 cols */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45 }}
            className="lg:col-span-5 space-y-6"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] border border-white/10 bg-forest shadow-elevated">
              <img
                src={
                  director.photoUrl ||
                  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=1200&auto=format&fit=crop"
                }
                alt={`${director.displayName} at ${practiceName}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <span className="inline-block rounded-full bg-forest/80 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 uppercase tracking-wider mb-1">
                  {director.role || "Clinical Director"}
                </span>
                <p className="font-display text-lg">{director.displayName}</p>
                <p className="text-xs text-white/70">{director.professionalTitle}</p>
              </div>
            </div>

            {/* Licensure Box */}
            <div className="rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-4 text-xs text-[#FAF7F2]/80 space-y-2">
              <div className="flex items-center gap-2 text-white font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>State Licensure &amp; Clinical Standing</span>
              </div>
              <p>
                {director.licenseState || "Illinois"} Dental License:{" "}
                <strong className="text-white font-mono">
                  {director.licenseNumber || "Active & Verified"}
                </strong>
              </p>
              <p className="text-[11px] text-white/60">
                {content.about?.licensureText ||
                  "Active DEA Registration. BLS and CPR Certified. Chicago Dental Society member."}
              </p>
            </div>
          </motion.div>

          {/* Bio & Clinical Ethics - 7 cols */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="lg:col-span-7 space-y-6"
          >
            <SectionHeading
              theme="dark"
              eyebrow={content.about?.eyebrow || "Clinical Leadership"}
              title={<>{aboutTitle}</>}
            />

            <div className="space-y-4 text-[15px] sm:text-[16px] leading-[1.75] text-[#FAF7F2]/85 font-normal">
              {aboutStory.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>

            {/* Verified Clinical Credentials Grid */}
            <div className="pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-[#FAF7F2]/80">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <GraduationCap className="h-4 w-4 text-clay" />
                  <span>Clinical Education</span>
                </div>
                <p>{director.education || "Doctor of Dental Surgery"}</p>
                {director.credentials && (
                  <p className="font-mono text-emerald-300">Credentials: {director.credentials}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Award className="h-4 w-4 text-clay" />
                  <span>Focus &amp; Specialties</span>
                </div>
                {director.specialties && director.specialties.length > 0 ? (
                  <ul className="space-y-0.5">
                    {director.specialties.map((spec, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-clay" />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Comprehensive Preventive &amp; Restorative Dentistry</p>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Clinical Medical Group Roster (Multi-Doctor Complex Support) */}
        {associateTeam.length > 0 && (
          <div className="pt-12 border-t border-white/10 space-y-6">
            <div className="flex items-center gap-2 text-emerald-400">
              <Users className="h-4 w-4" />
              <p className="eyebrow tracking-widest text-[11px] text-emerald-300 uppercase">
                Clinical Medical Complex Team
              </p>
            </div>
            <h3 className="font-display text-2xl text-white">
              Practitioners &amp; Dental Specialists
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {associateTeam.map((member) => (
                <div
                  key={member.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.displayName}
                        className="h-14 w-14 rounded-xl object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-forest text-emerald-200 grid place-items-center font-display text-lg shrink-0">
                        {member.firstName[0]}
                        {member.lastName[0]}
                      </div>
                    )}
                    <div>
                      <span className="rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-2 py-0.5 text-[9.5px] font-semibold uppercase">
                        {member.role}
                      </span>
                      <h4 className="font-display text-base text-white mt-1">
                        {member.displayName}
                      </h4>
                      <p className="text-xs text-white/60">{member.professionalTitle}</p>
                    </div>
                  </div>

                  {member.biography && (
                    <p className="text-xs text-white/70 line-clamp-3 leading-relaxed">
                      {member.biography}
                    </p>
                  )}

                  {member.specialties && member.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                      {member.specialties.map((s, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-white/80"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default Doctor;
