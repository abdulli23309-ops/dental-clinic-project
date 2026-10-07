"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Menu, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SearchDialog } from "@/components/ui/search-dialog";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { AnnouncementMarquee } from "@/components/ui/announcement-marquee";

const NAV_LINKS = [
  { label: "Treatments & Fees", href: "/#services" },
  { label: "Clinical Philosophy", href: "/#commitments" },
  { label: "Clinical Team", href: "/#about" },
  { label: "Location & Hours", href: "/#visit" },
  { label: "FAQ", href: "/#faq" },
];

export interface SiteHeaderProps {
  variant?: "default" | "minimal";
}

/**
 * Renders the top navigation header with clinic branding, navigation links, live office status, and booking actions.
 * It supports a full standard view for marketing pages and a minimal view for focused flows like appointment scheduling.
 */
export function SiteHeader({ variant = "default" }: SiteHeaderProps) {
  const { content, primaryLocation, organization } = usePublicContent();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const practiceName = content.general?.practiceName || "Marlow Dental Complex";
  const orgDisplayName = (organization as { displayName?: string; display_name?: string } | null);
  const finalName = orgDisplayName?.displayName || orgDisplayName?.display_name || practiceName;

  const phone = content.general?.phone || primaryLocation?.phone || "(312) 555-0147";
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  const nameParts = finalName.split(" ");
  const firstNamePart = nameParts[0] || "Marlow";
  const restNameParts = nameParts.slice(1).join(" ") || "Dental";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
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
      {/* Accessible Skip Link */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Single Dynamic Top Marquee Strip */}
      {!isMinimal && <AnnouncementMarquee />}

      {/* Main Sticky Header */}
      <header
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          isScrolled
            ? "border-line/80 bg-bone/95 backdrop-blur-md shadow-card py-2.5"
            : "border-line/40 bg-bone/85 backdrop-blur-sm py-4"
        }`}
      >
        <div className="container-x flex items-center justify-between">
          {/* Brand Mark */}
          <Link
            href="/"
            className="group flex items-center gap-2.5 transition-transform active:scale-[0.98]"
            aria-label={`${practiceName} Homepage`}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-[#FAF7F2] shadow-subtle group-hover:brightness-90 transition-all">
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
            <span className="font-display text-[19px] tracking-tight text-ink leading-none">
              {firstNamePart}{" "}
              <span className="text-primary">{restNameParts}</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          {!isMinimal && (
            <nav className="hidden items-center gap-7 lg:flex" aria-label="Main Navigation">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-[13.5px] font-medium text-ink-soft transition-colors hover:text-primary relative py-1"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            {!isMinimal && (
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 rounded-full border border-line bg-cream/60 px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-primary/40 hover:text-ink hover:bg-sand/40"
                aria-label="Open search dialog"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden md:inline-block rounded border border-line bg-bone px-1 text-[10px] text-ink-soft font-mono">
                  ⌘K
                </kbd>
              </button>
            )}

            {/* Dark Mode Toggle */}
            <ThemeToggle />

            {/* Book CTA or Phone Link */}
            {isMinimal ? (
              <a
                href={`tel:${cleanPhone}`}
                className="text-xs font-semibold text-ink-soft hover:text-primary transition-colors"
              >
                Call {phone}
              </a>
            ) : (
              <Button
                href="/book"
                variant="primary"
                size="sm"
                className="hidden sm:inline-flex"
              >
                <span>Book a Visit</span>
              </Button>
            )}

            {/* Mobile Hamburger */}
            {!isMinimal && (
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-full border border-line bg-cream/70 text-ink-soft hover:text-ink lg:hidden"
                aria-label="Open mobile navigation"
              >
                <Menu className="h-4.5 w-4.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Full-Site Search Modal */}
      {!isMinimal && (
        <SearchDialog isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      )}

      {/* Accessible Mobile Drawer */}
      {!isMinimal && (
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
