"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import React, { ReactNode } from "react";
import { cardHover } from "@/animations/variants";
import { cn } from "@/lib/utils";

export interface AnimatedCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  index?: number;
  className?: string;
  hoverLift?: boolean;
  layoutId?: string;
}

/**
 * Animated wrapper for dashboard cards:
 * Staggered fade-up entrance, soft hover lift + shadow, and tap press.
 * Built on the shared variants from @/animations/variants so every card in
 * the app moves identically. Preserves Tailwind classes and reduced motion.
 */
export function AnimatedCard({
  children,
  index = 0,
  className = "",
  hoverLift = true,
  layoutId,
  ...props
}: AnimatedCardProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div className={className} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    );
  }

  const variants: any = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.08,
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  };

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={variants}
      whileHover={hoverLift ? cardHover.whileHover : undefined}
      whileTap={hoverLift ? cardHover.whileTap : undefined}
      className={cn("transition-shadow duration-200", className)}
      layoutId={layoutId}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default AnimatedCard;
