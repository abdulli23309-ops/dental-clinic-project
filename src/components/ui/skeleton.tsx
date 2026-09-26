import React from "react";
import { cn } from "@/lib/utils";

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

export function SkeletonImage({
  aspectRatio = "aspect-[4/3]",
  className = "",
}: {
  aspectRatio?: string;
  className?: string;
}) {
  return <Skeleton className={cn("w-full rounded-lg", aspectRatio, className)} />;
}

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
