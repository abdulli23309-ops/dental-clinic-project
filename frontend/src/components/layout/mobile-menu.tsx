"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Phone, Calendar, MapPin, Clock, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AnimatedHamburger } from "@/components/ui/animated-hamburger";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { modalOverlay, drawerSlide } from "@/animations/variants";
import { getUiCopy } from "@/content/ui-copy";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
}

export function MobileMenu({ isOpen, onClose, onOpenSearch }: MobileMenuProps) {
  const { content, primaryLocation, organization, locale, setLocale } = usePublicContent();
  const containerRef = useRef<HTMLDivElement>(null);
  const copy = getUiCopy("en");

  const practiceName =
    content.general?.practiceName ||
    organization?.displayName ||
    organization?.name ||
    "";
  const phone = content.general?.phone || primaryLocation?.phone || "";
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  const addressText = primaryLocation?.addressLine1 || "";
  const cityState = [primaryLocation?.city, primaryLocation?.state]
    .filter(Boolean)
    .join(", ");
  const hoursText = primaryLocation?.hoursInfo || "";

  const navItems = [
    { label: copy.treatments, href: "/#treatments" },
    { label: copy.whyUs || "Why Choose Us", href: "/#why-us" },
    { label: copy.successStories, href: "/#reviews" },
    { label: copy.team, href: "/#team" },
    { label: copy.locationsAndTiming, href: "/#locations" },
    { label: copy.faqs, href: "/#faq" },
    { label: copy.blogs, href: "/blog" },
  ];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
        >
          {/* Glassmorphic backdrop with blur */}
          <motion.div
            variants={modalOverlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/60 backdrop-blur-md cursor-pointer"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sliding Glassmorphic Drawer */}
          <motion.div
            ref={containerRef}
            variants={drawerSlide}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-y-0 right-0 flex w-full max-w-sm flex-col justify-between border-l border-white/20 dark:border-white/10 bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl p-6 shadow-2xl"
          >
            <div className="space-y-5">
              {/* Header with Title and Animated Hamburger / Close */}
              <div className="flex items-center justify-between border-b border-gray-200/60 dark:border-gray-800/60 pb-4">
                {practiceName ? (
                  <span className="font-display text-base font-semibold tracking-tight text-gray-900 dark:text-white">
                    {practiceName}
                  </span>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLocale(locale === "en" ? "ur" : "en")}
                    className="rounded-full border border-gray-200/80 dark:border-gray-800/80 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:border-primary/40 hover:text-primary transition-colors cursor-pointer shrink-0 whitespace-nowrap shadow-sm"
                    aria-label="Toggle language"
                  >
                    {locale === "en" ? "اردو" : "EN"}
                  </button>
                  <ThemeToggle />
                  <AnimatedHamburger
                    isOpen={true}
                    onClick={onClose}
                    aria-label="Close navigation menu"
                  />
                </div>
              </div>

              {/* Search Trigger with Glass styling */}
              <button
                onClick={() => {
                  onClose();
                  onOpenSearch();
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md px-4 py-3 text-sm text-gray-600 dark:text-gray-300 hover:border-primary/40 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer shadow-sm group"
              >
                <span className="flex items-center gap-2.5">
                  <Search className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                  <span className="font-medium">{copy.search}</span>
                </span>
                <span className="hidden md:inline-flex text-[11px] font-mono px-2 py-0.5 rounded-md border border-gray-200/60 dark:border-gray-700/60 bg-gray-100/60 dark:bg-gray-800/60 text-gray-400">
                  ⌘K
                </span>
              </button>

              {/* Navigation Items with Rounded Corners & Glass Hover */}
              <nav className="flex flex-col space-y-1 pt-1">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    className="rounded-2xl px-4 py-2.5 text-[15px] font-medium text-gray-700 dark:text-gray-200 transition-all hover:bg-white/80 dark:hover:bg-gray-800/60 hover:text-primary dark:hover:text-primary hover:shadow-sm"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Footer Section with Glass Card info and CTA */}
            <div className="border-t border-gray-200/60 dark:border-gray-800/60 pt-5 space-y-4">
              {(addressText || hoursText || phone) && (
                <div className="rounded-2xl p-4 bg-white/50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-800/60 backdrop-blur-sm space-y-2.5 text-xs text-gray-600 dark:text-gray-400 shadow-sm">
                  {addressText && (
                    <div className="flex items-center gap-2.5">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <span>
                        {addressText}
                        {cityState ? `, ${cityState}` : ""}
                      </span>
                    </div>
                  )}
                  {hoursText && (
                    <div className="flex items-center gap-2.5">
                      <Clock className="h-4 w-4 text-primary shrink-0" />
                      <span>{hoursText}</span>
                    </div>
                  )}
                  {phone && (
                    <div className="flex items-center gap-2.5">
                      <Phone className="h-4 w-4 text-primary shrink-0" />
                      <a href={`tel:${cleanPhone}`} className="hover:text-primary font-semibold text-gray-800 dark:text-gray-200">
                        {phone}
                      </a>
                    </div>
                  )}
                </div>
              )}

              <Button
                href="/book"
                variant="primary"
                size="md"
                className="w-full justify-center rounded-2xl shadow-md py-3 text-sm font-semibold"
                onClick={onClose}
              >
                <Calendar className="h-4 w-4 mr-2" />
                <span>{copy.book}</span>
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default MobileMenu;
