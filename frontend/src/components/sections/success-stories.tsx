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
      className="border-t border-gray-200 dark:border-gray-800 bg-[#FAF9F5] dark:bg-gray-900/40 py-28 md:py-36 overflow-hidden"
    >
      <div className="container-x space-y-14 lg:space-y-16">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Patient Experiences"
            title={copy.successStories || "Success Stories"}
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
        ) : reviews.length === 0 ? (
          /* Designed Luxury Empty State as explicitly mandated */
          <div className="rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-950/60 p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-500">
              <Star className="h-6 w-6 fill-current" />
            </div>
            <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white">
              No reviews yet
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
              Patient reviews and clinical testimonials will be showcased here once verified by our clinic team.
            </p>
          </div>
        ) : (
          /* 3-Column Glass Review Cards Grid & Scroll */
          <div className="relative w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    className="rounded-3xl border border-gray-200/90 dark:border-gray-800/90 bg-white/80 dark:bg-[#070D0B]/85 backdrop-blur-md p-6 sm:p-7 shadow-xs hover:border-emerald-500/40 hover:shadow-xl transition-all flex flex-col justify-between space-y-6"
                  >
                    <div className="space-y-4">
                      {/* Top Bar: 5 Gold Stars & Verified Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-amber-400">
                          {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-current" />
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isGoogle && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                              <span className="font-bold text-[11px] text-blue-600 dark:text-blue-400">G</span>
                              <span>Google Review</span>
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-600/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Verified</span>
                          </span>
                        </div>
                      </div>

                      {/* Review Text */}
                      <p className="text-xs sm:text-[13px] leading-relaxed text-gray-700 dark:text-gray-300 line-clamp-4">
                        &ldquo;{rev.text}&rdquo;
                      </p>
                    </div>

                    {/* Author & Date Footer */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase">
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
