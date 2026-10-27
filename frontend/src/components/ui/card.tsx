"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  shadow?: "flat" | "subtle" | "card" | "elevated" | "modal";
  surface?: "bone" | "cream" | "sand";
  hoverLift?: boolean;
  animate?: boolean;
  index?: number;
  children: React.ReactNode;
}

/**
 * Renders a styled surface container with rounded corners, subtle warm shadows,
 * staggered entrance animation, and subtle hover elevation.
 * Used across sections, workspaces, and dashboards to group clinical and operational cards.
 */
export function Card({
  shadow = "subtle",
  surface = "bone",
  hoverLift = true,
  animate = true,
  index = 0,
  className,
  children,
  ...props
}: CardProps) {
  const shouldReduceMotion = useReducedMotion();

  const surfaceStyles = {
    bone: "bg-white dark:bg-[#121316] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white",
    cream: "bg-white dark:bg-[#121316] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white",
    sand: "bg-gray-50 dark:bg-[#1A1C20] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white",
  };

  const shadowStyles = {
    flat: "",
    subtle: "shadow-subtle",
    card: "shadow-card",
    elevated: "shadow-elevated",
    modal: "shadow-modal",
  };

  const baseClassName = cn(
    "rounded-2xl border transition-colors duration-200",
    surfaceStyles[surface],
    shadowStyles[shadow],
    hoverLift && "hover:border-primary/40",
    className
  );

  if (shouldReduceMotion || !animate) {
    return (
      <div
        className={cn(baseClassName, hoverLift && "hover:-translate-y-1")}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.05, 0.35),
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={hoverLift ? { y: -3, transition: { duration: 0.2 } } : undefined}
      className={baseClassName}
      {...(props as React.ComponentPropsWithoutRef<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}

export default Card;
