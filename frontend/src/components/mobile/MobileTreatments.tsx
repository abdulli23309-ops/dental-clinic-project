"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, ArrowRight, ShieldCheck, Calendar } from "lucide-react";
import { ServiceItem, getServices, batchTranslate } from "@/lib/api";
import { FilterChips } from "@/components/mobile/FilterChips";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { useMobileBooking } from "@/components/mobile/MobileBookingSheet";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { useT } from "@/i18n/useT";
import { tap } from "@/lib/haptics";
import { SafeImage } from "@/components/ui/safe-image";
import { Num } from "@/i18n/Num";

function formatDuration(duration: string | number | undefined, isUrdu: boolean) {
  if (!duration) return isUrdu ? "45 منٹ" : "45 min";
  const s = String(duration).trim();
  if (isUrdu) {
    return s
      .replace(/(\d+)\s*to\s*(\d+)\s*months?/gi, "$1 سے $2 ماہ")
      .replace(/(\d+)\s*months?/gi, "$1 ماہ")
      .replace(/(\d+)\s*to\s*(\d+)\s*(?:mins?|minutes?)/gi, "$1 سے $2 منٹ")
      .replace(/(\d+)\s*(?:mins?|minutes?)/gi, "$1 منٹ")
      .replace(/\bto\b/gi, "سے")
      .replace(/\bmonths?\b/gi, "ماہ")
      .replace(/\b(?:mins?|minutes?)\b/gi, "منٹ");
  }
  return s;
}

