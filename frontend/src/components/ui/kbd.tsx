import React from "react";
import { cn } from "@/lib/utils";

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  size?: "sm" | "md";
}

/**
 * Keycap badge component for displaying keyboard shortcuts in tooltips,
 * menus, dialogs, and button labels.
 */
export function Kbd({ children, size = "sm", className, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center font-mono font-medium rounded-md border shadow-xs select-none transition-colors",
        "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
        size === "sm" ? "px-1.5 py-0.5 text-[10px] min-w-[18px] h-5" : "px-2 py-1 text-xs min-w-[22px] h-6",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}

