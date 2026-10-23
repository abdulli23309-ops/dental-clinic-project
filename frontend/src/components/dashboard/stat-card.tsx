"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { AnimatedCard } from "@/components/ui/animated-card";
import { AnimatedNumber } from "@/components/ui/animated-number";

export type StatTone = "neutral" | "positive" | "warning" | "info" | "danger";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: StatTone;
  href?: string;
  className?: string;
  index?: number;
}

const TONE_STYLES: Record<StatTone, { value: string; label: string }> = {
  neutral: { value: "text-ink", label: "text-ink-soft" },
  positive: { value: "text-primary dark:text-emerald-400", label: "text-primary dark:text-emerald-400" },
  warning: { value: "text-amber-600 dark:text-amber-400", label: "text-amber-700 dark:text-amber-400" },
  info: { value: "text-blue-600 dark:text-blue-400", label: "text-blue-700 dark:text-blue-400" },
  danger: { value: "text-red-600 dark:text-red-400", label: "text-red-700 dark:text-red-400" },
};

/**
 * Compact dashboard metric card.
 * Uses AnimatedCard for staggered entrance and subtle hover lift.
 * Uses AnimatedNumber to tween numeric counts and currency values.
 */
export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  href,
  className,
  index = 0,
}: StatCardProps) {
  const styles = TONE_STYLES[tone];

  let displayValue: React.ReactNode = value;
  if (typeof value === "number") {
    displayValue = <AnimatedNumber value={value} />;
  } else if (typeof value === "string") {
    const match = value.match(/^([^0-9.-]*)([\d,]+(?:\.\d+)?)([^0-9]*)$/);
    if (match) {
      const prefix = match[1];
      const rawNum = parseFloat(match[2].replace(/,/g, ""));
      const suffix = match[3];
      if (!isNaN(rawNum)) {
        const decimals = match[2].includes(".") ? match[2].split(".")[1].length : 0;
        displayValue = (
          <AnimatedNumber
            value={rawNum}
            prefix={prefix}
            suffix={suffix}
            decimals={decimals}
          />
        );
      }
    }
  }

  const body = (
    <>
      <p className={cn("text-[11px] font-medium truncate", styles.label)}>{label}</p>
      <p className={cn("text-2xl font-display font-normal leading-none mt-1.5", styles.value)}>
        {displayValue}
      </p>
      {hint && <p className="mt-1.5 text-[11px] text-ink-soft truncate">{hint}</p>}
    </>
  );

  if (href) {
    return (
      <AnimatedCard index={index} className={cn("h-full", className)}>
        <Link
          href={href}
          className="block h-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs p-3.5 transition-colors hover:border-primary/40"
        >
          {body}
        </Link>
      </AnimatedCard>
    );
  }

  return (
    <AnimatedCard index={index} className={cn("h-full", className)}>
      <Card surface="bone" shadow="subtle" className="h-full p-3.5">
        {body}
      </Card>
    </AnimatedCard>
  );
}

export default StatCard;
