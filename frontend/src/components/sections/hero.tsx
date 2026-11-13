"use client";

import React from "react";
import Image from "next/image";
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
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { SafeImage } from "@/components/ui/safe-image";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { resolveMediaUrl } from "@/lib/api";
import { MobileHero } from "@/components/mobile/MobileHero";

function renderTwoToneHeadline(heading: string, highlightWord?: string) {
  if (highlightWord && highlightWord.trim()) {
    const escaped = highlightWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = heading.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlightWord.toLowerCase() ? (
            <span
              key={i}
              className="text-primary italic"
            >
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  }

  // Split words into first half and last phrase
  const words = heading.split(" ");
  if (words.length <= 1) {
    return (
      <span className="text-primary italic">
        {heading}
      </span>
    );
  }
  const mid = Math.ceil(words.length / 2);
  const firstHalf = words.slice(0, mid).join(" ");
  const secondHalf = words.slice(mid).join(" ");

  return (
    <>
      <span>{firstHalf} </span>
      <span className="text-primary italic">
        {secondHalf}
      </span>
    </>
  );
}

export function Hero() {
  const shouldReduceMotion = useReducedMotion();

  // Pointer parallax with smooth spring dampening for desktop
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

  const { content, primaryLocation, organization, copy, locale, isLoading } = usePublicContent();

  const isUrdu = locale === "ur";
  const practiceName =
    content.general?.practiceName ||
    organization?.displayName ||
    organization?.name ||
    "";
  const phone = content.general?.phone || primaryLocation?.phone || "";
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  const heroObj = (content as any).hero || content.homepage || {};
  const heading = isUrdu
    ? (heroObj.headline || heroObj.heroHeading || "اسلام آباد میں عالمی معیار کی جدید ڈینٹسٹری").trim()
    : (heroObj.headline || heroObj.heroHeading || practiceName || "").trim();
  const description = isUrdu
    ? (heroObj.subheadline || heroObj.heroDescription || "مریض کے آرام، شفاف فیس اور دیرپا نتائج کے لیے جدید اور کم سے کم جراحی والی دانتوں کی دیکھ بھال کا تجربہ کریں۔").trim()
    : (heroObj.subheadline || heroObj.heroDescription || organization?.description || organization?.tagline || "").trim();
  const heroImageRaw = (heroObj.image || heroObj.heroImageUrl || "").trim();
  const heroImage = heroImageRaw ? resolveMediaUrl(heroImageRaw) : "";
  const eyebrow = isUrdu
    ? (heroObj.heroEyebrow || "مصدقہ طبی معیار اور ہمدردی").trim()
    : (heroObj.heroEyebrow || (heading ? practiceName : "")).trim();
  const highlightWord = isUrdu
    ? (heroObj.heroHighlightWord || "اسلام آباد").trim()
    : (heroObj.heroHighlightWord || "").trim();
  const startingFee = (heroObj.startingFee || "").trim();
  const heroSealText = ((heroObj as any)?.heroSealText || "").trim();

  // Section with no data is not rendered once loading is complete
  if (!isLoading && !heading && !description) {
    return null;
  }

  const heroTicks = heroObj.heroBadges?.length
    ? heroObj.heroBadges
    : heroObj.heroTicks?.map((t: any) => t.label || t) || [];

  /**
   * Helper component to render the premium arch visual frame.
   * On mobile, it is compact and fits above the fold.
   * On desktop, it renders the spacious luxury cylinder composition.
   */
  const renderArchVisual = (variant: "mobile" | "desktop") => {
    const isMobileVariant = variant === "mobile";
    const sealCurveId = isMobileVariant ? "seal-curve-mobile" : "seal-curve-desktop";

    return (
      <div
        className={
          isMobileVariant
            ? "relative w-full flex items-center justify-center py-2 select-none"
            : "relative w-full flex items-center justify-center select-none"
        }
      >
        {/* Visual Background Glow */}
        <div
          className={
            isMobileVariant
              ? "absolute -inset-2 rounded-full bg-gradient-to-tr from-primary/15 via-amber-200/10 to-transparent blur-2xl pointer-events-none"
              : "absolute -inset-4 rounded-full bg-gradient-to-tr from-primary/15 via-amber-200/10 to-transparent blur-3xl pointer-events-none"
          }
          aria-hidden="true"
        />

        {/* Arch-shaped Photo Frame */}
        <div
          onPointerMove={!isMobileVariant ? handlePointerMove : undefined}
          onPointerLeave={!isMobileVariant ? handlePointerLeave : undefined}
          className={
            isMobileVariant
              ? "relative w-full max-w-[270px] xs:max-w-[310px] aspect-[4/5] rounded-t-[135px] xs:rounded-t-[155px] rounded-b-2xl overflow-hidden shadow-xl border-3 xs:border-4 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-800 group"
              : "relative w-full max-w-[340px] sm:max-w-[420px] min-h-[360px] sm:min-h-[420px] aspect-[4/5] rounded-t-[170px] sm:rounded-t-[200px] rounded-b-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-800 group"
          }
        >
          <SafeImage
            src={heroImage}
            alt={heading || practiceName || "Modern dental clinic treatment suite"}
            fallbackInitials={practiceName ? practiceName.slice(0, 2).toUpperCase() : "DC"}
            fallbackSubtitle={practiceName}
            priority={true}
            width={isMobileVariant ? 320 : 420}
            height={isMobileVariant ? 400 : 525}
            sizes={
              isMobileVariant
                ? "(max-width: 480px) 310px, 340px"
                : "(max-width: 640px) 340px, (max-width: 1024px) 50vw, 420px"
            }
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />

          {/* Rotating Dental Seal Badge */}
          {heroSealText ? (
            <div
              className={
                isMobileVariant
                  ? "absolute top-2.5 right-2.5 z-20 pointer-events-none select-none"
                  : "absolute top-3 right-3 sm:top-4 sm:right-4 z-20 pointer-events-none select-none"
              }
              aria-hidden="true"
            >
              <div
                className={
                  isMobileVariant
                    ? "relative w-16 h-16 xs:w-18 xs:h-18"
                    : "relative w-20 h-20 sm:w-24 sm:h-24"
                }
              >
                <svg
                  viewBox="0 0 120 120"
                  className="w-full h-full animate-[spin_24s_linear_infinite]"
                >
                  <path
                    id={sealCurveId}
                    d="M 60, 60 m -45, 0 a 45,45 0 1,1 90,0 a 45,45 0 1,1 -90,0"
                    fill="none"
                  />
                  <text className="text-[10.5px] uppercase font-bold tracking-[0.22em] fill-white dark:fill-gray-200 drop-shadow-sm">
                    <textPath href={`#${sealCurveId}`} startOffset="0%">
                      {heroSealText}
                    </textPath>
                  </text>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={
                      isMobileVariant
                        ? "w-7 h-7 xs:w-8 xs:h-8 rounded-full bg-white/90 dark:bg-gray-900/90 shadow-md border border-amber-300/60 dark:border-amber-400/30 flex items-center justify-center text-primary backdrop-blur-sm"
                        : "w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 dark:bg-gray-900/90 shadow-md border border-amber-300/60 dark:border-amber-400/30 flex items-center justify-center text-primary backdrop-blur-sm"
                    }
                  >
                    <ShieldCheck className={isMobileVariant ? "h-3.5 w-3.5" : "h-4 w-4 sm:h-5 sm:w-5"} />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* The Floating Tooth with glass badge */}
        <div
          className={
            isMobileVariant
              ? "absolute -bottom-3 -left-2 xs:-left-3 w-28 h-28 xs:w-34 xs:h-34 z-30 pointer-events-none"
              : "absolute -bottom-4 -left-2 sm:-bottom-6 sm:-left-8 w-36 h-36 sm:w-52 sm:h-52 z-30 pointer-events-none"
          }
        >
          <motion.div
            initial={{ y: 0 }}
            animate={shouldReduceMotion ? undefined : { y: [0, -10, 0] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            suppressHydrationWarning
            className="w-full h-full flex items-center justify-center filter drop-shadow-[0_20px_25px_rgba(0,0,0,0.3)]"
          >
            <motion.div
              initial={{ rotate: 0, x: 0, y: 0 }}
              style={
                shouldReduceMotion || isMobileVariant
                  ? undefined
                  : {
                      x: toothX,
                      y: toothY,
                      rotate: toothRotate,
                    }
              }
              suppressHydrationWarning
              className="w-full h-full flex items-center justify-center relative filter drop-shadow-2xl"
            >
              <Image
                src="/images/tooth-hero.png"
                priority
                alt="Professional anatomical tooth model illustrating dental care quality"
                width={isMobileVariant ? 140 : 220}
                height={isMobileVariant ? 140 : 220}
                className="w-full h-full object-contain select-none pointer-events-none relative z-10"
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Trust Card: Next Available Appointment */}
        <div
          className={
            isMobileVariant
              ? "absolute bottom-1.5 right-1.5 xs:bottom-2 xs:right-2 z-30 max-w-[150px] xs:max-w-[165px] rounded-xl border border-white/80 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-2.5 py-1.5 xs:px-3 xs:py-2 shadow-lg flex items-center gap-1.5 xs:gap-2"
              : "absolute bottom-2 right-2 sm:-bottom-4 sm:right-2 z-30 max-w-[170px] sm:max-w-none rounded-2xl border border-white/80 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-xl flex items-center gap-2"
          }
        >
          <span className="relative flex h-2 w-2 xs:h-2.5 xs:w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 xs:h-2.5 xs:w-2.5 bg-emerald-500"></span>
          </span>
          <div className="text-start min-w-0">
            <p className="text-[9px] xs:text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 leading-none mb-0.5 xs:mb-1 truncate">
              {copy.nextAvailable}
            </p>
            <p className="text-[11px] xs:text-xs font-bold text-gray-950 dark:text-white leading-none whitespace-nowrap truncate">
              {copy.todayTime}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="md:hidden w-full">
        <MobileHero />
      </div>

      <div className="max-md:hidden w-full">
        <section className="relative overflow-hidden pt-4 pb-12 sm:pt-8 sm:pb-16 md:pt-24 md:pb-36 lg:pt-28 lg:pb-40">
      {/* Refined Luxury Top Ambient Theme Shade beneath Navbar (Dynamically reflects Admin's chosen theme color) */}
      <div
        className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-primary/[0.08] via-primary/[0.03] to-transparent pointer-events-none z-0"
        aria-hidden="true"
      />
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[360px] rounded-full bg-primary/[0.09] dark:bg-primary/[0.14] blur-[110px] pointer-events-none z-0"
        aria-hidden="true"
      />
      <div className="container-x relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-16 items-center">
          {/* Left Column: Strict Single-Edge Alignment, Generous Spacing on Desktop, Tight on Mobile */}
          <div className="lg:col-span-7 flex flex-col items-start text-start space-y-3.5 xs:space-y-4 sm:space-y-6 md:space-y-10">
            {/* Practice / Eyebrow Badge (Single line presentation, never wraps, visually secondary practice name) */}
            {(eyebrow || practiceName) ? (
              <div
                className="inline-flex items-center gap-1.5 xs:gap-2 rounded-full border border-gray-200/70 dark:border-gray-800/70 bg-gray-50/90 dark:bg-gray-900/70 px-2.5 xs:px-3.5 py-1 text-xs text-gray-600 dark:text-gray-400 backdrop-blur-md max-w-full"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary/80 shrink-0" />
                {eyebrow && (
                  <span className="font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px] xs:text-[11px] truncate">
                    {eyebrow}
                  </span>
                )}
                {eyebrow && practiceName && (
                  <span className="text-gray-300 dark:text-gray-700 shrink-0 select-none">|</span>
                )}
                {practiceName && (
                  <span className="font-medium text-gray-500 dark:text-gray-400 text-[10px] xs:text-[11px] truncate">
                    {practiceName}
                  </span>
                )}
              </div>
            ) : null}

            {/* Dominant Headline (One Strong Dominant Element with High Contrast) */}
            {heading ? (
              <h1
                className="font-display text-[1.75rem] xs:text-3xl sm:text-5xl lg:text-6xl tracking-tight text-gray-950 dark:text-white leading-[1.15] sm:leading-[1.12] font-bold"
              >
                {renderTwoToneHeadline(heading, highlightWord)}
              </h1>
            ) : null}

            {/* Sub-headline description */}
            {description ? (
              <p
                className="max-w-xl text-xs xs:text-sm sm:text-lg leading-relaxed text-gray-600 dark:text-gray-300 line-clamp-3 sm:line-clamp-none"
              >
                {description}
              </p>
            ) : null}

            {/* CTAs and Starting Fee Badge */}
            <div
              className="pt-0.5 sm:pt-2 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-4 justify-start w-full sm:w-auto"
            >
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById("why-us");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth" });
                  } else {
                    window.location.href = heroObj.heroCtaLink || "/book";
                  }
                }}
                variant="primary"
                size="lg"
                className="w-full sm:w-auto rounded-full px-7 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer h-12 xs:h-13 sm:h-auto py-3.5 sm:py-3 text-sm font-semibold"
              >
                <span>{isUrdu ? copy.bookAppointment : (heroObj.heroCtaText || copy.bookAppointment || "Book an Appointment")}</span>
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>

              {/* Secondary Call & Copy Phone Row: Phone Number is NEVER truncated at any mobile width */}
              {phone ? (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.clipboard) {
                        navigator.clipboard.writeText(phone);
                        toast.success(`Copied phone: ${phone}`);
                      }
                      window.location.href = `tel:${cleanPhone}`;
                    }}
                    variant="outline"
                    size="lg"
                    className="flex-1 sm:flex-initial rounded-full px-3 xs:px-4 sm:px-5 py-2.5 sm:py-3 text-[12px] xs:text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 xs:gap-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer whitespace-nowrap min-w-0 shadow-2xs"
                  >
                    <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="whitespace-nowrap font-medium">
                      {copy.call || "Call"} <bdi dir="ltr">{phone}</bdi>
                    </span>
                  </Button>
                  <CopyButton
                    text={phone}
                    label={copy.copyPhone || "Copy"}
                    className="shrink-0 h-10 sm:h-11 px-3 sm:px-3.5 rounded-full justify-center text-xs"
                  />
                </div>
              ) : null}

              {startingFee && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 dark:bg-primary/15 border border-primary/25 px-3 py-1 sm:px-3.5 sm:py-1.5 text-xs font-semibold text-primary shadow-xs self-start sm:self-auto">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>
                    {copy.treatmentsFrom} {startingFee}
                  </span>
                </div>
              )}
            </div>

            {/* MOBILE ONLY: Compact Arch Image visibly present immediately after CTAs and price hint */}
            <div className="lg:hidden w-full pt-1 pb-2">
              {renderArchVisual("mobile")}
            </div>

            {/* Trust Ticks: sleek horizontal snap scroll on mobile, responsive 3-column grid on desktop */}
            {heroTicks.length > 0 && (
              <div
                className="pt-3 sm:pt-8 border-t border-gray-200/80 dark:border-gray-800/80 w-full"
              >
                <div className="flex sm:grid sm:grid-cols-3 gap-2 sm:gap-3 overflow-x-auto hide-scrollbar snap-x snap-mandatory py-1 text-xs text-gray-600 dark:text-gray-300">
                  {heroTicks.map((tick: string, idx: number) => (
                    <div
                      key={idx}
                      className="snap-start shrink-0 sm:shrink flex items-center gap-1.5 rounded-full bg-gray-100/80 dark:bg-gray-800/60 px-3 py-1.5 sm:p-0 sm:bg-transparent border border-gray-200/60 dark:border-gray-700/50 sm:border-0"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-[11px] sm:text-xs font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        {tick}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DESKTOP ONLY: Spacious Right Column Arch-shaped Frame with Floating Tooth & Trust Card */}
          <div className="hidden lg:flex lg:col-span-5 relative items-center justify-center min-h-[520px] mt-0">
            {renderArchVisual("desktop")}
          </div>
        </div>
      </div>
    </section>
    </div>
    </>
  );
}

export default Hero;
