"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { getServices, resolveMediaUrl, ServiceItem } from "@/lib/api";
import { motion } from "motion/react";
import { usePublicContent } from "@/components/providers/public-content-provider";

type CategoryFilter = "all" | string;

export function Treatments() {
  const { copy } = usePublicContent();
  const [activeTab, setActiveTab] = useState<CategoryFilter>("all");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollByCard = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const firstCard = container.querySelector<HTMLElement>(":scope > div");
    const cardWidth = firstCard ? firstCard.getBoundingClientRect().width + 24 : container.clientWidth * 0.85;
    container.scrollBy({
      left: direction === "left" ? -cardWidth : cardWidth,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    let isMounted = true;

    getServices()
      .then((data) => {
        if (isMounted) {
          if (data && data.length > 0) {
            setServices(data.filter((s) => s.isActive !== false));
          } else {
            setServices([]);
          }
        }
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

  // If no services in database, render nothing
  if (!isLoading && services.length === 0) {
    return null;
  }

  const categories = Array.from(
    new Set(services.map((s) => s.category).filter(Boolean))
  );

  const filtered =
    activeTab === "all"
      ? services
      : services.filter((s) => s.category === activeTab);

  return (
    <section
      id="treatments"
      className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-20 md:py-28 overflow-hidden"
    >
      {/* Anchor alias for backwards compatibility */}
      <span id="services" className="sr-only" />

      <div className="container-x space-y-12">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SectionHeading
            eyebrow={copy.clinicalExcellence}
            title={copy.treatments}
          />
          <p className="max-w-md text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {copy.clinicalExcellenceDesc}
          </p>
        </div>

        {/* Full Category Filter Pills */}
        {categories.length > 1 && (
          <div
            className="border-b border-gray-200 dark:border-gray-800 pb-4 flex items-center gap-2 overflow-x-auto scrollbar-none"
            role="tablist"
          >
            <button
              role="tab"
              aria-selected={activeTab === "all"}
              onClick={() => setActiveTab("all")}
              className={`relative rounded-full px-5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 select-none ${
                activeTab === "all"
                  ? "text-white shadow-subtle font-semibold"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
              }`}
            >
              {activeTab === "all" && (
                <motion.div
                  layoutId="publicTreatmentsTabIndicator"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10">{copy.allTreatments}</span>
              <span
                className={`relative z-10 text-[11px] rounded-full px-2 py-0.2 ${
                  activeTab === "all"
                    ? "bg-white/20 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                }`}
              >
                {services.length}
              </span>
            </button>

            {categories.map((cat) => {
              const count = services.filter((s) => s.category === cat).length;
              const isActive = activeTab === cat;

              return (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(cat)}
                  className={`relative rounded-full px-5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 select-none capitalize ${
                    isActive
                      ? "text-white shadow-subtle font-semibold"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="publicTreatmentsTabIndicator"
                      className="absolute inset-0 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{cat}</span>
                  <span
                    className={`relative z-10 text-[11px] rounded-full px-2 py-0.2 ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Treatments Directory Horizontal Carousel (Filtered) */}
        {isLoading ? (
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-6 scrollbar-hide">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton
                key={i}
                className="min-w-[280px] md:min-w-[320px] lg:min-w-[350px] shrink-0 snap-start h-64 rounded-2xl border border-gray-200 dark:border-gray-800"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? null : (
          <div className="relative group/carousel">
            {/* Absolute Left Arrow */}
            <button
              type="button"
              onClick={() => scrollByCard("left")}
              aria-label="Previous treatments"
              className="absolute left-0 sm:-left-3 top-1/2 -translate-y-1/2 z-20 grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 shadow-xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary transition-all cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
            </button>

            {/* Absolute Right Arrow */}
            <button
              type="button"
              onClick={() => scrollByCard("right")}
              aria-label="Next treatments"
              className="absolute right-0 sm:-right-3 top-1/2 -translate-y-1/2 z-20 grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 shadow-xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary transition-all cursor-pointer"
            >
              <ChevronRight className="h-5 w-5 rtl:rotate-180" />
            </button>

            <div
              ref={scrollContainerRef}
              className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-6 px-1 scrollbar-hide items-stretch"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {filtered.map((service) => (
                <div
                  key={service.id}
                  className="min-w-[280px] md:min-w-[320px] lg:min-w-[350px] shrink-0 snap-start rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all self-stretch group"
                >
                  <div className="space-y-3">
                    {/* Treatment Card Photo or Soft Gradient Fallback */}
                    <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                      {service.imageUrl ? (
                        <img
                          src={resolveMediaUrl(service.imageUrl) || service.imageUrl}
                          alt={service.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 via-emerald-500/10 to-teal-500/10 dark:from-primary/20 dark:via-emerald-950/40 dark:to-teal-950/40 flex flex-col items-center justify-center p-4 text-center">
                          <ShieldCheck className="h-8 w-8 text-primary/70 mb-1" />
                          <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 capitalize">
                            {service.category} Care
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
                        {service.category}
                      </span>
                      {service.duration && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span>{service.duration}</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-display text-base font-semibold text-gray-900 dark:text-white leading-snug">
                      {service.title}
                    </h4>

                    {service.shortDesc && (
                      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400 line-clamp-3">
                        {service.shortDesc}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2 mt-auto">
                    {service.cashPrice ? (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{copy.feeFrom}</span>
                        <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                          {service.cashPrice}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400">{copy.consultationRequired}</span>
                    )}

                    <Button
                      href={`/book?service=${encodeURIComponent(service.id)}`}
                      variant="outline"
                      size="sm"
                      className="rounded-full px-3 text-xs"
                    >
                      <span>{copy.book}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional Signature Checkup Banner */}
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <ShieldCheck className="h-4 w-4" />
              <span>{copy.signatureExam}</span>
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-gray-950 dark:text-white">
              {copy.signatureExamTitle}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {copy.signatureExamDesc}
            </p>
          </div>

          <Button
            href="/book"
            variant="primary"
            size="lg"
            className="rounded-full px-6 shadow-md whitespace-nowrap flex items-center gap-2"
          >
            <span>{copy.bookInitialExam}</span>
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </div>
      </div>
    </section>
  );
}

export default Treatments;
