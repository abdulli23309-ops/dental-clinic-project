"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Maximize2, Sparkles, ImageOff } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { useLightbox } from "@/components/providers/lightbox-provider";
import { publicGetGallery, GalleryImageItem, resolveMediaUrl } from "@/lib/api";

const BENTO_LAYOUTS = [
  { colSpanClass: "md:col-span-7", minHeightClass: "min-h-[260px] md:min-h-[460px]", defaultBadge: "CLINICAL SUITE" },
  { colSpanClass: "md:col-span-5", minHeightClass: "min-h-[220px] md:min-h-[460px]", defaultBadge: "CLINIC ATMOSPHERE" },
  { colSpanClass: "md:col-span-4", minHeightClass: "min-h-[200px] md:min-h-[380px]", defaultBadge: "CLINIC ATMOSPHERE" },
  { colSpanClass: "md:col-span-4", minHeightClass: "min-h-[200px] md:min-h-[380px]", defaultBadge: "CLINICAL SUITE" },
  { colSpanClass: "md:col-span-4", minHeightClass: "min-h-[200px] md:min-h-[380px]", defaultBadge: "CLINICAL SUITE" },
];

function parseCaption(caption: string): { title: string; subtitle: string | null } {
  if (!caption) return { title: "", subtitle: null };
  const delimiters = [" — ", " – ", " - "];
  for (const delim of delimiters) {
    if (caption.includes(delim)) {
      const [title, ...rest] = caption.split(delim);
      return {
        title: title.trim(),
        subtitle: rest.join(delim).trim() || null,
      };
    }
  }
  return { title: caption.trim(), subtitle: null };
}

export function Gallery() {
  const { copy } = usePublicContent();
  const { openLightbox } = useLightbox();
  const [galleryItems, setGalleryItems] = useState<GalleryImageItem[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    publicGetGallery()
      .then((data: GalleryImageItem[]) => {
        if (!isMounted) return;
        if (Array.isArray(data)) {
          setGalleryItems(
            data
              .filter((item) => item.isActive !== false && item.imageUrl)
              .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
          );
        }
        setHasLoaded(true);
      })
      .catch(() => {
        if (isMounted) setHasLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (hasLoaded && galleryItems.length === 0) {
    return null;
  }

  if (!hasLoaded && galleryItems.length === 0) {
    return null;
  }

  return (
    <section
      id="gallery"
      className="border-t border-gray-200 dark:border-gray-800 bg-[#FAF9F5] dark:bg-gray-900/50 py-24 md:py-32 overflow-hidden"
    >
      <div className="container-x space-y-12 lg:space-y-14">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SectionHeading
            eyebrow={copy.galleryEyebrow}
            title={copy.galleryTitle}
          />
          {copy.galleryDesc && (
            <p className="max-w-md text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {copy.galleryDesc}
            </p>
          )}
        </div>

        {/* Dynamic Asymmetric Bento Grid (7/5 row 1, 4/4/4 row 2) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {galleryItems.map((item, idx) => {
            const layout = BENTO_LAYOUTS[idx % BENTO_LAYOUTS.length];
            const resolvedUrl = resolveMediaUrl(item.imageUrl) || item.imageUrl;
            const fullCaption = item.caption || "";
            const { title, subtitle } = parseCaption(fullCaption);
            const badgeLabel =
              layout.defaultBadge === "CLINICAL SUITE"
                ? copy.clinicalSuite || "CLINICAL SUITE"
                : copy.clinicAtmosphere || "CLINIC ATMOSPHERE";

            const hasError = !resolvedUrl || imageErrors[item.id];

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className={`${layout.colSpanClass} relative`}
              >
                <div
                  onClick={() => {
                    if (resolvedUrl && !hasError) {
                      openLightbox({
                        layoutId: `bento-gallery-${item.id}`,
                        src: resolvedUrl,
                        alt: title || fullCaption,
                        caption: fullCaption,
                      });
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && resolvedUrl && !hasError) {
                      e.preventDefault();
                      openLightbox({
                        layoutId: `bento-gallery-${item.id}`,
                        src: resolvedUrl,
                        alt: title || fullCaption,
                        caption: fullCaption,
                      });
                    }
                  }}
                  className={`relative w-full ${layout.minHeightClass} rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl border border-gray-200/80 dark:border-gray-800/80 bg-slate-900 group cursor-pointer transition-all duration-300`}
                  aria-label={`View clinical photograph: ${title || fullCaption}`}
                >
                  {/* High-Resolution Full-Bleed Photograph with Direct Native <img> for Maximum Reliability */}
                  {!hasError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolvedUrl}
                      alt={title || fullCaption}
                      loading={idx < 2 ? "eager" : "lazy"}
                      onError={() => setImageErrors((prev) => ({ ...prev, [item.id]: true }))}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center p-6 text-center">
                      <ImageOff className="h-10 w-10 text-white/20" />
                    </div>
                  )}

                  {/* Restrained Gradient Scrim: covers only bottom 40% so photograph stays bright and clear */}
                  <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

                  {/* Top Bar: Badge & Zoom Pill */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 pointer-events-none z-10">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm border bg-black/45 border-white/20 text-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span>{badgeLabel}</span>
                    </span>

                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 transition-transform group-hover:scale-110 shadow-sm">
                      <Maximize2 className="h-4 w-4" />
                    </span>
                  </div>

                  {/* Clean Bottom Typography: 1-line serif title + 1-2 line muted sans subtitle (Zero Collisions) */}
                  {title && (
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 md:p-6 text-white pointer-events-none z-10 space-y-0.5">
                      <h3 className="text-sm sm:text-base md:text-lg font-serif font-semibold text-white line-clamp-1 drop-shadow-sm group-hover:text-primary-foreground/90 transition-colors">
                        {title}
                      </h3>
                      {subtitle && (
                        <p className="text-[11px] sm:text-xs text-white/80 line-clamp-2 font-sans font-normal drop-shadow-xs">
                          {subtitle}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Gallery;
