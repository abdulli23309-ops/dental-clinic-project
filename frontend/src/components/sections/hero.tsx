"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { ArrowRight, Phone, ShieldCheck, CheckCircle2 } from "lucide-react";

/**
 * Renders the introductory hero section of the home page.
 * It introduces the practice's human-centered philosophy, key credentials, office direct line, and primary booking buttons.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 lg:pt-20 lg:pb-28">
      {/* Subtle Spatial Depth Ambient Glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-[700px] -translate-x-1/2 rounded-full bg-forest/8 blur-3xl dark:bg-emerald-500/10"
        aria-hidden="true"
      />

      <div className="container-x">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14 items-center">
          {/* Main Hero Copy - 7 cols */}
          <div className="lg:col-span-7 space-y-6">
            {/* Practice Badge */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-cream/80 px-3.5 py-1 text-xs text-ink-soft backdrop-blur-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-forest dark:bg-emerald-400" />
              <span className="font-semibold text-clay uppercase tracking-wider text-[10.5px]">
                Lincoln Park, Chicago
              </span>
              <span className="text-ink-soft/40">·</span>
              <span>Independent Practice Est. 2014</span>
            </motion.div>

            {/* Display Headline with gentle typographic reveal */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="fluid-h1 text-ink font-normal"
            >
              Dentistry
              <br />
              without
              <br />
              <span className="relative inline-block text-forest dark:text-emerald-400">
                the dread.
                <svg
                  viewBox="0 0 300 16"
                  preserveAspectRatio="none"
                  className="absolute -bottom-1 left-0 h-3 w-full text-clay/70"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 10c70-7 150-7 296-3"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </motion.h1>

            {/* Reassuring Body Copy */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="max-w-xl text-[16px] sm:text-[17px] leading-[1.65] text-ink-soft font-normal"
            >
              Marlow Dental is a single-dentist practice on Alder Street. We run on time, walk you through every digital X-ray before we touch a tooth, and give you an itemized written estimate first. Never high-pressure sales, and no surprise bills.
            </motion.p>

            {/* Action Group */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24 }}
              className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5"
            >
              <Button href="/book" variant="primary" size="lg">
                <span>Book an appointment</span>
                <ArrowRight className="h-4 w-4 ml-0.5" />
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  href="tel:+13125550147"
                  variant="outline"
                  size="lg"
                  className="flex-1 sm:flex-initial"
                >
                  <Phone className="h-4 w-4 text-forest" />
                  <span>Call (312) 555-0147</span>
                </Button>
                <CopyButton text="(312) 555-0147" label="Copy" className="h-11 px-3" />
              </div>
            </motion.div>

            {/* Verified Clinical Commitments */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="pt-6 border-t border-line/70 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-ink-soft"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-forest dark:text-emerald-400 shrink-0" />
                <span>One dentist, start to finish</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-forest dark:text-emerald-400 shrink-0" />
                <span>Written estimates first</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-forest dark:text-emerald-400 shrink-0" />
                <span>Same-week openings</span>
              </div>
            </motion.div>
          </div>

          {/* Spatial Layered Composition - 5 cols */}
          <div className="lg:col-span-5 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative mx-auto aspect-[4/5] max-w-md overflow-hidden rounded-[var(--radius-card)] border border-line bg-cream shadow-card"
            >
              <img
                src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=1200&auto=format&fit=crop"
                alt="Operatory at Marlow Dental in Lincoln Park, Chicago"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/60 via-transparent to-transparent pointer-events-none" />

              <div className="absolute bottom-4 left-4 right-4 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-sand/90">
                  Lincoln Park Operatory
                </p>
                <p className="text-sm font-medium mt-0.5">
                  Natural daylight, quiet single-chair suite, unhurried care
                </p>
              </div>
            </motion.div>

            {/* Verified Doctor Credential Card with subtle hover tilt */}
            <div
              className="group/card absolute -bottom-6 -left-2 sm:-left-6 max-w-[240px] rounded-[var(--radius-card)] border border-line bg-bone p-4 shadow-elevated backdrop-blur-md transition-transform duration-300 md:hover:-translate-y-1"
              style={{ perspective: "600px" }}
            >
              <div className="flex items-center gap-1.5 text-clay">
                <ShieldCheck className="h-3.5 w-3.5" />
                <p className="text-[10px] font-bold uppercase tracking-widest">
                  Lead Practitioner
                </p>
              </div>
              <p className="mt-1 font-display text-[16px] leading-tight text-ink font-medium">
                Dr. Sarah Marlow, DDS
              </p>
              <p className="mt-1 text-[11.5px] leading-tight text-ink-soft">
                Univ. of Michigan School of Dentistry
              </p>
              <p className="mt-1 text-[10.5px] text-forest dark:text-emerald-400 font-mono">
                IL License #019.029811
              </p>
            </div>
          </div>
        </div>

        {/* Scroll Cue */}
        <div className="mt-14 sm:mt-16 flex justify-center">
          <a
            href="#commitments"
            className="group flex flex-col items-center gap-1 text-[11px] uppercase tracking-widest text-ink-soft/70 hover:text-forest transition-colors"
          >
            <span>Explore Clinical Commitments</span>
            <div className="h-6 w-3.5 rounded-full border border-line flex items-start justify-center p-0.5">
              <span className="h-1.5 w-1 rounded-full bg-forest dark:bg-emerald-400 animate-bounce" />
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
export default Hero;
