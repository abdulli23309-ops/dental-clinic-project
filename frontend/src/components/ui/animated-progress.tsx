"use client";

import { motion, useReducedMotion, useMotionValue, useSpring, useTransform } from "motion/react";
import React from "react";
import { cn } from "@/lib/utils";

/**
 * AnimatedProgress fills from 0 to its target value on mount (or when `value`
 * changes), using a spring so it feels soft and fast. Renders nothing but
 * transform/opacity-compatible properties for performance.
 *
 * Respects prefers-reduced-motion by snapping to the final value instantly.
 */
export interface AnimatedProgressProps {
  /** Value between 0 and 100. */
  value: number;
  className?: string;
  trackClassName?: string;
  label?: string;
  valueClassName?: string;
  animateOnMount?: boolean;
}

export function AnimatedProgress({
  value,
  className = "",
  trackClassName = "",
  label,
  valueClassName = "",
  animateOnMount = true,
}: AnimatedProgressProps) {
  const shouldReduceMotion = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, value));

  const progressValue = useMotionValue(shouldReduceMotion || !animateOnMount ? clamped : 0);
  const springProgress = useSpring(progressValue, {
    stiffness: 300,
    damping: 22,
  });

  const widthPercent = useTransform(springProgress, (v) => `${Math.min(100, Math.max(0, v))}%`);

  return (
    <div className={cn("w-full rounded-full border border-line bg-sand/40 dark:bg-sand/30", className)}>
      <motion.div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          "relative h-2 overflow-hidden rounded-full bg-primary shadow-[inset_0_0_4px_rgba(0,0,0,0.15)]",
          valueClassName,
        )}
        style={{ width: widthPercent }}
      >
        <div className="h-full bg-[var(--color-primary)] dark:bg-emerald-400" />
      </motion.div>
      {label && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          className="absolute -top-8 right-0 text-[10px] font-mono font-semibold text-ink-soft"
        >
          {clamped}%
        </motion.span>
      )}
    </div>
  );
}

export default AnimatedProgress;
