"use client";

import React from "react";
import { motion } from "motion/react";

interface AnimatedHamburgerProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
  "aria-label"?: string;
}

export function AnimatedHamburger({
  isOpen,
  onClick,
  className = "",
  "aria-label": ariaLabel = "Toggle mobile menu",
}: AnimatedHamburgerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative grid h-9 w-9 place-items-center rounded-full border border-gray-200/80 dark:border-gray-800/80 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer shrink-0 shadow-sm ${className}`}
      aria-label={ariaLabel}
      aria-expanded={isOpen}
    >
      <div className="relative w-4 h-3.5 flex flex-col justify-between items-center pointer-events-none">
        {/* Top bar */}
        <motion.span
          animate={isOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="w-full h-0.5 bg-current rounded-full origin-center"
        />

        {/* Middle bar */}
        <motion.span
          animate={isOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="w-full h-0.5 bg-current rounded-full origin-center"
        />

        {/* Bottom bar */}
        <motion.span
          animate={isOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="w-full h-0.5 bg-current rounded-full origin-center"
        />
      </div>
    </button>
  );
}

export default AnimatedHamburger;

