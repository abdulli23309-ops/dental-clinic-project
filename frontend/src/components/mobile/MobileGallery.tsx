"use client";

import React from "react";
import { Images, Maximize2 } from "lucide-react";
import { GalleryImageItem, resolveMediaUrl } from "@/lib/api";
import { useLightbox } from "@/components/providers/lightbox-provider";
import { tap } from "@/lib/haptics";

interface MobileGalleryProps {
  items: GalleryImageItem[];
}

export function MobileGallery({ items }: MobileGalleryProps) {
  const { openLightbox } = useLightbox();

  if (!items || items.length === 0) return null;

  const lightboxImages = items.map((it) => ({
    url: resolveMediaUrl(it.imageUrl) || it.imageUrl,
    caption: it.caption,
  }));

  const heroItem = items[0];
  const gridItems = items.slice(1, 5);

  return (
    <div className="py-8 px-4 md:hidden">
      {/* Header */}
      <div className="mb-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          Facilities & Technology
        </span>
        <h2 className="font-serif text-[28px] leading-tight font-bold text-gray-900 dark:text-white mt-1">
          Inside Our Clinic
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Hospital-grade surgical operatories & diagnostic radiology suites.
        </p>
      </div>

      {/* 2-Column Mobile Bento Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* 1 Hero Tile: Full Width (col-span-2, aspect-[16/10]) */}
        {heroItem && (
          <div
            onClick={() => {
              tap(6);
              openLightbox({
                layoutId: `gallery-mobile-${heroItem.id || 0}`,
                src: resolveMediaUrl(heroItem.imageUrl) || heroItem.imageUrl,
                alt: heroItem.caption || "Clinic facility",
                caption: heroItem.caption,
              });
            }}
            className="col-span-2 aspect-[16/10] rounded-2xl overflow-hidden relative group cursor-pointer shadow-sm bg-slate-100 dark:bg-slate-900"
          >
            <img
              src={resolveMediaUrl(heroItem.imageUrl) || heroItem.imageUrl}
              alt={heroItem.caption || "Clinic facility"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            <span className="absolute top-2.5 left-2.5 backdrop-blur-md bg-black/60 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
              Surgical Suite
            </span>

            <div className="absolute bottom-2.5 inset-x-3 text-white flex items-end justify-between">
              <p className="text-xs font-semibold line-clamp-1 pr-2">
                {heroItem.caption || "Sterile Surgical & Diagnostic Operatory"}
              </p>
              <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <Maximize2 className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        )}

        {/* 4 Square Tiles: aspect-square */}
        {gridItems.map((item, idx) => (
          <div
            key={item.id || idx}
            onClick={() => {
              tap(6);
              openLightbox({
                layoutId: `gallery-mobile-${item.id || idx + 1}`,
                src: resolveMediaUrl(item.imageUrl) || item.imageUrl,
                alt: item.caption || "Clinic photo",
                caption: item.caption,
              });
            }}
            className="aspect-square rounded-2xl overflow-hidden relative group cursor-pointer shadow-xs bg-slate-100 dark:bg-slate-900"
          >
            <img
              src={resolveMediaUrl(item.imageUrl) || item.imageUrl}
              alt={item.caption || "Clinic photo"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

            <div className="absolute bottom-2 inset-x-2 text-white">
              <p className="text-[11px] font-medium line-clamp-1">
                {item.caption}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* View All Photos Button */}
      {items.length > 1 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              tap(8);
              openLightbox({
                layoutId: `gallery-mobile-all`,
                src: resolveMediaUrl(items[0].imageUrl) || items[0].imageUrl,
                alt: items[0].caption || "Clinic facility",
                caption: items[0].caption,
              });
            }}
            className="w-full h-11 rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 active:bg-slate-100 dark:active:bg-slate-800 transition-colors cursor-pointer shadow-xs"
          >
            <Images className="w-4 h-4 text-primary" />
            <span>View All {items.length} Clinic Photos</span>
          </button>
        </div>
      )}
    </div>
  );
}