export function MobileTreatments() {
  const { openBooking } = useMobileBooking();
  const { locale } = usePublicContent();
  const { t } = useT();
  const isUrdu = locale === "ur";
  const [services, setServices] = useState<ServiceItem[]>([]);
  const rawServicesRef = useRef<ServiceItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  const applyServiceTranslation = async (targetLocale: string, list: ServiceItem[]) => {
    if (targetLocale !== "ur" || list.length === 0) {
      setServices(list);
      return;
    }
    const texts: string[] = [];
    list.forEach((s) => {
      if (s.title) texts.push(s.title);
      if (s.shortDesc) texts.push(s.shortDesc);
      if (s.fullDesc) texts.push(s.fullDesc);
    });
    try {
      const trans = await batchTranslate(texts, "ur");
      if (trans && Object.keys(trans).length > 0) {
        setServices(
          list.map((s) => ({
            ...s,
            title: trans[s.title] || s.title,
            shortDesc: (s.shortDesc && trans[s.shortDesc]) || s.shortDesc,
            fullDesc: (s.fullDesc && trans[s.fullDesc]) || s.fullDesc,
          }))
        );
      } else {
        setServices(list);
      }
    } catch {
      setServices(list);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getServices()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          const active = data.filter((s) => s.isActive !== false);
          rawServicesRef.current = active;
          applyServiceTranslation(locale, active);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [locale]);

  useEffect(() => {
    if (rawServicesRef.current.length > 0) {
      applyServiceTranslation(locale, rawServicesRef.current);
    }
  }, [locale]);

  const categories = Array.from(
    new Set(services.map((s) => s.category).filter(Boolean))
  );

  const categoryLabels: Record<string, string> = {
    preventive: isUrdu ? "احتیاطی" : "Preventive",
    restorative: isUrdu ? "بحالی" : "Restorative",
    cosmetic: isUrdu ? "کاسمیٹک" : "Cosmetic",
    emergency: isUrdu ? "ایمرجنسی" : "Emergency",
  };

  const filterOptions = [
    { id: "all", label: isUrdu ? "تمام علاج" : "All Treatments", count: services.length },
    ...categories.map((c) => ({
      id: c,
      label: categoryLabels[c] || c.charAt(0).toUpperCase() + c.slice(1),
      count: services.filter((s) => s.category === c).length,
    })),
  ];

  const filteredServices =
    activeTab === "all"
      ? services
      : services.filter((s) => s.category === activeTab);

  const handleScroll = () => {
    if (!railRef.current) return;
    const scrollLeft = railRef.current.scrollLeft;
    const cardWidth = railRef.current.firstElementChild?.clientWidth || 300;
    const newIdx = Math.round(scrollLeft / (cardWidth + 14));
    if (newIdx !== currentIndex && newIdx >= 0 && newIdx < filteredServices.length) {
      setCurrentIndex(newIdx);
    }
  };

  const scrollToIndex = (idx: number) => {
    if (!railRef.current) return;
    const targetIdx = Math.max(0, Math.min(idx, filteredServices.length - 1));
    const cardWidth = railRef.current.firstElementChild?.clientWidth || 300;
    railRef.current.scrollTo({
      left: targetIdx * (cardWidth + 14),
      behavior: "smooth",
    });
    setCurrentIndex(targetIdx);
    tap(8);
  };

  if (services.length === 0) return null;

  return (
    <div className="py-8 px-4 md:hidden">
      {/* Section Header */}
      <div className="mb-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {isUrdu ? "طبی مہارت" : "Clinical Excellence"}
        </span>
        <h2 className="font-serif text-[28px] leading-tight font-bold text-gray-900 dark:text-white mt-1">
          {isUrdu ? " ہمیں پیش کردہ علاج" : "Treatments We Offer"}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {isUrdu ? "خصوصی منہ کی سرجری، جمالیاتی بحالی اور احتیاطی تھراپی۔" : "Specialized oral surgery, aesthetic restorations & preventative therapies."}
        </p>
      </div>

      {/* Filter Chips */}
      <FilterChips
        options={filterOptions}
        activeId={activeTab}
        onChange={(id) => {
          setActiveTab(id);
          setCurrentIndex(0);
          if (railRef.current) {
            railRef.current.scrollTo({ left: 0, behavior: "smooth" });
          }
        }}
        className="mb-4"
      />

      {/* Horizontal Snap Card Rail */}
      <div
        ref={railRef}
        onScroll={handleScroll}
        className="flex gap-3.5 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 pt-1 pb-3"
      >
        {filteredServices.map((service, idx) => {
          let displayPrice = isUrdu ? "معائنے کے بعد تخمینہ" : "Estimate Upon Visit";
          if (service.cashPrice && typeof service.cashPrice === "string") {
            const rawStr = service.cashPrice.replace(/[^0-9.]/g, "").trim();
            const num = parseFloat(rawStr);
            if (!isNaN(num) && num > 0) {
              displayPrice = isUrdu ? `شروع از Rs ${num.toLocaleString()}` : `From Rs ${num.toLocaleString()}`;
            } else if (service.cashPrice.trim().length > 0) {
              displayPrice = isUrdu
                ? service.cashPrice.replace(/\bFrom\b/gi, "شروع از").replace(/\bRs\.?\b/gi, "Rs")
                : service.cashPrice;
            }
          }

          return (
            <div
              key={service.id || service.slug}
              className="snap-center shrink-0 w-[82vw] max-w-[310px] rounded-[24px] bg-white dark:bg-[#0d1322] border border-slate-200/80 dark:border-white/10 p-4 shadow-lg flex flex-col justify-between"
            >
              {/* Card Photo & Badges */}
              <div>
                <div className="h-[180px] rounded-[18px] overflow-hidden relative bg-slate-100 dark:bg-slate-800">
                  <SafeImage
                    src={service.imageUrl || "/images/services/cleanings.jpg"}
                    alt={service.title}
                    fill
                    sizes="(max-width: 768px) 80vw, 310px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                  {/* Category Pill Floating Top-Left */}
                  <span className="absolute top-2.5 left-2.5 backdrop-blur-md bg-black/60 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full">
                    {categoryLabels[service.category?.toLowerCase()] || service.category || (isUrdu ? "جنرل" : "General")}
                  </span>

                  {/* Duration Pill Bottom-Right */}
                  <span className="absolute bottom-2.5 right-2.5 backdrop-blur-md bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3 text-primary" />
                    <span>{formatDuration(service.duration, isUrdu)}</span>
                  </span>
                </div>

                {/* Treatment Title & Description */}
                <h3 className="font-serif text-[19px] font-bold leading-snug text-slate-900 dark:text-white mt-3.5">
                  {service.title}
                </h3>
                <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-2 mt-1">
                  {service.shortDesc || service.fullDesc}
                </p>
              </div>

              {/* Card Footer: Fee & Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-300 block">
                    {isUrdu ? "ابتدائی فیس" : "Starting Fee"}
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                    {displayPrice}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      tap(8);
                      setSelectedService(service);
                    }}
                    className="h-9 px-3 rounded-xl border border-slate-200 dark:border-white/15 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {isUrdu ? "تفصیلات" : "Details"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      tap(10);
                      openBooking({ serviceId: service.id });
                    }}
                    className="h-9 px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1 shadow-sm shadow-primary/30 transition-colors cursor-pointer"
                  >
                    <span>{isUrdu ? "بک کریں" : "Book"}</span>
                    <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stepper Controls & Counter Below Rail */}
      {filteredServices.length > 1 && (
        <div className="mt-4 flex items-center justify-between pt-1">
          {/* Stepper Dots / Segmented indicator */}
          <div className="flex items-center gap-1.5">
            {filteredServices.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToIndex(i)}
                aria-label={`Go to treatment ${i + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === currentIndex
                    ? "w-6 bg-primary"
                    : "w-2 bg-slate-300 dark:bg-slate-700"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span dir="ltr" className="text-xs font-mono font-semibold text-slate-500 tabular-nums">
              {String(currentIndex + 1).padStart(2, "0")} / {String(filteredServices.length).padStart(2, "0")}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => scrollToIndex(currentIndex - 1)}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
                aria-label="Previous treatment"
              >
                <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              </button>

              <button
                type="button"
                disabled={currentIndex === filteredServices.length - 1}
                onClick={() => scrollToIndex(currentIndex + 1)}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
                aria-label="Next treatment"
              >
                <ChevronRight className="w-5 h-5 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Treatment Detail Bottom Sheet */}
      <BottomSheet
        isOpen={!!selectedService}
        onClose={() => setSelectedService(null)}
        title={selectedService?.title || (isUrdu ? "علاج کی تفصیلات" : "Treatment Details")}
        subtitle={`${selectedService?.category || (isUrdu ? "ماہرانہ نگہداشت" : "Specialist Care")} · ${selectedService?.duration || 45} ${isUrdu ? "منٹ" : "minutes"}`}
      >
        {selectedService && (
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
            {selectedService.imageUrl && (
              <div className="h-[180px] rounded-2xl overflow-hidden relative">
                <SafeImage
                  src={selectedService.imageUrl}
                  alt={selectedService.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white text-base">
                {isUrdu ? "کلینیکل جائزہ" : "Clinical Overview"}
              </h4>
              <p className="mt-1 leading-relaxed">
                {selectedService.fullDesc || selectedService.shortDesc}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-white/10">
                <span className="text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 font-semibold block">
                  {isUrdu ? "ابتدائی فیس" : "Typical Fee"}
                </span>
                <span className="text-base font-bold text-gray-900 dark:text-white tabular-nums mt-0.5 block">
                  {selectedService.cashPrice ? `روپے ${Number(selectedService.cashPrice).toLocaleString()}` : (isUrdu ? "جائزے پر منحصر" : "Upon Assessment")}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-white/10">
                <span className="text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 font-semibold block">
                  {isUrdu ? "مدت" : "Duration"}
                </span>
                <span className="text-base font-bold text-gray-900 dark:text-white tabular-nums mt-0.5 block">
                  <Num dir="ltr">{selectedService.duration || 45}</Num>{isUrdu ? " منٹ" : " Minutes"}
                </span>
              </div>
            </div>

            {selectedService.insuranceNote && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{selectedService.insuranceNote}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  tap(10);
                  const s = selectedService;
                  setSelectedService(null);
                  openBooking({ serviceId: s.id });
                }}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-md shadow-primary/30 transition-colors cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>{isUrdu ? `بک کریں ${selectedService.title}` : `Book ${selectedService.title}`}</span>
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
