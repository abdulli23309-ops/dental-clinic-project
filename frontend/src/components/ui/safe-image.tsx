"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Sparkles, Image as ImageIcon } from "lucide-react";
import { resolveMediaUrl } from "@/lib/api";

export interface SafeImageProps {
  src?: string | null;
  alt: string;
  caption?: string | null;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  aspectRatio?: string;
  fallbackTitle?: string;
  fallbackSubtitle?: string;
}

/**
 * SafeImage: Luxury Clinical Editorial Image Component
 * Gracefully renders CMS images with resolved media URLs, elegant loading state,
 * error handling fallback, and clinical caption framing.
 */
export function SafeImage({
  src,
  alt,
  caption,
  className = "",
  imgClassName = "",
  priority = false,
  aspectRatio = "aspect-[4/3]",
  fallbackTitle = "Modern Dental Suite",
  fallbackSubtitle = "DHDC Islamabad Clinical Facility",
}: SafeImageProps) {
  const [error, setError] = useState(false);
  const resolved = resolveMediaUrl(src) || src;

  return (
    <figure className={`group overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-800/80 bg-white/90 dark:bg-gray-950/90 shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:border-emerald-600/30 ${className}`}>
      <div className={`relative w-full ${aspectRatio} overflow-hidden bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200/60 dark:from-gray-900 dark:via-gray-925 dark:to-gray-850`}>
        {resolved && !error ? (
          <Image
            src={resolved}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
            priority={priority}
            onError={() => setError(true)}
            className={`object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] ${imgClassName}`}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 mb-3 shadow-xs">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="font-display text-base font-bold text-gray-900 dark:text-white">
              {fallbackTitle}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
              {fallbackSubtitle}
            </p>
          </div>
        )}

        {/* Subtle Luxury Gradient Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

        {/* Floating Minimal Badge */}
        <div className="absolute top-4 left-4 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-white/90 shadow-sm border border-white/10">
            <Sparkles className="h-3 w-3 text-emerald-400" />
            <span>Clinical Excellence</span>
          </span>
        </div>
      </div>

      {caption && (
        <figcaption className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800/80 bg-stone-50/50 dark:bg-gray-900/40 flex items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-300">
          <span className="font-medium tracking-tight truncate">{caption}</span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
            Facility
          </span>
        </figcaption>
      )}
    </figure>
  );
}

export default SafeImage;
