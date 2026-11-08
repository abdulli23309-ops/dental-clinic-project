import React from "react";
import { Check, Cloud, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { AutosaveStatus } from "@/hooks/use-autosave";
import { cn } from "@/lib/utils";

export interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  lastSavedAt?: Date | null;
  onRetry?: () => void;
  className?: string;
}

/**
 * Non-intrusive autosave status badge.
 * Displays "Saving...", "All changes saved", or "Unsaved changes (Retry)".
 */
export function AutosaveIndicator({
  status,
  lastSavedAt,
  onRetry,
  className,
}: AutosaveIndicatorProps) {
  if (status === "idle" && !lastSavedAt) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all select-none",
        status === "saving" && "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
        status === "saved" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
        status === "unsaved" && "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
        status === "error" && "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
        className
      )}
    >
      {status === "saving" && (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Saving draft...</span>
        </>
      )}

      {status === "saved" && (
        <>
          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>Saved</span>
          {lastSavedAt && (
            <span className="text-[10px] opacity-75 font-mono">
              ({lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
            </span>
          )}
        </>
      )}

      {status === "unsaved" && (
        <>
          <Cloud className="w-3 h-3" />
          <span>Unsaved changes</span>
        </>
      )}

      {status === "error" && (
        <>
          <AlertCircle className="w-3 h-3 text-rose-600" />
          <span>Failed to save</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="ml-1 underline font-semibold flex items-center gap-0.5 hover:text-rose-900 cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Retry</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}

