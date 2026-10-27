"use client";

import React, { ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface AnimatedViewProps {
  viewKey: string | number;
  children: ReactNode;
  className?: string;
}

/**
 * Animated view container for tab and screen transitions:
 * Wraps view content in AnimatePresence mode="wait" with subtle slide and fade cues.
 * Respects prefers-reduced-motion.
 */
export function AnimatedView({ viewKey, children, className = "" }: AnimatedViewProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        className={cn("w-full", className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default AnimatedView;
