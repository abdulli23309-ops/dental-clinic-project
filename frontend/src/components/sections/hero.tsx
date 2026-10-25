"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import {
  ArrowRight,
  Phone,
  CheckCircle2,
  Star,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { getPublicReviews, getServices, Review, ServiceItem } from "@/lib/api";

function renderTwoToneHeadline(heading: string, highlightWord?: string) {
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

  // Fallback: Split words into first half (neutral) and second half (accent)
  const words = heading.split(" ");
  if (words.length <= 1) {
    return <span className="text-primary">{heading}</span>;
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

export function Hero() {
  const shouldReduceMotion = useReducedMotion();

  // Option D: Subtle premium pointer parallax with smooth spring dampening
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 26, stiffness: 140, mass: 0.4 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Subtle restrained parallax transforms (max ±12px x, ±10px y, ±2.5deg rotation)
  const toothX = useTransform(smoothX, [-0.5, 0.5], [-12, 12]);
  const toothY = useTransform(smoothY, [-0.5, 0.5], [-10, 10]);
  const toothRotate = useTransform(smoothX, [-0.5, 0.5], [-2.5, 2.5]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) return;
    if (e.pointerType === "touch") return;

    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const normalizedX = (e.clientX - rect.left) / rect.width - 0.5;
    const normalizedY = (e.clientY - rect.top) / rect.height - 0.5;

    mouseX.set(normalizedX);
    mouseY.set(normalizedY);
  };

  const handlePointerLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const { content, primaryLocation, organization, copy, locale } = usePublicContent();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentReviewIdx, setCurrentReviewIdx] = useState(0);
  const [services, setServices] = useState<ServiceItem[]>([]);

  const isUrdu = locale === "ur";
  const defaultHeading = copy.heroHeadingUr || "Not all heroes wear capes. Some wear gloves.";
  const defaultDescription =
    copy.heroDescriptionUr ||
    "We fix problems. You keep smiling. From routine checkups to complex root canals, trust our expert team in Islamabad for a fresh, confident smile.";

  const heading = isUrdu
    ? copy.heroHeadingUr
    : (content.homepage?.heroHeading?.trim() || defaultHeading);
  const description = isUrdu
    ? copy.heroDescriptionUr
    : (content.homepage?.heroDescription?.trim() || defaultDescription);
  const eyebrow = content.homepage?.heroEyebrow?.trim();
  const highlightWord = isUrdu
    ? "کچھ دستانے پہنتے ہیں"
    : (content.homepage?.heroHighlightWord?.trim() || "Some wear gloves.");
  const startingFee = content.homepage?.startingFee?.trim();
  const heroSealText = ((content.homepage as any)?.heroSealText || "").trim();

  // Load reviews and active services for testimonial card & pills
  useEffect(() => {
    let mounted = true;
    getPublicReviews()
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setReviews(data.filter((r) => r.isPublished !== false));
        }
      })
      .catch(() => {});

    getServices()
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setServices(data.filter((s) => s.isActive !== false).slice(0, 5));
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  // Section with no data is not rendered at all
  if (!heading && !description) {
    return null;
  }

  const practiceName =
    content.general?.practiceName ||
    organization?.displayName ||
    organization?.name ||
    "";
  const phone = content.general?.phone || primaryLocation?.phone || "";
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  const urduDefaultTicks = [
    "سیم ڈے ایمرجنسی کیئر",
    "درد سے پاک جدید اینستھیزیا",
    "شفاف فیس، کوئی پوشیدہ اخراجات نہیں",
  ];

  const heroTicks = isUrdu
    ? urduDefaultTicks
    : content.homepage?.heroBadges?.length
    ? content.homepage.heroBadges
    : content.homepage?.heroTicks?.map((t) => t.label) || [];

  const currentReview = reviews.length > 0 ? reviews[currentReviewIdx] : null;

  const nextReview = () => {
    if (reviews.length > 1) {
      setCurrentReviewIdx((prev) => (prev + 1) % reviews.length);
    }
  };

  const prevReview = () => {
    if (reviews.length > 1) {
      setCurrentReviewIdx((prev) => (prev - 1 + reviews.length) % reviews.length);
    }
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-28 lg:pt-20 lg:pb-32 bg-[radial-gradient(ellipse_75%_50%_at_50%_-5%,rgba(var(--color-primary-rgb,16,125,82),0.08),transparent)] dark:bg-[radial-gradient(ellipse_75%_50%_at_50%_-5%,rgba(var(--color-primary-rgb,16,125,82),0.14),transparent)]">
      <div className="container-x">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Two-Tone Copy, Badges, CTAs, Trust Ticks */}
          <div className="lg:col-span-7 space-y-6 text-start">
            {/* Practice / Eyebrow Badge */}
            {(eyebrow || practiceName) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 px-3.5 py-1 text-xs text-gray-700 dark:text-gray-300 backdrop-blur-md shadow-xs"
              >
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                {eyebrow && (
                  <span className="font-semibold text-primary uppercase tracking-wider text-[11px]">
                    {eyebrow}
                  </span>
                )}
                {eyebrow && practiceName && (
                  <span className="text-gray-300 dark:text-gray-700">|</span>
                )}
                {practiceName && <span className="font-medium">{practiceName}</span>}
              </motion.div>
            )}

            {/* Two-Tone Headline */}
            {heading && (
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.05 }}
                className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight text-gray-950 dark:text-white leading-[1.12] font-bold"
              >
                {renderTwoToneHeadline(heading, highlightWord)}
              </motion.h1>
            )}

            {/* Sub-headline description */}
            {description && (
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.12 }}
                className="max-w-xl text-base sm:text-lg leading-relaxed text-gray-600 dark:text-gray-300"
              >
                {description}
              </motion.p>
            )}

            {/* CTAs and Starting Fee Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="pt-2 flex flex-wrap items-center gap-3.5 justify-start"
            >
              <Button
                href={content.homepage?.heroCtaLink || "/book"}
                variant="primary"
                size="lg"
                className="rounded-full px-6 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                <span>{isUrdu ? copy.bookAppointment : (content.homepage?.heroCtaText || copy.bookAppointment)}</span>
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>

              {phone ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    href={`tel:${cleanPhone}`}
                    variant="outline"
                    size="lg"
                    className="rounded-full px-5 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm flex items-center gap-2"
                  >
                    <Phone className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      {copy.call} <bdi dir="ltr">{phone}</bdi>
                    </span>
                  </Button>
                  <CopyButton text={phone} label={copy.copyPhone} className="h-10 px-2.5 rounded-full" />
                </div>
              ) : null}

              {startingFee && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    {copy.treatmentsFrom} {startingFee}
                  </span>
                </div>
              )}
            </motion.div>

            {/* Active Service Pills */}
            {services.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.28 }}
                className="pt-2 flex flex-wrap items-center gap-2"
                aria-label={copy.popular}
              >
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-1 rtl:ml-1 rtl:mr-0">
                  {copy.popular}
                </span>
                {services.map((svc) => (
                  <Link
                    key={svc.id}
                    href="/#treatments"
                    className="rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 px-3 py-1 text-xs text-gray-700 dark:text-gray-300 hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    {svc.title}
                  </Link>
                ))}
              </motion.div>
            )}

            {/* Trust Ticks */}
            {heroTicks.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.35 }}
                className="pt-6 border-t border-gray-200/80 dark:border-gray-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600 dark:text-gray-300"
              >
                {heroTicks.map((tick, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>{tick}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Right Column: Tooth Visual with Subtle Float Animation & Rotating Seal & Mini Testimonial */}
          <div className="lg:col-span-5 relative flex items-center justify-center min-h-[420px] sm:min-h-[480px]">
            {/* Visual Glass Podium Background Glow */}
            <div
              className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-primary/10 via-amber-200/10 to-transparent blur-2xl pointer-events-none"
              aria-hidden="true"
            />

            {/* Tooth Image with Glass Container */}
            <div
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              className="relative w-full aspect-square max-w-[460px] flex items-center justify-center rounded-3xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60 bg-gradient-to-b from-white/90 via-gray-50/70 to-gray-100/60 dark:from-gray-900/90 dark:via-gray-950/70 dark:to-gray-900/60 shadow-xl backdrop-blur-md"
            >
              <motion.div
                animate={shouldReduceMotion ? undefined : { y: [0, -8, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-full h-full flex items-center justify-center p-4"
              >
                <motion.div
                  style={
                    shouldReduceMotion
                      ? undefined
                      : {
                          x: toothX,
                          y: toothY,
                          rotate: toothRotate,
                        }
                  }
                  className="w-full h-full flex items-center justify-center"
                >
                  <Image
                    src="/images/tooth-hero.png"
                    alt="Professional anatomical tooth model illustrating dental care quality"
                    priority
                    width={460}
                    height={460}
                    className="w-full h-full object-contain select-none pointer-events-none"
                  />
                </motion.div>
              </motion.div>

              {/* Rotating Dental Seal Badge: only shown if heroSealText is configured */}
              {heroSealText ? (
                <div
                  className="absolute top-4 right-4 z-20 pointer-events-none select-none"
                  aria-hidden="true"
                >
                  <div className="relative w-24 h-24">
                    <svg
                      viewBox="0 0 120 120"
                      className="w-full h-full animate-[spin_24s_linear_infinite]"
                    >
                      <path
                        id="seal-curve"
                        d="M 60, 60 m -45, 0 a 45,45 0 1,1 90,0 a 45,45 0 1,1 -90,0"
                        fill="none"
                      />
                      <text className="text-[10.5px] uppercase font-bold tracking-[0.22em] fill-gray-700 dark:fill-gray-300">
                        <textPath href="#seal-curve" startOffset="0%">
                          {heroSealText}
                        </textPath>
                      </text>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 shadow-md border border-amber-300/60 dark:border-amber-400/30 flex items-center justify-center text-primary">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Floating Testimonial Mini-Card */}
              {currentReview && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="absolute bottom-4 left-4 right-4 z-20 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white/95 dark:bg-gray-900/95 p-3.5 shadow-lg backdrop-blur-md"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: currentReview.rating || 5 }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                    {reviews.length > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={prevReview}
                          className="p-1 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                          aria-label="Previous review"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {currentReviewIdx + 1}/{reviews.length}
                        </span>
                        <button
                          onClick={nextReview}
                          className="p-1 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                          aria-label="Next review"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed">
                    &ldquo;{currentReview.text}&rdquo;
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {currentReview.authorName}
                    </span>
                    {currentReview.sourceLabel && (
                      <span className="text-[10px] uppercase tracking-wider text-primary font-medium">
                        {currentReview.sourceLabel}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
