"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { ArrowRight, Phone, CheckCircle2 } from "lucide-react";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { getUiCopy } from "@/content/ui-copy";

export function Hero() {
  const { content, primaryLocation, organization } = usePublicContent();
  const copy = getUiCopy("en");

  const heading = content.homepage?.heroHeading?.trim();
  const description = content.homepage?.heroDescription?.trim();
  const eyebrow = content.homepage?.heroEyebrow?.trim();

  // A section with no data is not rendered at all
  if (!heading && !description) {
    return null;
  }

  const practiceName =
    organization?.displayName ||
    organization?.name ||
    content.general?.practiceName ||
    "";
  const phone = content.general?.phone || primaryLocation?.phone || "";
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  const heroTicks =
    content.homepage?.heroBadges ||
    content.homepage?.heroTicks?.map((t) => t.label) ||
    [];

  const heroImage = content.homepage?.heroImageUrl;

  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 lg:pt-20 lg:pb-28 bg-white dark:bg-gray-950">
      <div className="container-x">
        <div
          className={`grid grid-cols-1 gap-12 items-center ${
            heroImage ? "lg:grid-cols-12 lg:gap-14" : "max-w-3xl"
          }`}
        >
          {/* Main Hero Copy */}
          <div className={heroImage ? "lg:col-span-7 space-y-6" : "space-y-6"}>
            {/* Practice Badge */}
            {(eyebrow || practiceName) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 px-3.5 py-1 text-xs text-gray-600 dark:text-gray-300 backdrop-blur-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {eyebrow && (
                  <span className="font-semibold text-primary uppercase tracking-wider text-[10.5px]">
                    {eyebrow}
                  </span>
                )}
                {eyebrow && practiceName && (
                  <span className="text-gray-400">·</span>
                )}
                {practiceName && <span>{practiceName}</span>}
              </motion.div>
            )}

            {/* Headline */}
            {heading && (
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 }}
                className="fluid-h1 tracking-[-0.03em] text-gray-900 dark:text-white font-normal leading-[1.05]"
              >
                {heading}
              </motion.h1>
            )}

            {/* Sub-headline description */}
            {description && (
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.16 }}
                className="max-w-xl text-base sm:text-lg leading-relaxed text-gray-600 dark:text-gray-400 font-normal"
              >
                {description}
              </motion.p>
            )}

            {/* Primary Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24 }}
              className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5"
            >
              <Button
                href={content.homepage?.heroCtaLink || "/book"}
                variant="primary"
                size="lg"
              >
                <span>
                  {content.homepage?.heroCtaText || copy.book}
                </span>
                <ArrowRight className="h-4 w-4 ml-0.5" />
              </Button>

              {phone ? (
                <div className="flex items-center gap-2">
                  <Button
                    href={`tel:${cleanPhone}`}
                    variant="outline"
                    size="lg"
                    className="flex-1 sm:flex-initial"
                  >
                    <Phone className="h-4 w-4 text-primary" />
                    <span>
                      {copy.call} {phone}
                    </span>
                  </Button>
                  <CopyButton text={phone} label="Copy" className="h-11 px-3" />
                </div>
              ) : null}
            </motion.div>

            {/* Badges / Ticks from CMS only */}
            {heroTicks.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.32 }}
                className="pt-6 border-t border-gray-200 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600 dark:text-gray-400"
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

          {/* Real Photo from Admin Uploads Only */}
          {heroImage && (
            <div className="lg:col-span-5 relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="relative mx-auto aspect-[4/5] max-w-md overflow-hidden rounded-[var(--radius-card)] border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 shadow-card"
              >
                <img
                  src={heroImage}
                  alt={practiceName ? `Clinic facility at ${practiceName}` : "Clinic facility"}
                  className="h-full w-full object-cover"
                />
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Hero;
