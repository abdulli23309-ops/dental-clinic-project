"use client";

import React, { useRef, useState, useEffect } from "react";
import { tap } from "@/lib/haptics";

export interface FilterChipOption {
  id: string;
  label: string;
  count?: number;
}

interface FilterChipsProps {
  options: FilterChipOption[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function FilterChips({
  options,
  activeId,
  onChange,
  className = "",
}: FilterChipsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (!containerRef.current) return;
    const { scrollLeft, clientWidth, scrollWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  };

  useEffect(() => {
    checkScroll();
  }, [options]);

  return (
    <div
      ref={containerRef}
      onScroll={checkScroll}
      className={`flex gap-2 overflow-x-auto no-scrollbar snap-x -mx-4 px-5 py-1.5 transition-all ${
        canScrollLeft && canScrollRight
          ? "edge-mask"
          : canScrollLeft
          ? "[mask-image:linear-gradient(90deg,transparent_0,#000_20px,#000_100%)]"
          : canScrollRight
          ? "[mask-image:linear-gradient(90deg,#000_0,#000_calc(100%-20px),transparent_100%)]"
          : ""
      } ${className}`}
    >
      {options.map((opt) => {
        const isActive = opt.id === activeId;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={(e) => {
              tap(6);
              onChange(opt.id);
              (e.currentTarget as HTMLElement).scrollIntoView({
                inline: "center",
                behavior: "smooth",
                block: "nearest",
              });
            }}
            className={`h-9 px-3.5 rounded-full text-xs font-semibold shrink-0 snap-start flex items-center gap-1.5 transition-all select-none cursor-pointer ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                : "bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span>{opt.label}</span>
            {typeof opt.count === "number" && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
