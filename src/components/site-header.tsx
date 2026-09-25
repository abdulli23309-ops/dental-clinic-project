"use client";

import Link from "next/link";
import { useState } from "react";

const nav = [
  { label: "Services", href: "#services" },
  { label: "About Dr. Marlow", href: "#about" },
  { label: "Reviews", href: "#reviews" },
  { label: "Visit", href: "#visit" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-bone/85 backdrop-blur-md">
      {/* Utility strip */}
      <div className="hidden border-b border-line/60 bg-forest-deep text-bone/80 md:block">
        <div className="container-x flex h-9 items-center justify-between text-[11.5px] tracking-wide">
          <p>Accepting new patients · Same-week openings</p>
          <div className="flex items-center gap-6">
            <span>Mon–Thu 8–6 · Fri 8–2 · Sat 9–1</span>
            <a href="tel:+13125550147" className="hover:text-bone">
              (312) 555-0147
            </a>
          </div>
        </div>
      </div>

      <div className="container-x flex h-[68px] items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-forest text-bone">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 4c-2.5 0-3.2 1.2-4.6 1.2C6 5.2 4.5 6.6 4.5 9.2c0 3.4 1.7 6 2.6 8.6.6 1.7 1 3 2.1 3 1.2 0 1.3-1.6 1.5-3.3.15-1.4.5-2.5 1.3-2.5s1.15 1.1 1.3 2.5c.2 1.7.3 3.3 1.5 3.3 1.1 0 1.5-1.3 2.1-3 .9-2.6 2.6-5.2 2.6-8.6 0-2.6-1.5-4-2.9-4C15.2 5.2 14.5 4 12 4Z" />
            </svg>
          </span>
          <span className="font-display text-[19px] tracking-tight">
            Marlow <span className="text-forest">Dental</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-[13.5px] text-ink-soft transition-colors hover:text-forest"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/book"
            className="hidden rounded-full bg-forest px-5 py-2.5 text-[13px] font-medium tracking-wide text-bone transition-colors hover:bg-forest-deep md:inline-block"
          >
            Book a visit
          </Link>
          <button
            onClick={() => setOpen(!open)}
            className="grid h-10 w-10 place-items-center lg:hidden"
            aria-label="Menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-bone lg:hidden">
          <div className="container-x flex flex-col py-4">
            {nav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-line/70 py-3 text-[15px] text-ink-soft"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/book"
              onClick={() => setOpen(false)}
              className="mt-4 rounded-full bg-forest px-5 py-3 text-center text-[14px] font-medium text-bone"
            >
              Book a visit
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}