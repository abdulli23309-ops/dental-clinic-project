"use client";

import React, { useState, useRef } from "react";
import { Star, CheckCircle2, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { Review } from "@/lib/api";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { useT } from "@/i18n/useT";
import { Num } from "@/i18n/Num";
import { tap } from "@/lib/haptics";

interface MobileSuccessStoriesProps {
  reviews: Review[];
  avgRating: string;
}

export function MobileSuccessStories({ reviews, avgRating }: MobileSuccessStoriesProps) {
  const { locale } = usePublicContent();
  const { t } = useT();
  const isUrdu = locale === "ur";
  const [currentIndex, setCurrentIndex] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  if (!reviews || reviews.length === 0) return null;

  const handleScroll = () => {
    if (!railRef.current) return;
    const scrollLeft = railRef.current.scrollLeft;
    const cardWidth = railRef.current.firstElementChild?.clientWidth || 300;
    const newIdx = Math.round(scrollLeft / (cardWidth + 14));
    if (newIdx !== currentIndex && newIdx >= 0 && newIdx < reviews.length) {
      setCurrentIndex(newIdx);
    }
  };

  const scrollToIndex = (idx: number) => {
    if (!railRef.current) return;
    const targetIdx = Math.max(0, Math.min(idx, reviews.length - 1));
    const cardWidth = railRef.current.firstElementChild?.clientWidth || 300;
    railRef.current.scrollTo({
      left: targetIdx * (cardWidth + 14),
      behavior: "smooth",
    });
    setCurrentIndex(targetIdx);
    tap(8);
  };

  return (
    <div className="py-8 px-4 md:hidden">
      {/* Header */}
      <div className="mb-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {isUrdu ? "مریضوں کے تاثرات" : "Patient Testimonials"}
        </span>
        <h2 className="font-serif text-[28px] leading-tight font-bold text-gray-900 dark:text-white mt-1">
          {isUrdu ? "کامیاب کہانیاں" : "Success Stories"}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {isUrdu ? "ہمارے تمام برانچز میں علاج یافتہ مریضوں کے اصلی کلینیکل جائزے۔" : "Authentic clinical reviews from patients treated across our branches."}
        </p>
      </div>

      {/* 4.9 ★ Rating Summary Pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#0d1322] border border-slate-200/80 dark:border-white/10 shadow-xs mb-4">
        <div className="flex items-center text-amber-500">
          <Star className="w-3.5 h-3.5 fill-current" />
          <span className="text-xs font-bold text-gray-900 dark:text-white ml-1 tabular-nums">
            {avgRating}
          </span>
        </div>
        <span className="text-slate-300 dark:text-slate-700 select-none">•</span>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {reviews.length}+ {isUrdu ? "تصدیق شدہ تبدیلیاں" : "Verified Transformations"}
        </span>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
      </div>

      {/* Horizontal Snap Review Rail */}
      <div
        ref={railRef}
        onScroll={handleScroll}
        className="flex gap-3.5 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 pt-1 pb-2"
      >
        {reviews.map((rev, idx) => (
          <div
            key={rev.id || idx}
            className="snap-center shrink-0 w-[82vw] max-w-[310px] rounded-[24px] bg-white dark:bg-[#0d1322] border border-slate-200/80 dark:border-white/10 p-5 shadow-sm flex flex-col justify-between"
          >
            <div>
              {/* Star Rating & Quote Icon */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-0.5 text-amber-500">
                  {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <Quote className="w-5 h-5 text-primary/30" />
              </div>

              {/* Review Text */}
              <p className="text-[13.5px] leading-relaxed text-slate-700 dark:text-slate-200 line-clamp-4 italic">
                &ldquo;{rev.text}&rdquo;
              </p>
            </div>

            {/* Author Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
              <div>
                <h4 className="font-serif text-sm font-bold text-gray-900 dark:text-white">
                  {rev.authorName}
                </h4>
                {rev.reviewDate && (
                  <p className="text-[11px] text-primary font-medium">
                    {rev.reviewDate}
                  </p>
                )}
              </div>

              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                {isUrdu ? "مصدقہ مریض" : "Verified Visit"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Stepper Dots & Navigation Controls */}
      {reviews.length > 1 && (
        <div className="mt-4 flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            {reviews.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToIndex(i)}
                aria-label={`Go to review ${i + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === currentIndex ? "w-6 bg-primary" : "w-1.5 bg-slate-300 dark:bg-slate-700"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => scrollToIndex(currentIndex - 1)}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
              aria-label="Previous review"
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </button>

            <button
              type="button"
              disabled={currentIndex === reviews.length - 1}
              onClick={() => scrollToIndex(currentIndex + 1)}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
              aria-label="Next review"
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
