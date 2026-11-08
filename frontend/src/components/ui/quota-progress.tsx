import React from "react";
import { Lock, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuotaProgressProps {
  label: string;
  current: number;
  max: number;
  unit?: string;
  showUpgrade?: boolean;
  onUpgrade?: () => void;
  className?: string;
}

/**
 * Usage progress bar with threshold color transitions and gated upgrade prompt.
 */
export function QuotaProgress({
  label,
  current,
  max,
  unit = "",
  showUpgrade = false,
  onUpgrade,
  className,
}: QuotaProgressProps) {
  const percentage = Math.min(100, Math.round((current / Math.max(1, max)) * 100));
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className={cn("space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </span>
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className={cn(isAtLimit ? "text-rose-600 font-bold" : "text-slate-900 dark:text-white font-medium")}>
            {current}
          </span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-500">{max} {unit}</span>
        </div>
      </div>

      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isAtLimit
              ? "bg-rose-500"
              : isNearLimit
              ? "bg-amber-500"
              : "bg-primary"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {showUpgrade && isNearLimit && (
        <div className="flex items-center justify-between pt-1 text-[11px]">
          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Capacity quota reached ({percentage}%)</span>
          </span>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="text-primary hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              <span>Upgrade Tier</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

