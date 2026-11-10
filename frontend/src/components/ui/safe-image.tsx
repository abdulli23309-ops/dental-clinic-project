"use client";

import React, { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { Sparkles } from "lucide-react";
import { resolveMediaUrl } from "@/lib/api";

export interface SafeImageProps extends Omit<Partial<ImageProps>, "src" | "alt" | "onError"> {
  src?: string | null;
  alt: string;
  caption?: string | null;
  fallbackInitials?: string;
  fallbackSubtitle?: string;
  fallbackTitle?: string;
  className?: string;
  wrapperClassName?: string;
  imgClassName?: string;
  priority?: boolean;
  aspectRatio?: string;
}

/**
 * SafeImage: Dynamic Luxury Clinical Editorial Image Component
 * Gracefully handles dynamic CMS & database images, Next.js optimization,
 * and elegant monogram/figure fallback states without hardcoded data.
 */
export function SafeImage({
  src,
  alt,
  caption,
  fallbackInitials = "",
  fallbackSubtitle,
  fallbackTitle = "Clinical Facility",
  className = "",
  wrapperClassName = "",
  imgClassName = "",
  priority = false,
  aspectRatio,
  fill,
  width,
  height,
  ...rest
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const resolvedUrl = src ? resolveMediaUrl(src) || src : null;

  // Case 1: Standalone Editorial Facility Figure with Caption
  if (caption || aspectRatio) {
    const ratioClass = aspectRatio || "aspect-[4/3]";
    return (
      <figure
        className={`group overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-800/80 bg-white/90 dark:bg-gray-950/90 shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:border-primary/30 ${className}`}
      >
        <div
          className={`relative w-full ${ratioClass} overflow-hidden bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200/60 dark:from-gray-900 dark:via-gray-925 dark:to-gray-850`}
        >
          {resolvedUrl && !hasError ? (
            <Image
              src={resolvedUrl}
              alt={alt}
              fill
              suppressHydrationWarning
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
              priority={priority}
              onError={() => setHasError(true)}
              className={`object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] ${imgClassName}`}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-3 shadow-xs">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="font-display text-base font-bold text-gray-900 dark:text-white">
                {fallbackTitle}
              </p>
              {fallbackSubtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                  {fallbackSubtitle}
                </p>
              )}
            </div>
          )}

          {/* Subtle Luxury Gradient Overlay */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

          {/* Floating Minimal Badge */}
          <div className="absolute top-4 left-4 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-white/90 shadow-sm border border-white/10">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Clinical Excellence</span>
            </span>
          </div>
        </div>

        {caption && (
          <figcaption className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800/80 bg-stone-50/50 dark:bg-gray-900/40 flex items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-300">
            <span className="font-medium tracking-tight truncate">{caption}</span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
              Facility
            </span>
          </figcaption>
        )}
      </figure>
    );
  }

  // Case 2: Standard Flexible Next.js Image with Clean Monogram / Avatar Fallback
  if (!resolvedUrl || hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`relative overflow-hidden flex flex-col items-center justify-center select-none bg-gradient-to-br from-stone-50 via-stone-100 to-stone-200 dark:from-stone-950 dark:via-stone-900 dark:to-stone-850 text-foreground ${
          fill ? "w-full h-full absolute inset-0" : ""
        } ${wrapperClassName}`}
        style={!fill && width && height ? { width, height } : undefined}
      >
        <svg
          className="absolute inset-0 w-full h-full opacity-15 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="meshGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-primary, #0B3B2D)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#meshGrad)" />
          <circle cx="20%" cy="20%" r="120" fill="currentColor" opacity="0.05" />
          <circle cx="80%" cy="80%" r="160" fill="currentColor" opacity="0.07" />
        </svg>

        <div className="relative z-10 flex flex-col items-center justify-center p-4 text-center">
          {fallbackInitials && (
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 shadow-sm backdrop-blur-sm mb-2">
              <span className="font-serif text-lg font-bold tracking-wider text-primary">
                {fallbackInitials}
              </span>
            </div>
          )}
          {fallbackSubtitle && (
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground max-w-[90%] truncate">
              {fallbackSubtitle}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        src={resolvedUrl}
        alt={alt}
        fill
        priority={priority}
        suppressHydrationWarning
        onError={() => setHasError(true)}
        className={className}
        {...rest}
      />
    );
  }

  return (
    <Image
      src={resolvedUrl}
      alt={alt}
      width={width || 400}
      height={height || 300}
      priority={priority}
      suppressHydrationWarning
      onError={() => setHasError(true)}
      className={className}
      {...rest}
    />
  );
}

export default SafeImage;
