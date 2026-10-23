"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import React, { ReactNode } from "react";
import { staggerContainer, reducedVariant } from "@/animations/variants";
import { cn } from "@/lib/utils";

/**
 * StaggerList renders a container whose children fade up one after another
 * (staggerChildren 0.08s). Ideal for grids of cards, stat rows, and section
 * content groups that should reveal in sequence rather than all at once.
 *
 * Pass children as elements; each child that should participate in the
 * stagger should be wrapped in a `motion` element (or use `StaggerItem`).
 */
export interface StaggerListProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  className?: string;
  /** Override the stagger delay between children (seconds). */
  stagger?: number;
}

export function StaggerList({
  children,
  className = "",
  stagger = 0.08,
  ...props
}: StaggerListProps) {
  const shouldReduceMotion = useReducedMotion();

  const variants = shouldReduceMotion
    ? reducedVariant(staggerContainer)
    : {
        ...staggerContainer,
        visible: {
          ...staggerContainer.visible,
          transition: {
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1],
            staggerChildren: stagger,
          },
        },
      };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants as any}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerItem is a single motion child that fades up within a StaggerList.
 * Pass `index` to control its position in the stagger sequence.
 */
export interface StaggerItemProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  index?: number;
  className?: string;
}

export function StaggerItem({
  children,
  index = 0,
  className = "",
  ...props
}: StaggerItemProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      custom={index}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
        delay: index * 0.08,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default StaggerList;
