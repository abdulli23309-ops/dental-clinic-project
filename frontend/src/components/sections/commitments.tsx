"use client";

import { motion } from "motion/react";
import { Clock, FileText, UserCheck } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card } from "@/components/ui/card";

const COMMITMENTS = [
  {
    num: "01",
    icon: UserCheck,
    title: "One Doctor from Start to Finish",
    subtitle: "No rotating hygienists or handoffs",
    description:
      "Dr. Sarah Marlow personally conducts your initial examination, your teeth cleaning, and every restorative procedure. You never have to re-explain your dental history or wonder which practitioner is treating you.",
  },
  {
    num: "02",
    icon: FileText,
    title: "Written Estimates Before We Begin",
    subtitle: "Clear pricing, zero billing surprises",
    description:
      "We explain every recommendation on screen using digital X-rays and intraoral photographs. You receive an itemized estimate showing exact procedural codes, cash rates, and estimated insurance benefits before treatment starts.",
  },
  {
    num: "03",
    icon: Clock,
    title: "Reserved Daily Emergency Slots",
    subtitle: "Same-week appointments for routine care",
    description:
      "We reserve dedicated triage hours every morning for sudden dental emergencies, severe pain, or broken restorations. Call our Lincoln Park desk before 11:00 AM Monday through Thursday for same-day evaluation.",
  },
];

/**
 * Renders the clinical commitments section highlighting three foundational standards of the practice:
 * single-doctor continuity, written pricing estimates before treatment, and reserved emergency appointments.
 */
export function Commitments() {
  return (
    <section id="commitments" className="border-t border-line bg-cream/40 py-20 md:py-28">
      <div className="container-x">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-start">
          {/* Section Introduction - 4 cols */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-4"
          >
            <SectionHeading
              eyebrow="Our Clinical Standard"
              title={
                <>
                  How private practice
                  <br />
                  should actually
                  <br />
                  feel.
                </>
              }
              description="Independent dentistry means clinical decisions are made between doctor and patient, without corporate quotas or high-pressure upselling."
            />
          </motion.div>

          {/* 3 Core Commitments - 8 cols with staggered motion */}
          <div className="lg:col-span-8">
            <div className="space-y-5">
              {COMMITMENTS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.num}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.35, delay: idx * 0.08 }}
                  >
                    <Card
                      surface="bone"
                      shadow="subtle"
                      hoverLift={true}
                      className="p-6 sm:p-8"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <span className="font-mono text-xs font-semibold text-clay bg-sand/60 px-2.5 py-1 rounded">
                            {item.num}
                          </span>
                          <div>
                            <h3 className="font-display text-[21px] sm:text-[23px] text-ink leading-snug">
                              {item.title}
                            </h3>
                            <p className="text-xs uppercase tracking-wider font-semibold text-forest dark:text-emerald-400 mt-0.5">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>
                        <div className="hidden sm:grid h-10 w-10 place-items-center rounded-full bg-cream border border-line text-ink-soft shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>

                      <p className="mt-4 sm:ml-12 text-[14.5px] leading-relaxed text-ink-soft">
                        {item.description}
                      </p>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
export default Commitments;
