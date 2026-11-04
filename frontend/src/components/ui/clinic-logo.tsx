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
      className={`relative shrink-0 overflow-hidden select-none ${
        variant === "badge"
          ? "rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 shadow-xs"
          : ""
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
        <div className={fallbackClassName}>
          <span>{fallbackInitial}</span>
        </div>
      )}
    </div>
  );
}
