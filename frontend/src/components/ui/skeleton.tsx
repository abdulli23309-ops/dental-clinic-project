import React from "react";
import { cn } from "@/lib/utils";

/**
 * Renders a gently pulsing placeholder box to represent content that is still loading.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-sand/50 dark:bg-sand/20",
        className
      )}
      {...props}
    />
  );
}

/**
 * Renders several rows of pulsing placeholder bars that mimic paragraphs of text while data loads.
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
 * Renders a rectangular placeholder with a set aspect ratio to prevent layout jumping while images load.
 */
export function SkeletonImage({
  aspectRatio = "aspect-[4/3]",
  className = "",
}: {
  aspectRatio?: string;
  className?: string;
}) {
  return <Skeleton className={cn("w-full rounded-lg", aspectRatio, className)} />;
}

/**
 * Renders an outline of a full content card with title and body lines to smooth out loading states.
 */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-cream/40 p-6 space-y-4",
        className
      )}
    >
      <Skeleton className="h-6 w-1/3" />
      <SkeletonText lines={3} />
      <div className="flex justify-between pt-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}
