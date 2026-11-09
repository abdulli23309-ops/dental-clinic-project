"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Maximize2, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { useLightbox } from "@/components/providers/lightbox-provider";
import { publicGetGallery, GalleryImageItem, resolveMediaUrl } from "@/lib/api";
import {
  BENTO_GALLERY_ITEMS,
  BentoGalleryItem,
} from "@/lib/clinical-media-fallback";

export function Gallery() {
  const { copy, locale } = usePublicContent();
  const { openLightbox } = useLightbox();
  const [bentoItems, setBentoItems] = useState<BentoGalleryItem[]>(BENTO_GALLERY_ITEMS);

  useEffect(() => {
    let isMounted = true;
    publicGetGallery()
      .then((data: GalleryImageItem[]) => {
        if (!isMounted || !Array.isArray(data) || data.length === 0) return;

        // Merge API gallery items with fallback structure if valid URLs exist
        const merged = BENTO_GALLERY_ITEMS.map((defaultItem, idx) => {
          const apiItem = data[idx];
          if (!apiItem || !apiItem.imageUrl) return defaultItem;

          const trimmed = apiItem.imageUrl.trim();
          // Prefer external or verified static image URLs over unmounted production media
          const isUsable =
            /^https?:\/\//i.test(trimmed) ||
            trimmed.startsWith("/images/");

          if (isUsable) {
            return {
              ...defaultItem,
              id: apiItem.id || defaultItem.id,
              imageUrl: resolveMediaUrl(trimmed) || trimmed,
              caption: apiItem.caption || defaultItem.caption,
            };
          }
          return defaultItem;
        });

        if (isMounted) {
          setBentoItems(merged);
        }
      })
      .catch(() => {
        // Retain verified fallback bento gallery items on any network/API glitch
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getLocalizedTitle = (title: string) => {
    if (locale === "ur" && copy.galleryCaptions && copy.galleryCaptions[title]) {
      return copy.galleryCaptions[title];
    }
    return title;
  };

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
          <p className="max-w-md text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {copy.galleryDesc}
          </p>
        </div>

        {/* 5-Card Asymmetric Bento Grid Stage */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {bentoItems.map((item, idx) => {
            const localizedTitle = getLocalizedTitle(item.title);
            const badgeLabel =
              item.badge === "CLINICAL SUITE"
                ? copy.clinicalSuite || "CLINICAL SUITE"
                : copy.clinicAtmosphere || "CLINICAL ATMOSPHERE";

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className={`${item.colSpanClass} relative`}
              >
                <div
                  onClick={() =>
                    openLightbox({
                      layoutId: `bento-gallery-${item.id}`,
                      src: item.imageUrl,
                      alt: localizedTitle,
                      caption: localizedTitle,
                    })
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openLightbox({
                        layoutId: `bento-gallery-${item.id}`,
                        src: item.imageUrl,
                        alt: localizedTitle,
                        caption: localizedTitle,
                      });
                    }
                  }}
                  className={`relative w-full ${item.minHeightClass} rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl border border-gray-200/80 dark:border-gray-800/80 bg-gray-100 dark:bg-gray-850 group cursor-pointer transition-all duration-300`}
                  aria-label={`View full photo: ${localizedTitle}`}
                >
                  {/* High-Resolution Full-Bleed Photograph */}
                  <Image
                    src={item.imageUrl}
                    alt={localizedTitle}
                    fill
                    sizes={
                      item.colSpanClass.includes("12")
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
                        item.badge === "CLINICAL SUITE"
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

                  {/* Bottom Text Overlay with Title and Caption */}
                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7 text-white pointer-events-none z-10 space-y-1">
                    <h3 className="font-display text-lg sm:text-xl md:text-2xl font-bold leading-tight drop-shadow-sm group-hover:text-emerald-200 transition-colors">
                      {localizedTitle}
                    </h3>
                    <p className="text-xs sm:text-[13px] text-gray-200 line-clamp-2 max-w-xl font-normal leading-relaxed drop-shadow-xs">
                      {item.caption}
                    </p>
                  </div>
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
