"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, HeartPulse, UserCheck, Sparkles, CheckCircle2, Calendar, Clock, ArrowRight } from "lucide-react";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { useT } from "@/i18n/useT";
import { Num } from "@/i18n/Num";
import { tap } from "@/lib/haptics";

export function MobileWhyChooseUs() {
  const { content, organization, locale } = usePublicContent();
  const { t } = useT();
  const isUrdu = locale === "ur";
  const practiceName = content.general?.practiceName || organization?.displayName || (isUrdu ? "حرا ڈینٹل کلینک" : "DHDC");

  const pillars = [
    {
      icon: ShieldCheck,
      title: isUrdu ? "کوئی غیر متوقع فیس نہیں" : "Zero Surprise Fees",
      desc: isUrdu ? "پیشگی واضح اور شفاف تخمینے" : "Transparent estimates upfront",
    },
    {
      icon: HeartPulse,
      title: isUrdu ? "کم سے کم جراحی" : "Minimally Invasive",
      desc: isUrdu ? "قدرتی دانتوں کی ساخت کا تحفظ" : "Preserving natural tooth enamel",
    },
    {
      icon: UserCheck,
      title: isUrdu ? "مستقل معالج" : "Doctor Continuity",
      desc: isUrdu ? "ہر وزٹ پر ایک ہی تجربہ کار ڈاکٹر" : "Same specialist across visits",
    },
    {
      icon: Sparkles,
      title: isUrdu ? "ہسپتال گریڈ سٹرلائزیشن" : "Hospital Sterilization",
      desc: isUrdu ? "پی ایم ڈی سی کے معیارات کے عین مطابق" : "PMDC compliant hygiene suites",
    },
  ];

  const steps = [
    {
      num: <Num dir="ltr">01</Num>,
      title: isUrdu ? "علاج منتخب کریں" : "Choose Treatment",
      desc: isUrdu ? "باقاعدہ صفائی، دانتوں کی خوبصورتی، یا ماہرانہ معالجے کا انتخاب کریں۔" : "Select routine cleaning, cosmetic smile design, or specialist care.",
      icon: Sparkles,
    },
    {
      num: <Num dir="ltr">02</Num>,
      title: isUrdu ? "ڈاکٹر اور وقت منتخب کریں" : "Pick Doctor & Time",
      desc: isUrdu ? "اسلام آباد، لاہور اور کراچی میں ڈاکٹرز کے دستیاب اوقات دیکھیں۔" : "View live clinician schedules across Islamabad, Lahore & Karachi.",
      icon: Calendar,
    },
    {
      num: <Num dir="ltr">03</Num>,
      title: isUrdu ? "فوری تصدیق" : "Instant Confirmation",
      desc: isUrdu ? "فوری کنفرمیشن، ایس ایم ایس یاد دہانی اور لوکیشن آپ کے فون پر۔" : "Real-time calendar invite, SMS reminder & directions sent to your phone.",
      icon: Clock,
    },
  ];

  return (
    <div className="py-8 px-4 md:hidden">
      {/* Header */}
      <div className="mb-5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {isUrdu ? "طبی فلسفہ" : "Clinical Philosophy"}
        </span>
        <h2 className="font-serif text-[28px] leading-tight font-bold text-gray-900 dark:text-white mt-1">
          {isUrdu ? `آپ کے لیے ${practiceName} ہی کیوں؟` : `Why Choose ${practiceName}`}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {isUrdu ? "مریض کے آرام، شفاف فیس اور دیرپا صحت کے گرد ڈیزائن کیا گیا۔" : "Designed around patient comfort, transparent fees & lasting health."}
        </p>
      </div>

      {/* 1. 2x2 Icon-Chip Grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-8">
        {pillars.map((p, i) => {
          const Icon = p.icon;
          return (
            <div
              key={i}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#0d1322] border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between h-[115px]"
            >
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif text-[14px] font-bold text-gray-900 dark:text-white leading-tight">
                  {p.title}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  {p.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Vertical Connected Stepper */}
      <div className="rounded-[26px] bg-white dark:bg-[#0d1322] border border-slate-200/80 dark:border-white/10 p-5 shadow-sm">
        <span className="text-[10px] uppercase font-bold tracking-wider text-primary block mb-1">
          {isUrdu ? "آسان مریض کا سفر" : "Effortless Patient Journey"}
        </span>
        <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white mb-4">
          {isUrdu ? "آپ کا معائنہ کیسے عمل میں آتا ہے" : "How Your Visit Works"}
        </h3>

        <div className="relative pl-6 rtl:pl-0 rtl:pr-6 space-y-5 before:absolute before:left-2.5 rtl:before:left-auto rtl:before:right-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-primary/20 dark:before:bg-primary/30">
          {steps.map((st, i) => (
            <div key={i} className="relative">
              {/* Stepper Dot */}
              <div className="absolute -left-6 rtl:left-auto rtl:-right-6 top-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground font-mono text-[10px] font-bold flex items-center justify-center shadow-xs ring-4 ring-white dark:ring-[#0d1322]">
                <Num dir="ltr">{i + 1}</Num>
              </div>

              <div>
                <h4 className="font-serif text-sm font-bold text-gray-900 dark:text-white">
                  {st.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {st.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/10">
          <Link
            href="/book"
            onClick={() => tap(10)}
            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm shadow-primary/30 transition-colors"
          >
            <span>{isUrdu ? "ابتدائی مشاورت بک کریں" : "Book Initial Consultation"}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}
