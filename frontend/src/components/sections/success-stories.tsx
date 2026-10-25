"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import {
  Star,
  Quote,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicReviews, Review } from "@/lib/api";
import { usePublicContent } from "@/components/providers/public-content-provider";

export function SuccessStories() {
  const { copy } = usePublicContent();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (offset: number) => {
    scrollRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  };

  useEffect(() => {
    let mounted = true;
    getPublicReviews()
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setReviews(data.filter((r) => r.isPublished !== false));
        }
      })
      .catch(() => {
        if (mounted) setReviews([]);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Hard content rule: if no reviews exist in DB, render nothing
  if (!isLoading && reviews.length === 0) {
    return null;
  }

  // Calculate average rating
  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + (r.rating || 5), 0) / reviews.length
        ).toFixed(1)
      : "5.0";

  return (
    <section
      id="reviews"
      className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 py-20 md:py-28 overflow-hidden"
    >
      <div className="container-x space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Patient Experiences"
            title={copy.successStories}
          />

          {reviews.length > 0 && (
            <div className="inline-flex items-center gap-3 rounded-full border border-gray-200/80 dark:border-gray-800/80 bg-white/90 dark:bg-gray-900/90 px-4 py-2 shadow-xs backdrop-blur-sm">
              <div className="flex items-center gap-1 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                {avgRating} / 5.0
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
              </span>
            </div>
          )}
        </div>

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                className="h-56 rounded-3xl border border-gray-200 dark:border-gray-800"
              />
            ))}
          </div>
        ) : (
          /* Reviews Scroll Row */
          <div className="relative w-full group">
            <button
              onClick={() => scroll(-340)}
              aria-label="Previous reviews"
              className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hidden md:flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              onClick={() => scroll(340)}
              aria-label="Next reviews"
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hidden md:flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div
              ref={scrollRef}
              className="flex flex-row overflow-x-auto snap-x snap-mandatory gap-6 py-2 hide-scrollbar"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {reviews.map((rev, idx) => {
                const isGoogle = rev.sourceLabel
                  ?.toLowerCase()
                  .includes("google");

                return (
                  <motion.div
                    key={rev.id || idx}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.4, delay: idx * 0.06 }}
                    className="min-w-[300px] sm:min-w-[340px] max-w-[380px] snap-center shrink-0 rounded-3xl border border-gray-200/90 dark:border-gray-800/90 bg-white dark:bg-gray-950 p-6 sm:p-7 shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between space-y-6"
                  >
                    <div className="space-y-4">
                      {/* Top Bar: Stars & Google Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-amber-400">
                          {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-current" />
                          ))}
                        </div>

                        {/* Google badge only if source=Google */}
                        {isGoogle ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                            <span className="font-bold text-[11px] text-blue-600 dark:text-blue-400">G</span>
                            <span>Google Review</span>
                          </span>
                        ) : rev.sourceLabel ? (
                          <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-300">
                            {rev.sourceLabel}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Verified Patient</span>
                          </span>
                        )}
                      </div>

                      {/* Review Text */}
                      <p className="text-xs sm:text-[13px] leading-relaxed text-gray-700 dark:text-gray-300 line-clamp-4">
                        &ldquo;{rev.text}&rdquo;
                      </p>
                    </div>

                    {/* Author & Date Footer */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
                          {rev.authorName ? rev.authorName.charAt(0) : "P"}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-gray-900 dark:text-white">
                            {rev.authorName}
                          </span>
                          {rev.reviewDate && (
                            <span className="text-[10px] text-gray-400">
                              {rev.reviewDate}
                            </span>
                          )}
                        </div>
                      </div>

                      <Quote className="h-5 w-5 text-gray-200 dark:text-gray-800" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default SuccessStories;
