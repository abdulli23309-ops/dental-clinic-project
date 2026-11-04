"use client";

import React, { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

interface RollingDigitProps {
  digit: number;
  digitIndex: number;
  isInView: boolean;
  shouldReduceMotion: boolean | null;
}

function RollingDigit({ digit, digitIndex, isInView, shouldReduceMotion }: RollingDigitProps) {
  if (shouldReduceMotion) {
    return <span className="inline-block tabular-nums">{digit}</span>;
  }

  return (
    <span className="inline-block relative overflow-hidden h-[1.15em] leading-none align-baseline tabular-nums">
      <motion.span
        className="flex flex-col"
        initial={{ y: "0%" }}
        animate={{ y: isInView ? `-${digit * 10}%` : "0%" }}
        transition={{
          duration: 0.85,
          delay: digitIndex * 0.1, // Stagger exactly 100ms apart
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {DIGITS.map((num) => (
          <span
            key={num}
            className="h-[1.15em] flex items-center justify-center leading-none"
            aria-hidden="true"
          >
            {num}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/**
 * Metric counter animation: Animate numbers rolling vertically into place.
 * Stagger the animation so each consecutive digit rolls in exactly 100ms apart.
 * Respects prefers-reduced-motion and accessible screen reader aria-labels.
 */
export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const isInView = useInView(ref, { once: true });

  const formattedTarget = `${prefix}${value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;

  const numString = value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  let digitCount = 0;

  return (
    <span
      ref={ref}
      className={cn("inline-flex items-baseline font-semibold tracking-tight", className)}
      aria-label={formattedTarget}
    >
      {prefix && <span className="inline-block mr-0.5">{prefix}</span>}
      {numString.split("").map((char, i) => {
        const isDigit = /^[0-9]$/.test(char);
        if (isDigit) {
          const digit = parseInt(char, 10);
          const currentDigitIndex = digitCount++;
          return (
            <RollingDigit
              key={`digit-${i}-${digit}`}
              digit={digit}
              digitIndex={currentDigitIndex}
              isInView={isInView}
              shouldReduceMotion={shouldReduceMotion}
            />
          );
        }
        return (
          <span key={`char-${i}`} className="inline-block">
            {char}
          </span>
        );
      })}
      {suffix && <span className="inline-block ml-0.5">{suffix}</span>}
    </span>
  );
}

export default AnimatedNumber;
