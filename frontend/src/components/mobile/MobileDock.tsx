"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Home, Stethoscope, Users, Phone, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { useMobileBooking } from "@/components/mobile/MobileBookingSheet";
import { tap } from "@/lib/haptics";

export function MobileDock() {
  const { content, primaryLocation, organization } = usePublicContent();
  const { openBooking } = useMobileBooking();
  const [activeTab, setActiveTab] = useState<string>("home");

  const phone =
    content.general?.phone ||
    primaryLocation?.phone ||
    organization?.contactPhone ||
    "";

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      const treatmentsSection = document.getElementById("treatments");
      const teamSection = document.getElementById("team");

      if (teamSection && scrollPos >= teamSection.offsetTop) {
        setActiveTab("team");
      } else if (treatmentsSection && scrollPos >= treatmentsSection.offsetTop) {
        setActiveTab("treatments");
      } else {
        setActiveTab("home");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 inset-x-0 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] z-50 md:hidden"
    >
      <div className="pointer-events-auto max-w-[370px] mx-auto h-16 rounded-full bg-white/92 dark:bg-[#0d1322]/92 backdrop-blur-2xl border border-slate-200/80 dark:border-white/12 shadow-[0_16px_40px_rgba(0,0,0,0.35)] px-3 flex items-center justify-around">
        {/* 1. Home */}
        <a
          href="#"
          onClick={() => {
            tap(8);
            setActiveTab("home");
          }}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-full relative transition-colors ${
            activeTab === "home"
              ? "text-primary font-semibold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
          aria-label="Navigate to top of page"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Home</span>
          {activeTab === "home" && (
            <motion.span
              layoutId="mobile-dock-active"
              className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary"
            />
          )}
        </a>

        {/* 2. Treatments */}
        <a
          href="#treatments"
          onClick={() => {
            tap(8);
            setActiveTab("treatments");
          }}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-full relative transition-colors ${
            activeTab === "treatments"
              ? "text-primary font-semibold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
          aria-label="Scroll to treatments"
        >
          <Stethoscope className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Services</span>
          {activeTab === "treatments" && (
            <motion.span
              layoutId="mobile-dock-active"
              className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary"
            />
          )}
        </a>

        {/* 3. Raised Center Book Circle */}
        <button
          type="button"
          onClick={() => {
            tap(12);
            openBooking();
          }}
          className="w-14 h-14 -mt-5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          aria-label="Book an appointment online"
        >
          <Calendar className="w-5 h-5 text-white" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-white mt-0.5">Book</span>
        </button>

        {/* 4. Team */}
        <a
          href="#team"
          onClick={() => {
            tap(8);
            setActiveTab("team");
          }}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-full relative transition-colors ${
            activeTab === "team"
              ? "text-primary font-semibold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
          aria-label="Scroll to clinical team"
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Doctors</span>
          {activeTab === "team" && (
            <motion.span
              layoutId="mobile-dock-active"
              className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary"
            />
          )}
        </a>

        {/* 5. Call */}
        <a
          href={`tel:${phone.replace(/\s+/g, "")}`}
          onClick={() => tap(8)}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          aria-label={`Call clinic at ${phone}`}
        >
          <Phone className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Call</span>
        </a>
      </div>
    </nav>
  );
}
