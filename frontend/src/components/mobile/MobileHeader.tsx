"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { resolveMediaUrl } from "@/lib/api";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MobilePushMenu } from "@/components/mobile/MobilePushMenu";
import { SafeImage } from "@/components/ui/safe-image";
import { useT } from "@/i18n/useT";
import { tap } from "@/lib/haptics";

export function MobileHeader() {
  const { content, organization, locale, setLocale } = usePublicContent();
  const { t } = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  const brandName =
    content.general?.shortBrandName?.trim() ||
    content.general?.practiceName ||
    organization?.displayName ||
    organization?.name ||
    "DHDC";

  const rawLogoUrl = content.general?.logoUrl || organization?.logoUrl || null;
  const logoUrl = resolveMediaUrl(rawLogoUrl);

  return (
    <>
      <header
        role="banner"
        className="sticky top-0 z-40 h-[56px] px-4 flex items-center justify-between backdrop-blur-xl bg-white/85 dark:bg-[#0B0F19]/85 border-b border-black/5 dark:border-white/10 transition-transform duration-300 md:hidden"
      >
        {/* Left: Luminous Logo Badge + Wordmark */}
        <Link
          href="/"
          onClick={() => tap(6)}
          className="flex items-center gap-2.5 active:scale-95 transition-transform"
          aria-label={`${brandName} Homepage`}
        >
          <span className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-white dark:bg-white/95 ring-1 ring-black/5 dark:ring-2 dark:ring-primary/40 p-1 shadow-sm shrink-0">
            <SafeImage
              src={rawLogoUrl || null}
              alt={brandName}
              className="h-full w-full object-contain"
              fallbackInitials={brandName.charAt(0)}
              fallbackSubtitle="Dental Clinic"
              priority
            />
          </span>
          <span className="font-serif text-[17px] font-bold tracking-tight text-gray-900 dark:text-white leading-none">
            {brandName}
          </span>
        </Link>

        {/* Right: Language Toggle, Theme Toggle & 44x44px Hamburger */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              tap(8);
              setLocale(locale === "ur" ? "en" : "ur");
            }}
            className="w-11 h-11 min-w-[44px] min-h-[44px] px-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/10 flex items-center justify-center font-semibold text-xs text-gray-800 dark:text-gray-100 hover:bg-black/10 dark:hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
            aria-label={`Switch to ${locale === "ur" ? "English" : "Urdu"}`}
          >
            {locale === "ur" ? "EN" : "اردو"}
          </button>
          <ThemeToggle className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl" />
          <button
            type="button"
            onClick={() => {
              tap(8);
              setMenuOpen(true);
            }}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-gray-800 dark:text-gray-100 hover:bg-black/10 dark:hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
            aria-label="Open mobile navigation menu"
            aria-expanded={menuOpen}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Slide-out Mobile Push Drawer */}
      <MobilePushMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
