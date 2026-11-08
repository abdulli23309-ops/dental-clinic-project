"use client";

import React, { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { resolveMediaUrl } from "@/lib/api";

export interface SafeImageProps extends Omit<ImageProps, "src" | "alt" | "onError"> {
  src?: string | null;
  alt: string;
  fallbackInitials?: string;
  fallbackSubtitle?: string;
  className?: string;
  wrapperClassName?: string;
  priority?: boolean;
}

export function SafeImage({
  src,
  alt,
  fallbackInitials = "HDC",
  fallbackSubtitle,
  className = "",
  wrapperClassName = "",
  fill,
  width,
  height,
  ...rest
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error state if src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const resolvedUrl = src ? resolveMediaUrl(src) || src : null;

  if (!resolvedUrl || hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`relative overflow-hidden flex flex-col items-center justify-center select-none bg-gradient-to-br from-[#FAF9F5] via-[#E8F3EE] to-[#D6EBE2] dark:from-[#070D0B] dark:via-[#0B1E17] dark:to-[#122E23] text-emerald-950 dark:text-emerald-100 ${
          fill ? "w-full h-full absolute inset-0" : ""
        } ${wrapperClassName}`}
        style={!fill && width && height ? { width, height } : undefined}
      >
        {/* Subtle Luxury SVG Mesh Background */}
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
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/80 dark:bg-emerald-950/60 border border-emerald-700/20 shadow-sm backdrop-blur-sm mb-2">
            <span className="font-serif text-lg font-bold tracking-wider text-emerald-900 dark:text-emerald-200">
              {fallbackInitials}
            </span>
          </div>
          {fallbackSubtitle && (
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-800/80 dark:text-emerald-300/80 max-w-[90%] truncate">
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
      width={width}
      height={height}
      onError={() => setHasError(true)}
      className={className}
      {...rest}
    />
  );
}

export default SafeImage;

