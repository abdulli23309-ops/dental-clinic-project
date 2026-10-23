"use client";

import { motion, AnimatePresence, useReducedMotion, type HTMLMotionProps } from "motion/react";
import React, { ReactNode } from "react";
import { pageTransition } from "@/animations/variants";
import { cn } from "@/lib/utils";

/**
 * AnimatedPage wraps the contents of a route so that switching pages
 * fades/slides smoothly instead of swapping instantly.
 *
 * Respects prefers-reduced-motion by rendering a plain div.
 * Uses initial={false} to ensure SSR and initial hydration never freeze at opacity: 0.
 */
export interface AnimatedPageProps
  extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  className?: string;
}

export function AnimatedPage({
  children,
  className = "",
  ...props
}: AnimatedPageProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={cn("min-h-screen flex flex-col", className)}>{children}</div>;
  }

  return (
    <motion.div
      initial={false}
      animate="animate"
      exit="exit"
      variants={pageTransition}
      className={cn("min-h-screen flex flex-col", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * AnimatedPageSwitch is a convenience wrapper that combines AnimatePresence
 * with AnimatedPage for layouts that manage their own route key.
 */
export interface AnimatedPageSwitchProps {
  key: string | number;
  children: ReactNode;
  className?: string;
}

export function AnimatedPageSwitch({
  key: viewKey,
  children,
  className = "",
}: AnimatedPageSwitchProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={cn("min-h-screen flex flex-col", className)}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <AnimatedPage key={viewKey} className={className}>
        {children}
      </AnimatedPage>
    </AnimatePresence>
  );
}

export default AnimatedPage;
