"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Maximize2, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { useLightbox } from "@/components/providers/lightbox-provider";
import { publicGetGallery, GalleryImageItem, resolveMediaUrl } from "@/lib/api";

const BENTO_LAYOUTS = [
  { colSpanClass: "md:col-span-8", minHeightClass: "min-h-[360px] md:min-h-[460px]", defaultBadge: "CLINICAL SUITE" },
  { colSpanClass: "md:col-span-4", minHeightClass: "min-h-[360px] md:min-h-[460px]", defaultBadge: "CLINIC ATMOSPHERE" },
  { colSpanClass: "md:col-span-4", minHeightClass: "min-h-[300px] md:min-h-[380px]", defaultBadge: "CLINIC ATMOSPHERE" },
  { colSpanClass: "md:col-span-4", minHeightClass: "min-h-[300px] md:min-h-[380px]", defaultBadge: "CLINICAL SUITE" },
  { colSpanClass: "md:col-span-4", minHeightClass: "min-h-[300px] md:min-h-[380px]", defaultBadge: "CLINICAL SUITE" },
];

export function Gallery() {
  const { copy } = usePublicContent();
  const { openLightbox } = useLightbox();
  const [galleryItems, setGalleryItems] = useState<GalleryImageItem[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

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
      className="border-t border-gray-200 dark:border-gray-800 bg-[#FAF9F5] dark:bg-gray-900/50 py-28 md:py-36 overflow-hidden"
    >
      <div className="container-x space-y-14 lg:space-y-16">
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

        {/* Dynamic Bento Grid Stage populated from Database */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {galleryItems.map((item, idx) => {
            const layout = BENTO_LAYOUTS[idx % BENTO_LAYOUTS.length];
            const resolvedUrl = resolveMediaUrl(item.imageUrl) || item.imageUrl;
            const caption = item.caption || "";
            const badgeLabel =
              layout.defaultBadge === "CLINICAL SUITE"
                ? copy.clinicalSuite || "CLINICAL SUITE"
                : copy.clinicAtmosphere || "CLINIC ATMOSPHERE";

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
                  onClick={() =>
                    openLightbox({
                      layoutId: `bento-gallery-${item.id}`,
                      src: resolvedUrl,
                      alt: caption,
                      caption: caption,
                    })
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openLightbox({
                        layoutId: `bento-gallery-${item.id}`,
                        src: resolvedUrl,
                        alt: caption,
                        caption: caption,
                      });
                    }
                  }}
                  className={`relative w-full ${layout.minHeightClass} rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl border border-gray-200/80 dark:border-gray-800/80 bg-gray-100 dark:bg-gray-850 group cursor-pointer transition-all duration-300`}
                  aria-label={`View full photo: ${caption}`}
                >
                  {/* High-Resolution Full-Bleed Photograph from DB */}
                  <Image
                    src={resolvedUrl}
                    alt={caption}
                    fill
                    sizes={
                      layout.colSpanClass.includes("12")
                        ? "100vw"
                        : "(max-width: 768px) 100vw, 55vw"
                    }
                    priority={idx === 0}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />

                  {/* Gradient Overlay for Typography Contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

                  {/* Top Bar: Badge & Zoom Pill */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 pointer-events-none z-10">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm border ${
                        layout.defaultBadge === "CLINICAL SUITE"
                          ? "bg-emerald-600/90 text-white border-emerald-500/30"
                          : "bg-black/50 text-white/95 border-white/15"
                      }`}
                    >
                      <Sparkles className="h-3 w-3 text-emerald-300" />
                      <span>{badgeLabel}</span>
                    </span>

                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 transition-transform group-hover:scale-110 shadow-sm">
                      <Maximize2 className="h-4 w-4" />
                    </span>
                  </div>

                  {/* Bottom Text Overlay with Caption */}
                  {caption && (
                    <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7 text-white pointer-events-none z-10 space-y-1">
                      <h3 className="font-display text-lg sm:text-xl md:text-2xl font-bold leading-tight drop-shadow-sm group-hover:text-emerald-200 transition-colors">
                        {caption}
                      </h3>
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
