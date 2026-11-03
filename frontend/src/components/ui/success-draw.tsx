"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface SuccessCheckDrawProps {
  size?: number | string;
  className?: string;
}

/**
 * Success State (Draw the Win):
 * Outer success circle draws first (250ms), immediately followed by inner checkmark (220ms),
 * completing in exactly 470ms.
 */
export function DrawTheWin({ size = 22, className = "text-emerald-600 dark:text-emerald-400" }: SuccessCheckDrawProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("shrink-0", className)}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9.5" />
        <path d="M8 12.5l2.8 2.8L16.2 9" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {/* Outer circle: 0 to 1 in 0.25s (250ms) */}
      <motion.circle
        cx="12"
        cy="12"
        r="9.5"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          duration: 0.25,
          ease: "easeOut",
        }}
      />
      {/* Inner checkmark: 0 to 1 in 0.22s (220ms), starts at 0.25s -> total 0.47s (470ms) */}
      <motion.path
        d="M8 12.5l2.8 2.8L16.2 9"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          duration: 0.22,
          delay: 0.25,
          ease: "easeOut",
        }}
      />
    </svg>
  );
}

export interface SuccessAlertProps {
  message: string | null;
  onClose?: () => void;
  className?: string;
}

export function SuccessAlert({ message, onClose, className }: SuccessAlertProps) {
  if (!message) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm flex items-center justify-between shadow-xs gap-3",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <DrawTheWin size={22} className="text-emerald-600 dark:text-emerald-400" />
        <span className="font-medium leading-relaxed">{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-emerald-700/70 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-100 p-1 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      )}
    </motion.div>
  );
}

