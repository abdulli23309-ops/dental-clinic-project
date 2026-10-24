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
import { getUiCopy } from "@/content/ui-copy";
import { getServices, ServiceItem } from "@/lib/api";

export interface SiteHeaderProps {
  variant?: "default" | "minimal";
}

export function SiteHeader({ variant = "default" }: SiteHeaderProps) {
  const { content, primaryLocation, organization, isUnavailable, retry, status } =
    usePublicContent();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);

  const copy = getUiCopy("en");

  const practiceName =
    organization?.displayName ||
    organization?.name ||
    content.general?.practiceName ||
    "";
  const phone = content.general?.phone || primaryLocation?.phone || "";
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

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
            ? "border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md shadow-sm py-2.5"
            : "border-gray-200/80 dark:border-gray-800/80 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm py-4"
        }`}
      >
        <div className="container-x flex items-center justify-between">
          <Link
            href="/"
            className="group flex items-center gap-2.5 transition-transform active:scale-[0.98]"
            aria-label={practiceName ? `${practiceName} Homepage` : "Homepage"}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-white shadow-subtle group-hover:brightness-90 transition-all">
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
            {practiceName ? (
              <span className="font-display text-[19px] tracking-tight text-gray-900 dark:text-white leading-none">
                {practiceName}
              </span>
            ) : null}
          </Link>

          {isUnavailable ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => retry()}
                disabled={status === "loading"}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin" : ""}`}
                />
                <span>{copy.retry}</span>
              </button>
              <ThemeToggle />
            </div>
          ) : (
            <>
              {!isMinimal && (
                <nav
                  className="hidden items-center gap-6 lg:flex"
                  aria-label="Main Navigation"
                >
                  <div className="relative">
                    <button
                      onClick={() => setServicesMenuOpen((prev) => !prev)}
                      aria-expanded={servicesMenuOpen}
                      aria-haspopup="true"
                      className="inline-flex items-center gap-1 text-[13.5px] font-medium text-gray-600 dark:text-gray-300 transition-colors hover:text-primary dark:hover:text-primary py-1 cursor-pointer"
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
                              href="/#services"
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
                    href="/#commitments"
                    className="text-[13.5px] font-medium text-gray-600 dark:text-gray-300 transition-colors hover:text-primary dark:hover:text-primary py-1"
                  >
                    {copy.successStories}
                  </Link>

                  <Link
                    href="/#team"
                    className="text-[13.5px] font-medium text-gray-600 dark:text-gray-300 transition-colors hover:text-primary dark:hover:text-primary py-1"
                  >
                    {copy.team}
                  </Link>

                  <Link
                    href="/#visit"
                    className="text-[13.5px] font-medium text-gray-600 dark:text-gray-300 transition-colors hover:text-primary dark:hover:text-primary py-1"
                  >
                    {copy.locationsAndTiming}
                  </Link>

                  <Link
                    href="/#faq"
                    className="text-[13.5px] font-medium text-gray-600 dark:text-gray-300 transition-colors hover:text-primary dark:hover:text-primary py-1"
                  >
                    {copy.faqs}
                  </Link>
                </nav>
              )}

              <div className="flex items-center gap-3">
                {!isMinimal && (
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 transition-colors hover:border-primary/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer"
                    aria-label="Open search dialog"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{copy.search}</span>
                    <kbd className="hidden md:inline-block rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-1 text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                      ⌘K
                    </kbd>
                  </button>
                )}

                <ThemeToggle />

                {isMinimal && phone ? (
                  <a
                    href={`tel:${cleanPhone}`}
                    className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                  >
                    {copy.call} {phone}
                  </a>
                ) : (
                  <Button
                    href="/book"
                    variant="primary"
                    size="sm"
                    className="hidden sm:inline-flex"
                  >
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    <span>{copy.book}</span>
                  </Button>
                )}

                {!isMinimal && (
                  <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="grid h-9 w-9 place-items-center rounded-full border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white lg:hidden cursor-pointer"
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
