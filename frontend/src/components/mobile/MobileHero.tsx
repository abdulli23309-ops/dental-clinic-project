"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Phone, Sparkles, CheckCircle2, ShieldCheck, Stethoscope } from "lucide-react";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { resolveMediaUrl } from "@/lib/api";
import { useMobileBooking } from "@/components/mobile/MobileBookingSheet";
import { useT } from "@/i18n/useT";
import { tap } from "@/lib/haptics";

function renderHeadline(heading: string, highlightWord?: string) {
  if (highlightWord && highlightWord.trim()) {
    const escaped = highlightWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = heading.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlightWord.toLowerCase() ? (
            <span key={i} className="text-primary italic">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  }

  const words = heading.split(" ");
  if (words.length <= 1) {
    return <span className="text-primary italic">{heading}</span>;
  }
  const mid = Math.ceil(words.length / 2);
  const firstHalf = words.slice(0, mid).join(" ");
  const secondHalf = words.slice(mid).join(" ");

  return (
    <>
      <span>{firstHalf} </span>
      <span className="text-primary italic">{secondHalf}</span>
    </>
  );
}

export function MobileHero() {
  const { content, primaryLocation, organization, copy, locale } = usePublicContent();
  const { openBooking } = useMobileBooking();
  const { t } = useT();
  const isUrdu = locale === "ur";

  const practiceName =
    content.general?.practiceName ||
    organization?.displayName ||
    organization?.name ||
    (isUrdu ? "حرا ڈینٹل کلینک" : "Hira Dental Clinic");

  const heroObj = (content as any).hero || content.homepage || {};
  const heading = isUrdu
    ? (heroObj.headline || heroObj.heroHeading || "اسلام آباد میں عالمی معیار کی جدید ڈینٹسٹری").trim()
    : (heroObj.headline || heroObj.heroHeading || practiceName || "").trim();
  const description = isUrdu
    ? (heroObj.subheadline || heroObj.heroDescription || "مریض کے آرام، شفاف فیس اور دیرپا نتائج کے لیے جدید اور کم سے کم جراحی والی دانتوں کی دیکھ بھال کا تجربہ کریں۔").trim()
    : (heroObj.subheadline || heroObj.heroDescription || organization?.description || "Experience minimally invasive, technology-driven oral healthcare designed around patient comfort and lasting clinical outcomes.").trim();

  const heroImageRaw = (heroObj.image || heroObj.heroImageUrl || "").trim();
  const heroImage = heroImageRaw
    ? resolveMediaUrl(heroImageRaw)
    : "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80";

  const highlightWord = (heroObj.heroHighlightWord || (isUrdu ? "اسلام آباد" : "Islamabad")).trim();
  const startingFee = (heroObj.startingFee || "Rs. 3,500").trim();
  const phone = content.general?.phone || primaryLocation?.phone || organization?.contactPhone || "";
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  const heroTicks = heroObj.heroBadges?.length
    ? heroObj.heroBadges
    : heroObj.heroTicks?.map((t: any) => t.label || t) || [
        isUrdu ? "جراثیم کشی کے پروٹوکولز" : "Sterilization Protocols",
        isUrdu ? "کم شعاعوں والے ڈیجیٹل ایکسرے" : "Digital Low-Dose X-Rays",
        isUrdu ? "درد سے پاک انفیلتریشن" : "Painless Infiltration",
      ];

  const eyebrowText = isUrdu
    ? `${practiceName} | ${heroObj.heroEyebrow || "مصدقہ طبی معیار اور ہمدردی"}`
    : (heroObj.heroEyebrow && heroObj.heroEyebrow.trim()) || `${practiceName} · Dental Care`;

  return (
    <section className="pt-2 pb-5 px-4 md:hidden">
      {/* 1. Eyebrow Pill */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold uppercase tracking-[0.12em] max-w-full">
        <Sparkles className="w-3 h-3 text-primary shrink-0" />
        <span className="truncate">{eyebrowText}</span>
      </div>

      {/* 2. H1 Headline */}
      <h1 className="font-serif text-[30px] leading-[35px] tracking-[-0.02em] font-bold text-gray-900 dark:text-white mt-2 text-balance">
        {renderHeadline(heading, highlightWord)}
      </h1>

      {/* 3. Sub-copy */}
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-2">
        {description}
      </p>

      {/* 4. Compact Arch Visual Collage */}
      <div className="h-[min(200px,24dvh)] mt-3 relative w-full select-none">
        <div className="h-full w-full rounded-t-[999px] rounded-b-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-lg bg-slate-100 dark:bg-slate-900 relative">
          <img
            src={heroImage || "/images/hero-smile.webp"}
            alt={practiceName}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        {/* Floating 3D Tooth badge */}
        <div className="w-12 h-12 rounded-2xl backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border border-white/30 shadow-lg p-1.5 absolute -bottom-2 left-3 flex items-center justify-center">
          <Image
            src="/images/tooth-hero.png"
            alt="Clinical Tooth Model"
            width={38}
            height={38}
            className="object-contain"
          />
        </div>

        {/* Verified Dental Care Pill */}
        <div className="absolute -bottom-2 right-3 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 text-[10px] font-bold uppercase tracking-wider text-primary dark:text-primary-foreground border border-primary/30 px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span>{isUrdu ? "مصدقہ طبی معیار" : "Verified Care"}</span>
        </div>
      </div>

      {/* 5. Thumb-Zone CTAs */}
      <div className="mt-5 space-y-2">
        <button
          type="button"
          onClick={() => {
            tap(10);
            openBooking();
          }}
          className="w-full h-[52px] rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg shadow-primary/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer"
        >
          <span>{copy.bookAppointment || "Book an Appointment"}</span>
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          <a
            href={`tel:${cleanPhone}`}
            onClick={() => tap(8)}
            className="h-11 rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-900/80 text-xs font-semibold text-gray-900 dark:text-white flex items-center justify-center gap-1.5 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-primary" />
            <span>{isUrdu ? "کلینک کال کریں" : "Call Clinic"}</span>
          </a>

          <a
            href="#treatments"
            onClick={() => tap(8)}
            className="h-11 rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-900/80 text-xs font-semibold text-gray-900 dark:text-white flex items-center justify-center gap-1.5 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
          >
            <Stethoscope className="w-3.5 h-3.5 text-primary" />
            <span>{isUrdu ? "علاج" : "Treatments"}</span>
          </a>
        </div>
      </div>

      {/* 6. Horizontal Snap Trust Strip */}
      <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar snap-x -mx-4 px-4 py-1">
        {heroTicks.map((tick: string, i: number) => (
          <div
            key={i}
            className="shrink-0 snap-start flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="whitespace-nowrap">{tick}</span>
          </div>
        ))}

        {startingFee && (
          <div className="shrink-0 snap-start flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="whitespace-nowrap">{isUrdu ? `روپے ${startingFee} سے` : `From ${startingFee}`}</span>
          </div>
        )}
      </div>
    </section>
  );
}
