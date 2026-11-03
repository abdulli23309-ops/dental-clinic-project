"use client";

import React, { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}

/**
 * Pull to Refresh (Mobile Appointments & Lists):
 * Applies 35% friction so the list only moves 35% of the total distance the finger travels
 * (e.g., finger drags 100px, list moves 35px).
 */
export function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 50,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const shouldReduceMotion = useReducedMotion();

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isRefreshing) return;
    const scrollEl = containerRef.current;
    if (scrollEl && scrollEl.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const rawDelta = currentY - startYRef.current;

    if (rawDelta > 0) {
      // Apply exactly 35% friction
      const frictionDistance = rawDelta * 0.35;
      setPullDistance(frictionDistance);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  const progress = Math.min(1, pullDistance / threshold);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn("relative overflow-x-hidden", className)}
    >
      {/* Pull Indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-20"
        style={{
          height: `${threshold}px`,
          transform: `translateY(${pullDistance - threshold}px)`,
          opacity: progress,
          transition: isDragging ? "none" : "transform 0.3s ease-out, opacity 0.3s ease-out",
        }}
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200">
          {isRefreshing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Refreshing appointments...</span>
            </>
          ) : (
            <>
              <motion.div
                animate={{ rotate: progress >= 1 ? 180 : progress * 180 }}
                transition={{ duration: 0.15 }}
              >
                <ArrowDown className="w-3.5 h-3.5 text-primary" />
              </motion.div>
              <span>{progress >= 1 ? "Release to refresh" : "Pull down to refresh"}</span>
            </>
          )}
        </div>
      </div>

      {/* Main Content with 35% friction translation */}
      <div
        style={{
          transform: shouldReduceMotion
            ? "none"
            : `translate3d(0, ${pullDistance}px, 0)`,
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default PullToRefresh;

