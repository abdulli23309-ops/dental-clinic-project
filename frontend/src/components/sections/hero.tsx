"use client";

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
              className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-500 bg-clip-text text-transparent italic"
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

  // Split words into first half and last phrase with animated gradient
  const words = heading.split(" ");
  if (words.length <= 1) {
    return (
      <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-500 bg-clip-text text-transparent italic">
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
      <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-500 bg-clip-text text-transparent italic">
        {secondHalf}
      </span>
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
  const heading = (heroObj.headline || heroObj.heroHeading || practiceName || "").trim();
  const description = (
    heroObj.subheadline ||
    heroObj.heroDescription ||
    organization?.description ||
    organization?.tagline ||
    ""
  ).trim();
  const heroImageRaw = (heroObj.image || heroObj.heroImageUrl || "").trim();
  const heroImage = heroImageRaw ? resolveMediaUrl(heroImageRaw) : "";
  const eyebrow = (heroObj.heroEyebrow || (heading ? practiceName : "")).trim();
  const highlightWord = (heroObj.heroHighlightWord || "").trim();
  const startingFee = (heroObj.startingFee || "").trim();
  const heroSealText = ((heroObj as any)?.heroSealText || "").trim();

  // Section with no data is not rendered once loading is complete
  if (!isLoading && !heading && !description) {
    return null;
  }

  const heroTicks = heroObj.heroBadges?.length
    ? heroObj.heroBadges
    : heroObj.heroTicks?.map((t: any) => t.label || t) || [];

  return (
    <section className="relative overflow-hidden pt-16 pb-28 md:pt-24 md:pb-36 lg:pt-28 lg:pb-40 bg-[radial-gradient(ellipse_75%_50%_at_50%_-5%,rgba(var(--color-primary-rgb,16,125,82),0.08),transparent)] dark:bg-[radial-gradient(ellipse_75%_50%_at_50%_-5%,rgba(var(--color-primary-rgb,16,125,82),0.14),transparent)]">
      <div className="container-x">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Strict Single-Edge Alignment, Generous Spacing */}
          <div className="lg:col-span-7 flex flex-col items-start text-start space-y-8 sm:space-y-10">
            {/* Practice / Eyebrow Badge (Subtle kicker text so it doesn't compete with dominant headline) */}
            {(eyebrow || practiceName) ? (
              <div
                className="inline-flex items-center gap-2 rounded-full border border-gray-200/70 dark:border-gray-800/70 bg-gray-50/90 dark:bg-gray-900/70 px-3.5 py-1 text-xs text-gray-600 dark:text-gray-400 backdrop-blur-md"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary/80" />
                {eyebrow && (
                  <span className="font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px]">
                    {eyebrow}
                  </span>
                )}
                {eyebrow && practiceName && (
                  <span className="text-gray-300 dark:text-gray-700">|</span>
                )}
                {practiceName && <span className="font-medium text-gray-600 dark:text-gray-400">{practiceName}</span>}
              </div>
            ) : null}

            {/* Dominant Headline (One Strong Dominant Element with High Contrast) */}
            {heading ? (
              <h1
                className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight text-gray-950 dark:text-white leading-[1.12] font-bold"
              >
                {renderTwoToneHeadline(heading, highlightWord)}
              </h1>
            ) : null}

            {/* Sub-headline description */}
            {description ? (
              <p
                className="max-w-xl text-base sm:text-lg leading-relaxed text-gray-600 dark:text-gray-300"
              >
                {description}
              </p>
            ) : null}

            {/* CTAs and Starting Fee Badge (Single Dominant Primary Button + Subtle Outline Secondary) */}
            <div
              className="pt-2 flex flex-wrap items-center gap-4 justify-start min-h-[48px]"
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
                className="rounded-full px-7 flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <span>{isUrdu ? copy.bookAppointment : (heroObj.heroCtaText || copy.bookAppointment || "Book an Appointment")}</span>
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>

              {phone ? (
                <div className="flex items-center gap-1.5">
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
                    className="rounded-full px-5 flex items-center gap-2 border-gray-300 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <Phone className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      {copy.call || "Call"} <bdi dir="ltr">{phone}</bdi>
                    </span>
                  </Button>
                  <CopyButton text={phone} label={copy.copyPhone} className="h-10 px-2.5 rounded-full" />
                </div>
              ) : null}

              {startingFee && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-400/15 border border-emerald-600/25 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-xs">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {copy.treatmentsFrom} {startingFee}
                  </span>
                </div>
              )}
            </div>

            {/* Trust Ticks (Generous Top Spacing & Strict Single-Edge Left Alignment) */}
            {heroTicks.length > 0 && (
              <div
                className="pt-8 border-t border-gray-200/80 dark:border-gray-800/80 w-full grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600 dark:text-gray-300"
              >
                {heroTicks.map((tick: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>{tick}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Arch-shaped Clinic Photo Frame with Floating Tooth & Trust Card */}
          <div className="lg:col-span-5 relative flex items-center justify-center min-h-[460px] sm:min-h-[520px] mt-8 lg:mt-0">
            {/* Visual Background Glow */}
            <div
              className="absolute -inset-4 rounded-full bg-gradient-to-tr from-primary/15 via-amber-200/10 to-transparent blur-3xl pointer-events-none"
              aria-hidden="true"
            />

            {/* Arch-shaped Photo Frame */}
            <div
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              className="relative w-full max-w-[420px] min-h-[420px] aspect-[4/5] rounded-t-[200px] rounded-b-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-800 group"
            >
              <SafeImage
                src={heroImage}
                alt={heading || practiceName || "Modern dental clinic treatment suite"}
                fallbackInitials={practiceName ? practiceName.slice(0, 2).toUpperCase() : "DC"}
                fallbackSubtitle={practiceName}
                priority={true}
                width={420}
                height={525}
                sizes="(max-width: 640px) 380px, (max-width: 1024px) 50vw, 420px"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />

              {/* Rotating Dental Seal Badge */}
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
                      <text className="text-[10.5px] uppercase font-bold tracking-[0.22em] fill-white dark:fill-gray-200 drop-shadow-sm">
                        <textPath href="#seal-curve" startOffset="0%">
                          {heroSealText}
                        </textPath>
                      </text>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/90 dark:bg-gray-900/90 shadow-md border border-amber-300/60 dark:border-amber-400/30 flex items-center justify-center text-primary backdrop-blur-sm">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* The Floating Tooth with glass badge */}
            <div className="absolute -bottom-6 -left-4 sm:-left-8 w-44 h-44 sm:w-52 sm:h-52 z-30 pointer-events-none">
              <motion.div
                initial={false}
                animate={shouldReduceMotion ? undefined : { y: [0, -10, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-full h-full flex items-center justify-center filter drop-shadow-[0_20px_25px_rgba(0,0,0,0.3)]"
              >
                <motion.div
                  initial={false}
                  style={
                    shouldReduceMotion
                      ? undefined
                      : {
                          x: toothX,
                          y: toothY,
                          rotate: toothRotate,
                        }
                  }
                  className="w-full h-full flex items-center justify-center relative"
                >
                  <div className="absolute inset-4 rounded-3xl bg-white/40 dark:bg-black/40 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-xl" />
                  <Image
                    src="/images/tooth-hero.png"
                    alt="Professional anatomical tooth model illustrating dental care quality"
                    width={220}
                    height={220}
                    className="w-full h-full object-contain select-none pointer-events-none relative z-10"
                  />
                </motion.div>
              </motion.div>
            </div>

            {/* Trust Card: Next Available Appointment */}
            <div className="absolute -bottom-4 right-2 sm:right-2 z-30 rounded-2xl border border-white/80 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-3.5 py-2.5 shadow-xl flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="text-start">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 leading-none mb-1">
                  {copy.nextAvailable}
                </p>
                <p className="text-xs font-bold text-gray-950 dark:text-white leading-none whitespace-nowrap">
                  {copy.todayTime}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
