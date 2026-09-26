"use client";

import { motion } from "motion/react";
import { Award, GraduationCap, ShieldCheck } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";

export function Doctor() {
  return (
    <section id="about" className="border-t border-line bg-forest-deep text-[#FAF7F2] py-20 md:py-28">
      <div className="container-x">
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
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=1200&auto=format&fit=crop"
                alt="Dr. Sarah Marlow, DDS in the Lincoln Park dental office"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <p className="font-display text-lg">Dr. Sarah Marlow, DDS</p>
                <p className="text-xs text-white/70">Solo Practitioner, Lincoln Park, Chicago</p>
              </div>
            </div>

            {/* Quick Licensure Box */}
            <div className="rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-4 text-xs text-[#FAF7F2]/80 space-y-2">
              <div className="flex items-center gap-2 text-white font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>State Licensure &amp; Clinical Standing</span>
              </div>
              <p>
                Illinois Professional License: <strong className="text-white font-mono">#019.029811</strong>
              </p>
              <p className="text-[11px] text-white/60">
                Active DEA Registration. BLS and CPR Certified. Chicago Dental Society member.
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
              eyebrow="Meet Your Dentist"
              title={
                <>
                  I opened this practice
                  <br />
                  to offer unhurried,
                  <br />
                  conservative care.
                </>
              }
            />

            <div className="space-y-4 text-[15px] sm:text-[16px] leading-[1.75] text-[#FAF7F2]/85 font-normal">
              <p>
                After graduating from the University of Michigan School of Dentistry, I spent four years working in high-volume group clinics in downtown Chicago. I watched patients get passed between multiple associate dentists and hygienists, repeatedly asking who was actually performing their care.
              </p>
              <p>
                In 2014, I established Marlow Dental on Alder Street with a clear rule: one doctor from start to finish. I personally perform your checkup, take time to listen to your concerns, clean your teeth, and complete any restorative work myself.
              </p>
              <p>
                When you sit in our chair, we will never recommend aggressive treatments or cosmetic veneers you did not request. If a tooth can be maintained conservatively with diligent home care, that is exactly what we will recommend.
              </p>
            </div>

            {/* Verified Clinical Credentials Grid */}
            <div className="pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-[#FAF7F2]/80">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <GraduationCap className="h-4 w-4 text-clay" />
                  <span>Education</span>
                </div>
                <p>Doctor of Dental Surgery (DDS), University of Michigan</p>
                <p>B.S. in Biology, University of Illinois at Urbana-Champaign</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Award className="h-4 w-4 text-clay" />
                  <span>Professional Affiliations</span>
                </div>
                <p>American Dental Association (ADA)</p>
                <p>Chicago Dental Society (CDS)</p>
                <p>Spear Study Club (Active Member since 2016)</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
export default Doctor;
