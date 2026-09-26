"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Clock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";

type CategoryFilter = "all" | "preventive" | "restorative" | "cosmetic" | "emergency";

interface ServiceDisplay {
  id: string;
  category: CategoryFilter;
  title: string;
  shortDesc: string;
  cashPrice: string;
  duration: string;
  code: string;
  insuranceNote: string;
  highlight?: boolean;
}

const SERVICES_CATALOG: ServiceDisplay[] = [
  {
    id: "cleanings-exams",
    category: "preventive",
    title: "Cleanings & Comprehensive Exam",
    shortDesc: "Complete oral health evaluation, low-radiation digital bitewing X-rays, ultrasonic scaling, polish, and thorough doctor consultation.",
    cashPrice: "from $140",
    duration: "45 to 60 min",
    code: "CDT D0150 / D1110",
    insuranceNote: "Typically 100% covered by dental PPO plans twice per calendar year.",
    highlight: true,
  },
  {
    id: "fillings-crowns",
    category: "restorative",
    title: "Tooth-Colored Fillings & Crowns",
    shortDesc: "Composite resin restorations matched to your tooth shade, and custom-milled ceramic crowns restoring natural chewing bite.",
    cashPrice: "from $210",
    duration: "60 to 90 min",
    code: "CDT D2391 / D2740",
    insuranceNote: "Typically 50% to 80% covered by PPO plans with pre-treatment estimate.",
    highlight: true,
  },
  {
    id: "root-canals",
    category: "restorative",
    title: "Gentle Endodontics (Root Canals)",
    shortDesc: "Rotary canal instrumentation performed by Dr. Marlow with local anesthesia to eliminate acute nerve pain.",
    cashPrice: "from $680",
    duration: "75 to 90 min",
    code: "CDT D3330",
    insuranceNote: "Covered under major restorative benefits on most insurance policies.",
  },
  {
    id: "invisalign",
    category: "cosmetic",
    title: "Invisalign Clear Aligners",
    shortDesc: "Digital 3D optical scans, custom clear trays, and progressive bite alignment without metal brackets or wires.",
    cashPrice: "from $3,400",
    duration: "6 to 15 months",
    code: "CDT D8090",
    insuranceNote: "Many PPO plans include $1,000 to $2,000 lifetime orthodontic coverage.",
  },
  {
    id: "whitening",
    category: "cosmetic",
    title: "Professional Enamel Whitening",
    shortDesc: "Custom-fitted laboratory trays or in-office carbamide peroxide whitening with gingival protection.",
    cashPrice: "from $280",
    duration: "1 visit or 2 weeks",
    code: "CDT D9972",
    insuranceNote: "Elective cosmetic care. 6-month zero-interest financing available.",
  },
  {
    id: "emergency",
    category: "emergency",
    title: "Same-Day Emergency Triage",
    shortDesc: "Sudden toothache, broken restoration, chipped tooth, or facial swelling. Reserved triage blocks available daily.",
    cashPrice: "from $95",
    duration: "30 to 45 min",
    code: "CDT D0140 / D9110",
    insuranceNote: "Emergency diagnostics and palliative care covered by most plans.",
  },
];

const TABS: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All Treatments" },
  { id: "preventive", label: "Preventive" },
  { id: "restorative", label: "Restorative" },
  { id: "cosmetic", label: "Cosmetic" },
  { id: "emergency", label: "Emergency" },
];

/**
 * Renders the dental treatments catalogue with interactive category filter tabs (Preventive, Restorative, Cosmetic, Emergency).
 * Each card displays clear cash pricing, CDT billing codes, visit duration, and a direct booking button.
 */
export function Services() {
  const [activeTab, setActiveTab] = useState<CategoryFilter>("all");

  const filtered =
    activeTab === "all"
      ? SERVICES_CATALOG
      : SERVICES_CATALOG.filter((s) => s.category === activeTab);

  return (
    <section id="services" className="border-t border-line bg-bone py-20 md:py-28">
      <div className="container-x">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <SectionHeading
            eyebrow="Treatments & Fee Transparency"
            title={
              <>
                A clear list of procedures
                <br />
                we do well.
              </>
            }
          />
          <p className="max-w-md text-sm leading-relaxed text-ink-soft">
            The figures below reflect our upfront cash fee schedule. If you use PPO dental insurance, your out-of-pocket copay is typically significantly lower. We provide itemized written estimates before beginning any work.
          </p>
        </motion.div>

        {/* Tab Selection */}
        <div className="mt-10 border-b border-line pb-4 flex flex-wrap gap-2" role="tablist">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-forest text-[#FAF7F2] shadow-subtle"
                    : "bg-cream text-ink-soft hover:text-ink hover:bg-sand/60 border border-line/60"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Services Grid with Visual Hierarchy and Staggered Reveals */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((service, idx) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.35, delay: Math.min(idx * 0.06, 0.3) }}
            >
              <Card
                surface={service.highlight ? "cream" : "bone"}
                shadow={service.highlight ? "card" : "subtle"}
                hoverLift={true}
                className="h-full flex flex-col justify-between p-6"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-line/60 pb-3">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-forest dark:text-emerald-400 font-semibold">
                      {service.code}
                    </span>
                    <span className="rounded-full bg-sand/60 px-2.5 py-0.5 text-[10.5px] font-semibold text-clay">
                      {service.category}
                    </span>
                  </div>

                  <h3 className="mt-3.5 font-display text-[20px] sm:text-[22px] text-ink leading-snug">
                    {service.title}
                  </h3>

                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
                    {service.shortDesc}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink-soft/90 pt-3 border-t border-line/50">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-clay" />
                      <span>{service.duration}</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-ink">
                      <Tag className="h-3.5 w-3.5 text-forest dark:text-emerald-400" />
                      <span>{service.cashPrice}</span>
                    </div>
                  </div>

                  <p className="mt-2 text-[11.5px] text-ink-soft/75 italic">
                    {service.insuranceNote}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-line/60">
                  <Button
                    href={`/book?service=${service.id}`}
                    variant={service.highlight ? "primary" : "secondary"}
                    size="sm"
                    className="w-full justify-between"
                  >
                    <span>Book this treatment</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Services;
