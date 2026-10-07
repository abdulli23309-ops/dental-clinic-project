"use client";

import { useState, useEffect } from "react";
import {
  ArrowRight,
  Clock,
  Tag,
  ShieldCheck,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getServices, ServiceItem } from "@/lib/api";

type CategoryFilter = "all" | "preventive" | "restorative" | "cosmetic" | "emergency";

const TABS: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All Treatments" },
  { id: "preventive", label: "Preventive Care" },
  { id: "restorative", label: "Restorative" },
  { id: "cosmetic", label: "Cosmetic" },
  { id: "emergency", label: "Emergency Triage" },
];

export function Services() {
  const [activeTab, setActiveTab] = useState<CategoryFilter>("all");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const filtered =
    activeTab === "all"
      ? services
      : services.filter((s) => s.category === activeTab);

  return (
    <section id="services" className="border-t border-line bg-bone py-20 md:py-28 overflow-hidden">
      <div className="container-x space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Treatments &amp; Fee Transparency"
            title={
              <>
                A Clear Lineup of Care,
                <br />
                Priced with Honest Clarity.
              </>
            }
          />
          <div className="max-w-md space-y-2">
            <p className="text-sm leading-relaxed text-ink-soft">
              Every procedure is itemized before we begin. No unexpected billing surprises, no pressure for unnecessary cosmetic upselling, and upfront insurance verification.
            </p>
            <div className="flex items-center gap-2 text-xs text-forest dark:text-emerald-400 font-medium">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Written pre-treatment cost estimate provided chairside</span>
            </div>
          </div>
        </div>

        {/* Category Pill Tabs */}
        <div
          className="border-b border-line pb-4 flex items-center gap-2 overflow-x-auto scrollbar-none"
          role="tablist"
        >
          {TABS.map((tab) => {
            const count =
              tab.id === "all"
                ? services.length
                : services.filter((s) => s.category === tab.id).length;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? "bg-primary text-bone shadow-subtle font-semibold"
                    : "bg-cream text-ink-soft hover:text-ink hover:bg-sand/60 border border-line"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] rounded-full px-2 py-0.2 ${
                    isActive ? "bg-white/20 text-bone" : "bg-sand/60 text-ink-soft"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Loading State Skeleton */}
        {isLoading ? (
          <div className="flex flex-row overflow-x-auto snap-x snap-mandatory gap-4 py-4 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="min-w-[280px] max-w-[300px] h-72 rounded-2xl bg-cream border border-line animate-pulse p-5 shrink-0"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* Empty State */
          <Card surface="cream" shadow="subtle" className="p-12 text-center space-y-3">
            <Sparkles className="h-10 w-10 text-ink-soft/40 mx-auto" />
            <h3 className="font-display text-lg text-ink font-semibold">
              No dental treatments found in this category
            </h3>
            <p className="text-xs sm:text-sm text-ink-soft max-w-md mx-auto">
              Our clinical service catalogue updates in real time from the database. Please select another treatment category or contact our desk.
            </p>
            {activeTab !== "all" && (
              <Button onClick={() => setActiveTab("all")} variant="outline" size="sm">
                View All Treatments
              </Button>
            )}
          </Card>
        ) : (
          /* Slim & Horizontal Scrollable Row */
          <div className="flex flex-row overflow-x-auto snap-x snap-mandatory gap-4 py-4 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {filtered.map((service) => {
              return (
                <div
                  key={service.id}
                  className="min-w-[280px] max-w-[300px] snap-center shrink-0 rounded-2xl border border-line bg-cream/70 dark:bg-card/90 shadow-sm p-5 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all"
                >
                  <div className="space-y-3">
                    {/* Category Pill & Highlight Indicator */}
                    <div className="flex items-center justify-between border-b border-line/60 pb-2.5 text-xs">
                      <span className="rounded-full bg-sand/60 dark:bg-sand/20 px-2.5 py-0.5 text-[10.5px] font-semibold text-clay uppercase tracking-wider">
                        {service.category}
                      </span>
                      {service.highlight && (
                        <span className="text-[10.5px] font-semibold text-primary uppercase tracking-wide">
                          Popular
                        </span>
                      )}
                    </div>

                    <h4 className="font-display text-lg text-ink font-normal leading-snug">
                      {service.title}
                    </h4>

                    <p className="text-xs leading-relaxed text-ink-soft line-clamp-3">
                      {service.shortDesc}
                    </p>

                    {/* Duration & Cash Price */}
                    <div className="pt-2 border-t border-line/50 flex items-center justify-between text-xs text-ink-soft">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock className="h-3.5 w-3.5 text-clay" />
                        <span>{service.duration}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-ink">
                        <Tag className="h-3.5 w-3.5 text-forest dark:text-emerald-400" />
                        <span>{service.cashPrice}</span>
                      </div>
                    </div>

                    {service.insuranceNote && (
                      <p className="text-[11px] text-ink-soft/75 italic line-clamp-1">
                        {service.insuranceNote}
                      </p>
                    )}
                  </div>

                  {/* Booking Action */}
                  <div className="pt-2 border-t border-line/60">
                    <Button
                      href={`/book?service=${service.id}`}
                      variant="secondary"
                      size="sm"
                      className="w-full justify-between"
                    >
                      <span className="flex items-center gap-1.5 text-xs">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>Schedule</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default Services;
