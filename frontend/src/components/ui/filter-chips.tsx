"use client";

import React from "react";
import { X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterChipItem {
  key: string;
  label: string;
  value: string;
  displayValue?: string;
}

export interface FilterChipsProps {
  chips: FilterChipItem[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
  className?: string;
}

/**
 * Renders active filter chips with remove triggers and a "Clear all" button.
 */
export function FilterChips({
  chips,
  onRemove,
  onClearAll,
  className,
}: FilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2 pt-2", className)}>
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
        Active Filters:
      </span>

      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20 dark:border-primary/30"
        >
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {chip.label}:
          </span>
          <span>{chip.displayValue || chip.value}</span>
          <button
            onClick={() => onRemove(chip.key)}
            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors cursor-pointer"
            aria-label={`Remove filter ${chip.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      <button
        onClick={onClearAll}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors underline cursor-pointer ml-1"
      >
        <RotateCcw className="w-3 h-3" />
        <span>Reset filters</span>
      </button>
    </div>
  );
}

