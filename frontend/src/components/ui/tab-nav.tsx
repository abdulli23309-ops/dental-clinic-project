"use client";

import React, { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface TabItem<T extends string = string> {
  id: T;
  label: ReactNode;
  count?: number;
  badge?: ReactNode;
}

export interface TabNavProps<T extends string = string> {
  tabs: (T | TabItem<T>)[];
  activeTab: T;
  onSelect: (tabId: T) => void;
  className?: string;
  pillClassName?: string;
  activeTextClassName?: string;
  inactiveTextClassName?: string;
  layoutId?: string;
  size?: "sm" | "md";
  getTestId?: (id: T) => string;
}

/**
 * Tab Navigation with motion spring layoutId indicator.
 * Provides seamless sub-navigation switches without layout jumping.
 * Respects prefers-reduced-motion.
 */
export function TabNav<T extends string = string>({
  tabs,
  activeTab,
  onSelect,
  className = "",
  pillClassName = "bg-primary text-white shadow-xs",
  activeTextClassName = "text-white font-semibold",
  inactiveTextClassName = "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-gray-800/60",
  layoutId = "activeTabPill",
  size = "sm",
  getTestId,
}: TabNavProps<T>) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <nav className={cn("flex items-center gap-1", className)}>
      {tabs.map((tab) => {
        const id = (typeof tab === "string" ? tab : tab.id) as T;
        const label = typeof tab === "string" ? tab : tab.label;
        const count = typeof tab === "string" ? undefined : tab.count;
        const badge = typeof tab === "string" ? null : tab.badge;
        const isActive = activeTab === id;

        return (
          <button
            key={id}
            type="button"
            data-testid={getTestId ? getTestId(id) : undefined}
            onClick={() => onSelect(id)}
            className={cn(
              "relative rounded-full font-medium transition-colors cursor-pointer select-none",
              size === "sm" ? "px-3.5 py-1.5 text-xs" : "px-4 py-2 text-sm",
              isActive ? activeTextClassName : inactiveTextClassName
            )}
          >
            {isActive && !shouldReduceMotion && (
              <motion.div
                layoutId={layoutId}
                className={cn("absolute inset-0 rounded-full z-0", pillClassName)}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            {isActive && shouldReduceMotion && (
              <div className={cn("absolute inset-0 rounded-full z-0", pillClassName)} />
            )}
            <span className="relative z-10 flex items-center gap-1.5 capitalize">
              {label}
              {typeof count === "number" && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-medium",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  )}
                >
                  {count}
                </span>
              )}
              {badge}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default TabNav;
