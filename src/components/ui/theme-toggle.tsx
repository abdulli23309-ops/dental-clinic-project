"use client";

import { useTheme } from "@/components/providers/theme-provider";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative grid h-9 w-9 place-items-center rounded-lg border border-line bg-cream/60 text-ink-soft transition-all duration-200 hover:border-forest/40 hover:text-ink hover:bg-sand/40 active:scale-95 ${className}`}
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4 text-gold transition-transform duration-300 rotate-0 scale-100" />
      ) : (
        <Moon className="h-4 w-4 text-forest transition-transform duration-300 rotate-0 scale-100" />
      )}
    </button>
  );
}
