"use client";

import React from "react";
import { useTheme } from "@/components/providers/theme-provider";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

export interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
}

/**
 * Animated Theme Toggle button:
 * Displays a sun icon when dark mode is active and a moon icon when light mode is active.
 * Features a spring rotate & scale transition on click matching the demo dynamics,
 * with full accessibility and prefers-reduced-motion support.
 */
export function ThemeToggle({ className = "", size = "md" }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const isDark = resolvedTheme === "dark";

  const sizeClass = size === "sm" ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl";
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <motion.button
      type="button"
      whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
      onClick={toggleTheme}
      className={`relative grid place-items-center border border-gray-200/90 dark:border-white/10 bg-gray-100/90 dark:bg-[#121316] text-gray-700 dark:text-gray-200 transition-colors duration-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#1A1C20] cursor-pointer overflow-hidden backdrop-blur-sm shadow-xs ${sizeClass} ${className}`}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      data-testid="theme-toggle"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="dark-sun"
            initial={shouldReduceMotion ? { opacity: 0 } : { rotate: -90, scale: 0.5, opacity: 0 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { rotate: 0, scale: 1, opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { rotate: 90, scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 22 }}
            className="grid place-items-center"
          >
            <Sun className={`${iconClass} text-amber-400`} />
          </motion.div>
        ) : (
          <motion.div
            key="light-moon"
            initial={shouldReduceMotion ? { opacity: 0 } : { rotate: 90, scale: 0.5, opacity: 0 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { rotate: 0, scale: 1, opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { rotate: -90, scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 22 }}
            className="grid place-items-center"
          >
            <Moon className={`${iconClass} text-gray-700 dark:text-gray-300`} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export default ThemeToggle;
