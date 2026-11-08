import React from "react";
import { cn } from "@/lib/utils";

/**
 * Global Shimmering Loading Skeleton (4-Line CSS Shimmer)
 * Core CSS:
 * - bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 (adapted for dark mode)
 * - background-size: 200% 100%
 * - animation: shimmer-sweep 1.2s linear infinite
 */
export function Skeleton({
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 animate-shimmer",
        className
      )}
      style={{
        backgroundSize: "200% 100%",
        animation: "shimmer 1.2s linear infinite",
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * Multi-line paragraph skeleton with shimmer.
 */
export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-3/5" : i === 0 ? "w-full" : "w-4/5"
          )}
        />
      ))}
    </div>
  );
}

/**
 * Rectangular image placeholder skeleton with shimmer.
 */
export function SkeletonImage({
  className = "",
  aspectRatio = "aspect-video",
}: {
  className?: string;
  aspectRatio?: string;
}) {
  return (
    <Skeleton className={cn("w-full rounded-2xl", aspectRatio, className)} />
  );
}

/**
 * Table row skeleton with multiple columns for data tables.
 */
export function SkeletonTableRow({
  cols = 5,
  className = "",
}: {
  cols?: number;
  className?: string;
}) {
  return (
    <tr className={cn("border-b border-border/50", className)}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className={cn("h-4", i === 0 ? "w-32" : i === 1 ? "w-20" : "w-24")} />
        </td>
      ))}
    </tr>
  );
}

/**
 * Card skeleton with header, body lines, and actions.
 */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={cn("p-6 rounded-2xl border border-border/60 bg-card space-y-4 shadow-xs", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="pt-4 border-t border-border/40 flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}
