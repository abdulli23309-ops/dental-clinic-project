"use client";

import { motion } from "motion/react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { SafeImage } from "@/components/ui/safe-image";

export function WhyChooseUs() {
  const { content, organization, copy } = usePublicContent();

  const promises = content.homepage?.promises || [];
  const practiceName =
    content.general?.practiceName || organization?.displayName || "";
  const whyChooseUsImage = content.homepage?.whyChooseUsImage;
  const whyChooseUsCaption =
    content.homepage?.whyChooseUsCaption || "Modern Dental Suite - DHDC Islamabad";

  return (
    <section
      id="why-us"
      className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/50 py-20 md:py-28"
    >
      <div className="container-x">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-start">
          {/* Left Column: Why Choose Us Promises + 3-Step Strip */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{copy.whyUs || "Why Choose Us"}</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-gray-950 dark:text-white leading-tight">
                {copy.modernDentalCare}
              </h2>
              {practiceName && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Experience patient-centered clinical excellence at {practiceName}.
                </p>
              )}
            </div>

            {/* Promises List (from CMS) */}
            <div className="space-y-4">
              {promises.length > 0 ? (
                promises.map((p, idx) => (
                  <motion.div
                    key={p.num || idx}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.4, delay: idx * 0.08 }}
                    className="rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-950 p-5 shadow-xs hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary font-mono text-sm font-bold">
                        {p.num || `0${idx + 1}`}
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white">
                          {p.title}
                        </h3>
                        {p.subtitle && (
                          <p className="text-xs font-medium text-primary">
                            {p.subtitle}
                          </p>
                        )}
                        <p className="text-xs sm:text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
                          {p.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-950 p-5 space-y-3">
                  <div className="flex items-center gap-3 text-sm font-semibold text-gray-900 dark:text-white">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>Transparent Pricing & Zero Surprise Fees</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-gray-900 dark:text-white">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>Gentle, Minimally Invasive Treatment Protocols</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-gray-900 dark:text-white">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>Direct Doctor Access & Continuity of Care</span>
                  </div>
                </div>
              )}
            </div>

            {/* Visit in Three Steps Strip */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
                Your Visit in 3 Simple Steps
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-white text-[10px]">1</span>
                    <span>Choose Treatment</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-[11px]">
                    Select routine care or specialized aesthetic dentistry.
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-white text-[10px]">2</span>
                    <span>Pick Your Time</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-[11px]">
                    Select convenient slots with your chosen clinician.
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-white text-[10px]">3</span>
                    <span>Instant Confirmation</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-[11px]">
                    Get immediate SMS booking details & calendar invite.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Luxury Clinical Facility Feature Image with Caption */}
          <div className="lg:col-span-5 sticky top-28 space-y-4">
            <SafeImage
              src={whyChooseUsImage}
              alt={whyChooseUsCaption}
              caption={whyChooseUsCaption}
              aspectRatio="aspect-[4/3]"
              fallbackTitle="Modern Dental Suite"
              fallbackSubtitle="DHDC Islamabad Clinical Facility"
              className="w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default WhyChooseUs;
