"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Clock,
  ShieldCheck,
  Sparkles,
  Plus,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { getServices, resolveMediaUrl, ServiceItem } from "@/lib/api";
import { motion, AnimatePresence } from "motion/react";
import { usePublicContent } from "@/components/providers/public-content-provider";

type CategoryFilter = "all" | string;

export function Treatments() {
  const { copy } = usePublicContent();
  const [activeTab, setActiveTab] = useState<CategoryFilter>("all");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [activeTreatmentId, setActiveTreatmentId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getServices()
      .then((data) => {
        if (isMounted) {
          if (data && data.length > 0) {
            const activeServices = data.filter((s) => s.isActive !== false);
            setServices(activeServices);
            if (activeServices.length > 0) {
              setActiveTreatmentId(activeServices[0].id);
            }
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

  const categories = Array.from(
    new Set(services.map((s) => s.category).filter(Boolean))
  );

  const filtered =
    activeTab === "all"
      ? services
      : services.filter((s) => s.category === activeTab);

  // Sync active treatment when category tab changes
  useEffect(() => {
    if (filtered.length > 0) {
      const exists = filtered.some((s) => s.id === activeTreatmentId);
      if (!exists) {
        setActiveTreatmentId(filtered[0].id);
      }
    }
  }, [activeTab, filtered, activeTreatmentId]);

  // If no services in database, render nothing
  if (!isLoading && services.length === 0) {
    return null;
  }

  const activeTreatment =
    filtered.find((s) => s.id === activeTreatmentId) || filtered[0];

  return (
    <section
      id="treatments"
      className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-20 md:py-28 overflow-hidden select-none"
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

        {/* Category Filter Tabs */}
        {categories.length > 1 && (
          <div
            className="border-b border-gray-200 dark:border-gray-800 pb-4 flex items-center gap-2 overflow-x-auto scrollbar-none"
            role="tablist"
          >
            <button
              role="tab"
              aria-selected={activeTab === "all"}
              onClick={() => setActiveTab("all")}
              className={`rounded-full px-5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "all"
                  ? "btn-premium-emerald text-white font-semibold"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
              }`}
            >
              <span>{copy.allTreatments}</span>
              <span
                className={`text-[11px] rounded-full px-2 py-0.2 ${
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
                  className={`rounded-full px-5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 capitalize ${
                    isActive
                      ? "btn-premium-emerald text-white font-semibold"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[11px] rounded-full px-2 py-0.2 ${
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

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                className="h-[480px] rounded-3xl border border-gray-200 dark:border-gray-800"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? null : (
          <>
            {/* ============================================================== */}
            {/* 1. TOP FEATURED PROCEDURE STAGE                                */}
            {/* ============================================================== */}
            {activeTreatment && (
              <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-card mb-6 transition-all">
                {/* Left (lg:col-span-6): High-res treatment photo */}
                <div className="lg:col-span-6 relative h-64 sm:h-72 lg:h-80 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTreatment.id}
                      initial={{ opacity: 0, scale: 1.02 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="w-full h-full relative"
                    >
                      {activeTreatment.imageUrl ? (
                        <Image
                          src={resolveMediaUrl(activeTreatment.imageUrl) || activeTreatment.imageUrl}
                          alt={activeTreatment.title}
                          fill
                          unoptimized
                          className="object-cover object-center"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-900/10 via-amber-50/20 to-transparent flex flex-col items-center justify-center p-6 text-center">
                          <ShieldCheck className="h-16 w-16 text-emerald-700/60 mb-2" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            {activeTreatment.category} Care
                          </span>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Gradient Vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

                  {/* Category Badge on Top-Left */}
                  <span className="absolute top-4 left-4 rounded-full btn-premium-emerald text-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm z-10">
                    {activeTreatment.category}
                  </span>

                  {/* Glassmorphic Duration Pill on Top-Right */}
                  {activeTreatment.duration && (
                    <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-black/60 dark:bg-black/70 backdrop-blur-md px-3 py-1 text-xs text-white shadow-sm font-medium z-10">
                      <Clock className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{activeTreatment.duration}</span>
                    </div>
                  )}
                </div>

                {/* Right (lg:col-span-6): Fraunces serif title, full clinical description, transparent price, 4-shadow button */}
                <div className="lg:col-span-6 p-6 lg:p-8 flex flex-col justify-between">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTreatment.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                          Featured Clinical Procedure
                        </span>
                      </div>

                      <h3 className="font-display text-2xl lg:text-3xl font-bold text-gray-950 dark:text-white leading-tight">
                        {activeTreatment.title}
                      </h3>

                      <p className="text-xs sm:text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                        {activeTreatment.fullDesc || activeTreatment.shortDesc}
                      </p>

                      {/* Clinical Badges */}
                      <div className="space-y-1.5 pt-1">
                        {activeTreatment.recommendedInterval && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>{activeTreatment.recommendedInterval}</span>
                          </div>
                        )}
                        {activeTreatment.insuranceNote && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>{activeTreatment.insuranceNote}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Footer Pricing & 4-Shadow CTA */}
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 mt-6">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-medium">
                        {copy.feeFrom}
                      </span>
                      <span className="font-mono text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                        {activeTreatment.cashPrice || copy.consultationRequired}
                      </span>
                    </div>

                    <Button
                      href={`/book?service=${encodeURIComponent(activeTreatment.id)}`}
                      variant="primary"
                      size="md"
                      className="rounded-full px-6 flex items-center gap-2 text-xs sm:text-sm font-semibold"
                    >
                      <span>{copy.book}</span>
                      <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 2. INTERACTIVE TREATMENT SELECTOR CARDS BELOW                  */}
            {/* ============================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((service) => {
                const isSelected = service.id === activeTreatment?.id;
                const thumbSrc = service.imageUrl
                  ? resolveMediaUrl(service.imageUrl) || service.imageUrl
                  : null;

                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setActiveTreatmentId(service.id)}
                    className={`group flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border text-left rtl:text-right transition-all cursor-pointer ${
                      isSelected
                        ? "border-emerald-600 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/30 shadow-md scale-[1.01]"
                        : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-emerald-500/40 hover:bg-gray-50/60 dark:hover:bg-gray-850 shadow-xs"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden relative shrink-0 bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-inner">
                      {thumbSrc ? (
                        <Image
                          src={thumbSrc}
                          alt={service.title}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-emerald-700/60 dark:text-emerald-400 bg-emerald-500/5">
                          <ShieldCheck className="h-6 w-6" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 truncate">
                          {service.category}
                        </span>
                        {service.duration && (
                          <span className="text-[10px] text-gray-600 dark:text-gray-400 shrink-0">
                            · {service.duration}
                          </span>
                        )}
                      </div>
                      <h4 className="font-display text-sm font-bold text-gray-950 dark:text-white leading-tight truncate">
                        {service.title}
                      </h4>
                      <p className="font-mono text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                        {service.cashPrice || copy.consultationRequired}
                      </p>
                    </div>

                    {/* Selection indicator checkmark */}
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "border border-gray-300 dark:border-gray-700 text-transparent group-hover:border-emerald-500/50"
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Signature Checkup Banner */}
        <div className="rounded-3xl border border-emerald-600/20 bg-gradient-to-r from-emerald-900/10 via-emerald-800/5 to-transparent p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
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
            className="rounded-full px-7 whitespace-nowrap flex items-center gap-2 shrink-0 font-semibold"
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
