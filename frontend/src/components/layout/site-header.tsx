"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Menu, RefreshCw, Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SearchDialog } from "@/components/ui/search-dialog";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { AnnouncementMarquee } from "@/components/ui/announcement-marquee";
import { getServices, ServiceItem } from "@/lib/api";

export interface SiteHeaderProps {
  variant?: "default" | "minimal";
}

export function SiteHeader({ variant = "default" }: SiteHeaderProps) {
  const {
    content,
    primaryLocation,
    organization,
    isUnavailable,
    retry,
    status,
    locale,
    setLocale,
    copy,
  } = usePublicContent();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);

  const brandName =
    content.general?.shortBrandName?.trim() ||
    content.general?.practiceName ||
    organization?.displayName ||
    organization?.name ||
    "";
  const practiceName =
    content.general?.practiceName ||
    organization?.displayName ||
    organization?.name ||
    "";
  const tagline = content.general?.tagline || organization?.tagline || "";
  const logoUrl = content.general?.logoUrl || organization?.logoUrl || null;
  const phone =
    content.general?.phone ||
    primaryLocation?.phone ||
    organization?.contactPhone ||
    "";

  useEffect(() => {
    let mounted = true;
    if (!isUnavailable) {
      getServices()
        .then((data) => {
          if (mounted && Array.isArray(data)) {
            setServices(data.filter((s) => s.isActive !== false));
          }
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [isUnavailable]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setServicesMenuOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const isMinimal = variant === "minimal";

  return (
    <>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {!isMinimal && !isUnavailable && <AnnouncementMarquee />}

      <header
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          isScrolled
            ? "border-gray-200/80 dark:border-gray-800/80 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl shadow-sm py-2.5"
            : "border-transparent bg-white/40 dark:bg-gray-950/40 backdrop-blur-sm py-4"
        }`}
      >
        <div className="container-x px-4 sm:px-6 lg:px-6 xl:px-8 flex items-center justify-between gap-3 xl:gap-6 flex-nowrap">
          <Link
            href="/"
            className="group flex items-center gap-2.5 transition-transform active:scale-[0.98] shrink-0 whitespace-nowrap"
            aria-label={brandName ? `${brandName} Homepage` : "Homepage"}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={brandName || "Clinic Logo"}
                className="h-8 w-8 rounded-full object-contain border border-line bg-bone shrink-0"
              />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-white shadow-subtle group-hover:brightness-90 transition-all shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M12 4c-2.5 0-3.2 1.2-4.6 1.2C6 5.2 4.5 6.6 4.5 9.2c0 3.4 1.7 6 2.6 8.6.6 1.7 1 3 2.1 3 1.2 0 1.3-1.6 1.5-3.3.15-1.4.5-2.5 1.3-2.5s1.15 1.1 1.3 2.5c.2 1.7.3 3.3 1.5 3.3 1.1 0 1.5-1.3 2.1-3 .9-2.6 2.6-5.2 2.6-8.6 0-2.6-1.5-4-2.9-4C15.2 5.2 14.5 4 12 4Z" />
                </svg>
              </span>
            )}
            <div className="flex flex-col shrink-0">
              {brandName ? (
                <span className="font-display text-[17px] sm:text-[18px] tracking-tight text-gray-900 dark:text-white leading-none whitespace-nowrap">
                  {brandName}
                </span>
              ) : null}
              {tagline ? (
                <span className="hidden xl:inline-block text-[11px] text-gray-500 dark:text-gray-400 font-sans tracking-normal mt-0.5 truncate max-w-[170px] whitespace-nowrap">
                  {tagline}
                </span>
              ) : null}
            </div>
          </Link>

          {isUnavailable ? (
            <div className="flex items-center gap-2.5 shrink-0 flex-nowrap">
              <button
                onClick={() => retry()}
                disabled={status === "loading"}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin" : ""}`}
                />
                <span>{copy.retry}</span>
              </button>
              <ThemeToggle className="shrink-0" />
            </div>
          ) : (
            <>
              {!isMinimal && (
                <nav
                  className="hidden items-center gap-2 lg:gap-3 xl:gap-5 lg:flex flex-nowrap shrink-0"
                  aria-label="Main Navigation"
                >
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setServicesMenuOpen((prev) => !prev)}
                      aria-expanded={servicesMenuOpen}
                      aria-haspopup="true"
                      className="inline-flex items-center gap-1 text-[14px] font-medium text-gray-600 dark:text-gray-300 transition-colors hover:text-primary dark:hover:text-primary py-1 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>{copy.treatments}</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${
                          servicesMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {servicesMenuOpen && services.length > 0 && (
                      <div
                        role="menu"
                        className="absolute left-0 mt-2 w-64 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150"
                      >
                        <div className="max-h-80 overflow-y-auto space-y-1">
                          {services.map((svc) => (
                            <Link
                              key={svc.id}
                              href="/#treatments"
                              onClick={() => setServicesMenuOpen(false)}
                              role="menuitem"
                              className="block rounded-xl px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary transition-colors"
                            >
                              <div className="font-medium">{svc.title}</div>
                              {svc.shortDesc && (
                                <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                  {svc.shortDesc}
                                </div>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Link
                    href="/#why-us"
                    className="text-[14px] font-medium text-gray-600 dark:text-gray-300 transition-colors hover:text-primary dark:hover:text-primary py-1 whitespace-nowrap shrink-0"
                  >
                    {copy.whyUs || "Why Choose Us"}
                  </Link>

                  <Link
                    href="/#reviews"
                    className="text-[14px] font-medium text-gray-600 dark:text-gray-300 transition-colors hover:text-primary dark:hover:text-primary py-1 whitespace-nowrap shrink-0"
                  >
                    {copy.successStories}
                  </Link>

                  <Link
                    href="/#team"
                    className="text-[14px] font-medium text-gray-600 dark:text-gray-300 transition-colors hover:text-primary dark:hover:text-primary py-1 whitespace-nowrap shrink-0"
                  >
                    {copy.team}
                  </Link>

                  <Link
                    href="/#locations"
                    className="text-[14px] font-medium text-gray-600 dark:text-gray-300 transition-colors hover:text-primary dark:hover:text-primary py-1 whitespace-nowrap shrink-0"
                  >
                    {copy.locationsAndTiming}
                  </Link>

                  <Link
                    href="/#faq"
                    className="text-[14px] font-medium text-gray-600 dark:text-gray-300 transition-colors hover:text-primary dark:hover:text-primary py-1 whitespace-nowrap shrink-0"
                  >
                    {copy.faqs}
                  </Link>

                  <Link
                    href="/blog"
                    className="text-[14px] font-medium text-gray-600 dark:text-gray-300 transition-colors hover:text-primary dark:hover:text-primary py-1 whitespace-nowrap shrink-0"
                  >
                    {copy.blogs}
                  </Link>
                </nav>
              )}

              <div className="flex items-center gap-1.5 sm:gap-2 xl:gap-2.5 shrink-0 flex-nowrap">
                {!isMinimal && (
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="flex items-center justify-center h-9 w-9 xl:w-auto xl:h-auto xl:px-3 xl:py-1.5 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-300 transition-colors hover:border-primary/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer shrink-0 whitespace-nowrap"
                    aria-label="Open search dialog"
                  >
                    <Search className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden xl:inline ml-2">{copy.search}</span>
                    <kbd className="hidden xl:inline-block ml-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-1 text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                      ⌘K
                    </kbd>
                  </button>
                )}

                {/* Language Switcher */}
                <button
                  onClick={() => setLocale(locale === "en" ? "ur" : "en")}
                  className="rounded-full border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:border-primary/40 hover:text-primary transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                  aria-label="Toggle language"
                >
                  {locale === "en" ? "اردو" : "EN"}
                </button>

                <ThemeToggle className="shrink-0" />

                {/* Sticky Book CTA button */}
                <Button
                  href="/book"
                  variant="primary"
                  size="sm"
                  className="rounded-full shadow-subtle px-3.5 py-1.5 text-xs font-semibold shrink-0 whitespace-nowrap"
                >
                  <Calendar className="h-3.5 w-3.5 mr-1 shrink-0" />
                  <span className="whitespace-nowrap">{copy.book}</span>
                </Button>

                {!isMinimal && (
                  <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="grid h-9 w-9 place-items-center rounded-full border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white lg:hidden cursor-pointer shrink-0"
                    aria-label="Open mobile navigation"
                  >
                    <Menu className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {!isMinimal && !isUnavailable && (
        <SearchDialog
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {!isMinimal && !isUnavailable && (
        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          onOpenSearch={() => setSearchOpen(true)}
        />
      )}
    </>
  );
}

export default SiteHeader;
