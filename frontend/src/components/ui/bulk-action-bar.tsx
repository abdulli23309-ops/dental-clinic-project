"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void | Promise<void>;
  variant?: "primary" | "secondary" | "danger" | "outline";
  disabled?: boolean;
}

export interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
  entityLabel?: string;
}

/**
 * Floating bottom action bar that animates into view whenever items are selected in a table.
 */
export function BulkActionBar({
  selectedCount,
  onClearSelection,
  actions,
  entityLabel = "items",
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[90vw] sm:w-auto"
        >
          <div className="bg-slate-900 dark:bg-slate-800 text-white border border-slate-700/80 rounded-2xl shadow-2xl px-4 py-3 flex items-center justify-between gap-4 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs">
                {selectedCount}
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-200">
                {selectedCount} {entityLabel} selected
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {actions.map((act, i) => {
                const isDanger = act.variant === "danger";
                const buttonVariant: "primary" | "secondary" | "outline" =
                  isDanger
                    ? "outline"
                    : act.variant === "primary"
                    ? "primary"
                    : act.variant === "outline"
                    ? "outline"
                    : "secondary";

                return (
                  <Button
                    key={i}
                    size="sm"
                    variant={buttonVariant}
                    onClick={act.onClick}
                    disabled={act.disabled}
                    className={`rounded-xl text-xs gap-1.5 shrink-0 ${
                      isDanger
                        ? "text-rose-300 border-rose-500/60 hover:bg-rose-950/50 hover:text-rose-200"
                        : ""
                    }`}
                  >
                    {act.icon}
                    <span>{act.label}</span>
                  </Button>
                );
              })}

              <button
                onClick={onClearSelection}
                title="Deselect all"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
                aria-label="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
