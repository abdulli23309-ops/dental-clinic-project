"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  Clock,
  Tag,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { getServices, ServiceItem } from "@/lib/api";
import { motion } from "motion/react";
import { getUiCopy } from "@/content/ui-copy";

type CategoryFilter = "all" | string;

export function Services() {
  const [activeTab, setActiveTab] = useState<CategoryFilter>("all");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const copy = getUiCopy("en");

  const scroll = (offset: number) => {
    scrollRef.current?.scrollBy({ left: offset, behavior: "smooth" });
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

  // Sections with no data render nothing
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
      id="services"
      className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-20 md:py-28 overflow-hidden"
    >
      <div className="container-x space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Clinical Care"
            title={copy.treatments}
          />
        </div>

        {/* Category Pill Tabs */}
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
                  layoutId="publicServicesTabIndicator"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10">All</span>
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
                      layoutId="publicServicesTabIndicator"
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

        {/* Loading State Skeleton */}
        {isLoading ? (
          <div
            className="flex flex-row overflow-x-auto snap-x snap-mandatory gap-4 py-4 hide-scrollbar"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                className="min-w-[280px] max-w-[300px] h-72 rounded-2xl border border-line shrink-0"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? null : (
          /* Slim & Horizontal Scrollable Row with Navigation Controls */
          <div className="relative w-full group">
            <button
              onClick={() => scroll(-300)}
              aria-label="Previous treatments"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hidden md:flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              onClick={() => scroll(300)}
              aria-label="Next treatments"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hidden md:flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div
              ref={scrollRef}
              className="flex flex-row overflow-x-auto snap-x snap-mandatory gap-4 py-4 hide-scrollbar"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {filtered.map((service) => {
                return (
                  <div
                    key={service.id}
                    className="min-w-[280px] max-w-[300px] snap-center shrink-0 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-5 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all"
                  >
                    <div className="space-y-3">
                      {service.category && (
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5 text-xs">
                          <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-[10.5px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            {service.category}
                          </span>
                        </div>
                      )}

                      <h4 className="font-display text-lg text-gray-900 dark:text-white font-normal leading-snug">
                        {service.title}
                      </h4>

                      {service.shortDesc && (
                        <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400 line-clamp-3">
                          {service.shortDesc}
                        </p>
                      )}

                      {/* Duration & Cash Price only if set by admin */}
                      {(service.duration || service.cashPrice) && (
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                          {service.duration ? (
                            <div className="flex items-center gap-1.5 font-medium">
                              <Clock className="h-3.5 w-3.5 text-primary" />
                              <span>{service.duration}</span>
                            </div>
                          ) : <div />}
                          {service.cashPrice ? (
                            <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                              <Tag className="h-3.5 w-3.5 text-primary dark:text-emerald-400" />
                              <span>{service.cashPrice}</span>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Booking Action */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                      <Button
                        href={`/book?service=${service.id}`}
                        variant="secondary"
                        size="sm"
                        className="w-full justify-between"
                      >
                        <span className="flex items-center gap-1.5 text-xs">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          <span>{copy.book}</span>
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default Services;
