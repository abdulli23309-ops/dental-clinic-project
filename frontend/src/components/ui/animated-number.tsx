"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, useInView, useReducedMotion } from "motion/react";

export interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

/**
 * Metric counter animation: smoothly rolls/tweens up from 0 (or previous state)
 * to current target value using spring dynamics. Respects prefers-reduced-motion.
 */
export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1.2,
  className = "",
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 100,
    duration: duration * 1000,
  });
  const isInView = useInView(ref, { once: true });

  const formattedTarget = `${prefix}${value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;

  useEffect(() => {
    if (shouldReduceMotion) {
      if (ref.current) {
        ref.current.textContent = formattedTarget;
      }
      return;
    }
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, value, motionValue, shouldReduceMotion, formattedTarget]);

  useEffect(() => {
    if (shouldReduceMotion) return;
    return springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${latest.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}${suffix}`;
      }
    });
  }, [springValue, prefix, suffix, decimals, shouldReduceMotion]);

  return (
    <span ref={ref} className={className} aria-label={formattedTarget}>
      {shouldReduceMotion ? formattedTarget : `${prefix}0${suffix}`}
    </span>
  );
}

export default AnimatedNumber;
