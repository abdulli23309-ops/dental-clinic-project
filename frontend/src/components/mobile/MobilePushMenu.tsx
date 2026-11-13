"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, Phone, Calendar, MapPin, ChevronRight, Moon, Sun, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { resolveMediaUrl } from "@/lib/api";
import { getOpenStatus } from "@/lib/branchHours";
import { tap } from "@/lib/haptics";
import { useTheme } from "@/components/providers/theme-provider";

interface MobilePushMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobilePushMenu({ isOpen, onClose }: MobilePushMenuProps) {
  const { content, organization, locations, primaryLocation, locale, setLocale, copy } = usePublicContent();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("menu-open");
    } else {
      document.body.style.overflow = "";
      document.body.classList.remove("menu-open");
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("menu-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const brandName =
    content.general?.shortBrandName?.trim() ||
    content.general?.practiceName ||
    organization?.displayName ||
    organization?.name ||
    "DHDC";
  const rawLogoUrl = content.general?.logoUrl || organization?.logoUrl || null;
  const logoUrl = resolveMediaUrl(rawLogoUrl);

  const activeBranch = primaryLocation || (locations && locations[0]);
  const branchStatus = getOpenStatus(activeBranch?.hoursInfo || content.contact?.hoursSummary);
  const phone = activeBranch?.phone || content.general?.phone || organization?.contactPhone || "";

  const navLinks = [
    { href: "#treatments", label: copy.treatments || "Treatments We Offer", subtitle: "Specialized clinical procedures" },
    { href: "#team", label: copy.team || "Our Team", subtitle: "Board-certified dental specialists" },
    { href: "#why-us", label: "Why Choose Us", subtitle: "Micro-dentistry & patient-first care" },
    { href: "#stories", label: "Success Stories", subtitle: "Verified patient transformations" },
    { href: "#gallery", label: "Inside Our Clinic", subtitle: "Sterilization & diagnostic facilities" },
    { href: "#locations", label: copy.locationsAndTiming || "Locations & Timing", subtitle: "Islamabad · Lahore · Karachi" },
    { href: "#faqs", label: "Patient FAQs", subtitle: "Insurance, pricing & recovery" },
    { href: "/blog", label: "Dental Journal", subtitle: "Oral healthcare insights" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => {
              tap(6);
              onClose();
            }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Drawer Menu Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="relative w-full max-w-[340px] h-full bg-[#0B0F19]/95 text-white backdrop-blur-2xl border-l border-white/10 flex flex-col justify-between overflow-y-auto no-scrollbar shadow-2xl"
          >
            {/* Top Bar */}
            <div className="p-5 pb-3 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-white/95 ring-1 ring-black/5 dark:ring-2 dark:ring-primary/40 p-1 shadow-sm shrink-0">
                  <img
                    src={logoUrl || "/images/logo.png"}
                    alt={brandName}
                    className="h-full w-full object-contain"
                  />
                </span>
                <div>
                  <span className="font-serif text-lg font-bold tracking-tight text-white block leading-none">
                    {brandName}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-primary font-semibold block mt-0.5">
                    Dental Care
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  tap(8);
                  onClose();
                }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <div className="px-5 py-4 space-y-1 flex-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    tap(8);
                    onClose();
                  }}
                  className="group flex items-center justify-between py-3 px-3 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  <div>
                    <span className="font-serif text-[17px] font-semibold text-white/95 group-hover:text-primary transition-colors block">
                      {link.label}
                    </span>
                    <span className="text-[11px] text-white/50 block font-sans">
                      {link.subtitle}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </a>
              ))}
            </div>

            {/* Bottom Actions & Branch Card */}
            <div className="p-5 pt-3 border-t border-white/10 space-y-4 bg-black/30">
              {/* Live Branch Card */}
              {activeBranch && (
                <div className="rounded-2xl p-3.5 bg-white/5 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      {activeBranch.name || "Main Islamabad Branch"}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                        branchStatus.open
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {branchStatus.open ? "Open Now" : "Closed"}
                    </span>
                  </div>

                  <p className="text-[11px] text-white/60">
                    {branchStatus.label}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href={`tel:${phone.replace(/\s+/g, "")}`}
                      onClick={() => tap(8)}
                      className="h-9 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center gap-1.5 text-xs font-semibold text-white transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      <span>Call Branch</span>
                    </a>
                    <Link
                      href="/book"
                      onClick={() => {
                        tap(8);
                        onClose();
                      }}
                      className="h-9 rounded-xl bg-primary hover:bg-primary/90 flex items-center justify-center gap-1.5 text-xs font-semibold text-white shadow-md shadow-primary/30 transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Book Online</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
