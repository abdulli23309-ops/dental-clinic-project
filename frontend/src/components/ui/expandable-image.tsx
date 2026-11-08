"use client";

import React, { useId } from "react";
import { motion } from "motion/react";
import { useLightbox } from "@/components/providers/lightbox-provider";

export interface ExpandableImageProps {
  src: string;
  alt: string;
  caption?: string | null;
  layoutId?: string;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
  children?: React.ReactNode;
  onClick?: () => void;
}

/**
 * ExpandableImage component that enables seamless Framer Motion shared-element
 * transition into the global full-screen Lightbox modal on click.
 */
export function ExpandableImage({
  src,
  alt,
  caption,
  layoutId,
  className = "",
  imgClassName = "w-full h-auto block",
  loading = "lazy",
  children,
  onClick,
}: ExpandableImageProps) {
  const { openLightbox } = useLightbox();
  const autoId = useId();
  const effectiveLayoutId = layoutId || `lightbox-${autoId}`;

  const handleClick = (e: React.MouseEvent) => {
    onClick?.();
    openLightbox({
      layoutId: effectiveLayoutId,
      src,
      alt,
      caption,
    });
  };

  return (
    <div
      onClick={handleClick}
      className={`relative cursor-pointer group ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent);
        }
      }}
      aria-label={`View expanded image: ${caption || alt}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img
        layoutId={effectiveLayoutId}
        src={src}
        alt={alt}
        loading={loading}
        className={imgClassName}
        transition={{
          type: "spring",
          stiffness: 320,
          damping: 32,
          mass: 0.8,
        }}
      />
      {children}
    </div>
  );
}

export default ExpandableImage;

