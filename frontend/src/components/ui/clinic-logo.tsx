"use client";

import React, { useState, useEffect } from "react";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { resolveMediaUrl } from "@/lib/api";

export interface ClinicBranding {
  logoUrl: string | null;
  fullBrandName: string;
  shortBrandName: string;
  tagline: string;
  phone: string;
  email: string;
  primaryColor: string;
  secondaryColor: string;
  isLoading: boolean;
}

/**
 * Single shared hook for authoritative organization & clinic branding.
 * Synthesizes database-backed CMS copy (general section) and Organization profile.
 */
export function useClinicBranding(): ClinicBranding {
  const { content, organization, status } = usePublicContent();

  const rawLogoUrl = content.general?.logoUrl || organization?.logoUrl || null;
  const logoUrl = resolveMediaUrl(rawLogoUrl);

  const fullBrandName =
    content.general?.practiceName?.trim() ||
    organization?.displayName ||
    organization?.name ||
    "";

  const shortBrandName =
    content.general?.shortBrandName?.trim() ||
    organization?.shortBrandName?.trim() ||
    organization?.displayName ||
    organization?.name ||
    "";

  const tagline =
    content.general?.tagline?.trim() ||
    organization?.tagline?.trim() ||
    "";

  const phone =
    content.general?.phone?.trim() ||
    organization?.contactPhone?.trim() ||
    "";

  const email =
    content.general?.email?.trim() ||
    organization?.contactEmail?.trim() ||
    "";

  const primaryColor = organization?.primaryColor || "";
  const secondaryColor = organization?.secondaryColor || "";

  return {
    logoUrl,
    fullBrandName,
    shortBrandName,
    tagline,
    phone,
    email,
    primaryColor,
    secondaryColor,
    isLoading: status === "loading",
  };
}

export interface ClinicLogoProps {
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
  alt?: string;
  variant?: "badge" | "plain";
}

/**
 * Accessible, responsive Clinic Logo component.
 * Displays the verified uploaded PNG logo, preserving proportions with object-contain.
 * Renders a clean monogram/symbol fallback only when the logo asset is genuinely unavailable.
 */
export function ClinicLogo({
  className = "h-10 w-10",
  imgClassName = "h-full w-full object-contain",
  fallbackClassName = "h-full w-full flex items-center justify-center font-display font-bold text-base bg-primary text-white",
  alt,
  variant = "badge",
}: ClinicLogoProps) {
  const { logoUrl, shortBrandName, fullBrandName } = useClinicBranding();
  const [hasError, setHasError] = useState(false);
  const [prevLogoUrl, setPrevLogoUrl] = useState(logoUrl);

  if (prevLogoUrl !== logoUrl) {
    setPrevLogoUrl(logoUrl);
    setHasError(false);
  }

  const fallbackInitial = (shortBrandName || fullBrandName || "H").trim().charAt(0).toUpperCase();

  return (
    <div
      className={`relative shrink-0 select-none ${
        variant === "badge"
          ? "flex items-center justify-center rounded-xl bg-white dark:bg-white/95 border border-slate-200/80 dark:border-white/90 shadow-sm dark:shadow-[0_0_20px_rgba(255,255,255,0.14)] ring-1 ring-black/5 dark:ring-2 dark:ring-primary/40 p-1.5 transition-all overflow-hidden"
          : "overflow-hidden"
      } ${className}`}
    >
      {logoUrl && !hasError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={alt || `${fullBrandName} Logo`}
          onError={() => setHasError(true)}
          className={imgClassName}
          loading="eager"
        />
      ) : (
        <span className="grid h-full w-full place-items-center rounded-xl bg-primary text-white shadow-subtle shrink-0">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M12 4c-2.5 0-3.2 1.2-4.6 1.2C6 5.2 4.5 6.6 4.5 9.2c0 3.4 1.7 6 2.6 8.6.6 1.7 1 3 2.1 3 1.2 0 1.3-1.6 1.5-3.3.15-1.4.5-2.5 1.3-2.5s1.15 1.1 1.3 2.5c.2 1.7.3 3.3 1.5 3.3 1.1 0 1.5-1.3 2.1-3 .9-2.6 2.6-5.2 2.6-8.6 0-2.6-1.5-4-2.9-4C15.2 5.2 14.5 4 12 4Z" />
          </svg>
        </span>
      )}
    </div>
  );
}
