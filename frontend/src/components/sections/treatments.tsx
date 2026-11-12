"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Calendar, CircleDollarSign, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { SafeImage } from "@/components/ui/safe-image";
import { CoverflowCarousel } from "@/components/ui/coverflow-carousel";
import { getServices, ServiceItem } from "@/lib/api";
import { usePublicContent } from "@/components/providers/public-content-provider";

type CategoryFilter = "all" | string;

export function Treatments() {
  const { copy, locale } = usePublicContent();
  const [activeTab, setActiveTab] = useState<CategoryFilter>("all");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const isRtl = locale === "ur";

  useEffect(() => {
    let isMounted = true;
    getServices()
      .then((data) => {
        if (isMounted) setServices(data?.filter((service) => service.isActive !== false) ?? []);
      })
      .catch(() => {
        if (isMounted) setServices([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = Array.from(
    new Set(services.map((service) => service.category).filter(Boolean))
  );
  const filtered = activeTab === "all"
    ? services
    : services.filter((service) => service.category === activeTab);

  if (!isLoading && services.length === 0) return null;

  const selectCategory = (category: CategoryFilter) => {
    setActiveTab(category);
    setActiveIndex(0);
  };

  return (
    <section
      id="treatments"
      className="treatments-glass-theme relative overflow-clip border-t border-gray-200 bg-white py-24 dark:border-gray-800 dark:bg-gray-950 md:py-32"
      aria-label="Treatments We Offer"
    >
      <span id="services" className="sr-only" />

      <div className="container-x relative z-10 space-y-12 lg:space-y-14">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading eyebrow={copy.clinicalExcellence} title={copy.treatments} />
          <p className="max-w-[62ch] text-pretty text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
            {copy.clinicalExcellenceDesc}
          </p>
        </div>

        {categories.length > 1 && (
          <div
            className="glass-filter-list flex items-center gap-2 overflow-x-auto border-b border-gray-200 pb-4 scrollbar-none dark:border-gray-800"
            role="tablist"
            aria-label={copy.treatments}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "all"}
              aria-current={activeTab === "all" ? "page" : undefined}
              onClick={() => selectCategory("all")}
              className={`glass-filter-tab relative flex min-h-11 shrink-0 items-center gap-2 rounded-full px-5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm ${
                activeTab === "all"
                  ? "z-0 font-semibold text-white"
                  : "border border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {activeTab === "all" && (
                <motion.span
                  layoutId="activeTreatmentCategory"
                  className="glass-filter-indicator absolute inset-0 -z-10 rounded-full bg-primary shadow-sm"
                  transition={shouldReduceMotion ? { duration: 0.01 } : { type: "spring", stiffness: 500, damping: 40, mass: 1 }}
                />
              )}
              <span>{copy.allTreatments}</span>
              <span className={`rounded-full px-2 text-[11px] ${activeTab === "all" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"}`}>
                {services.length}
              </span>
            </button>

            {categories.map((category) => {
              const count = services.filter((service) => service.category === category).length;
              const selected = activeTab === category;
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-current={selected ? "page" : undefined}
                  onClick={() => selectCategory(category)}
                  className={`glass-filter-tab relative flex min-h-11 shrink-0 items-center gap-2 rounded-full px-5 text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm ${
                    selected
                      ? "z-0 font-semibold text-white"
                      : "border border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {selected && (
                    <motion.span
                      layoutId="activeTreatmentCategory"
                      className="glass-filter-indicator absolute inset-0 -z-10 rounded-full bg-primary shadow-sm"
                      transition={shouldReduceMotion ? { duration: 0.01 } : { type: "spring", stiffness: 500, damping: 40, mass: 1 }}
                    />
                  )}
                  <span>{category}</span>
                  <span className={`rounded-full px-2 text-[11px] ${selected ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {(isLoading || filtered.length > 0) && (
          <div className="relative overflow-x-clip" aria-busy={isLoading}>
            {isLoading ? (
              <div className="grid min-h-[540px] place-items-center text-sm text-gray-500 dark:text-gray-400" role="status">
                Loading treatments…
              </div>
            ) : (
                  <CoverflowCarousel
                    variant="glass-drum"
                    items={filtered}
                    activeIndex={activeIndex}
                    onChange={setActiveIndex}
                    prevAriaLabel={copy.previousTreatments}
                    nextAriaLabel={copy.nextTreatments}
                    itemAriaLabelPrefix="treatment"
                    ariaLabel={copy.treatments}
                    getItemKey={(service) => service.id}
                    isRtl={isRtl}
                    renderItem={(service, _index, { isFront, offset }) => (
                      <article
                        data-active={isFront ? "true" : "false"}
                        data-offset={offset}
                        className="glass-treatment-card group relative h-full w-full min-h-0 select-none p-[14px]"
                      >
                        {/* Specular top-edge glass highlight */}
                        <div
                          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/30 to-transparent pointer-events-none z-20"
                          aria-hidden="true"
                        />

                        <div
                          data-card-part="photo"
                          className="relative h-[210px] w-full flex-none shrink-0 overflow-hidden rounded-[16px] bg-slate-100 shadow-inner dark:bg-slate-800/60 sm:h-[232px]"
                        >
                            <SafeImage
                              src={service.imageUrl}
                              alt={service.title}
                              fallbackInitials={service.title.split(" ").map((word) => word[0]).slice(0, 2).join("") || "TR"}
                              fallbackSubtitle={`${service.category} Care`}
                              fill
                              sizes="(max-width: 640px) 260px, 288px"
                              className="object-cover block"
                              priority={isFront}
                            />
                        </div>

                        <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-1.5 py-1">
                          <div className="flex min-w-0 items-start gap-2">
                            <h3 data-card-part="title" className="min-w-0 flex-1 break-words font-serif text-sm font-bold leading-snug text-gray-900 dark:text-white sm:text-base">
                              {service.title}
                            </h3>
                            <span data-card-part="duration" className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.04em] text-primary sm:text-[10px]">
                              {service.duration || copy.consultationRequired}
                            </span>
                          </div>

                          <p data-card-part="category" className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {service.category}
                          </p>

                          <p data-card-part="description" className="line-clamp-3 text-[11.5px] leading-[1.35] text-gray-600 dark:text-gray-300">
                            {service.shortDesc || copy.consultationRequired}
                          </p>

                          <div data-card-part="price" className="mt-auto flex min-w-0 items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400">
                            <CircleDollarSign className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                            <span className="truncate capitalize">{service.cashPrice || copy.consultationRequired}</span>
                          </div>
                        </div>

                        {/* CTA pinned at the bottom: full width, accent gradient, soft 3D look */}
                        <Button
                          href={isFront ? `/book?service=${encodeURIComponent(service.id)}` : undefined}
                          type="button"
                          tabIndex={isFront ? 0 : -1}
                          aria-disabled={!isFront}
                          onClick={!isFront ? (event) => event.preventDefault() : undefined}
                          variant="primary"
                          size="sm"
                          data-card-part="cta"
                          className={`mt-auto h-9 min-h-9 w-full shrink-0 rounded-full px-4 py-0 text-[12.5px] font-semibold shadow-md shadow-primary/25 hover:-translate-y-0.5 transition-all ${
                            !isFront ? "pointer-events-none opacity-85" : ""
                          }`}
                        >
                          <Calendar className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                          {copy.book}
                        </Button>
                      </article>
                    )}
                  />
            )}
          </div>
        )}

        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 md:flex-row md:items-center">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <ShieldCheck className="h-4 w-4" />
              <span>{copy.signatureExam}</span>
            </div>
            <h3 className="font-display text-xl font-bold text-gray-950 dark:text-white sm:text-2xl">{copy.signatureExamTitle}</h3>
            <p className="text-pretty text-xs leading-relaxed text-gray-600 dark:text-gray-300 sm:text-sm">{copy.signatureExamDesc}</p>
          </div>
          <Button href="/book" variant="primary" size="lg" className="flex shrink-0 items-center gap-2 rounded-full px-7 font-semibold shadow-xs">
            <span>{copy.bookInitialExam}</span>
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </div>
      </div>
    </section>
  );
}

export default Treatments;
