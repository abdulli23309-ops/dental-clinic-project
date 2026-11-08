"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DestructiveConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  requireMatchText?: string;
  matchPlaceholder?: string;
  variant?: "danger" | "warning";
  isSubmitting?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function DestructiveConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = "Delete",
  cancelText = "Cancel",
  requireMatchText,
  matchPlaceholder,
  variant = "danger",
  isSubmitting = false,
  onConfirm,
  onClose,
}: DestructiveConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTypedValue("");
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const isMatchValid = !requireMatchText || typedValue.trim().toLowerCase() === requireMatchText.trim().toLowerCase();

  const isDanger = variant === "danger";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200 text-slate-900 dark:text-slate-100">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isDanger
                ? "bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400"
                : "bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-400"
            }`}
          >
            {isDanger ? <AlertCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Optional typing requirement for high-risk actions */}
        {requireMatchText && (
          <div className="pt-2 space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Type <strong className="font-mono text-rose-600 dark:text-rose-400">{requireMatchText}</strong> to confirm:
            </label>
            <input
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={matchPlaceholder || `Type "${requireMatchText}"`}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
              autoFocus
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-xl"
          >
            {cancelText}
          </Button>

          <button
            type="button"
            disabled={!isMatchValid || isSubmitting}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl text-white shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isDanger
                ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-rose-500/20"
                : "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-amber-500/20"
            }`}
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isSubmitting ? "Processing..." : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default DestructiveConfirmDialog;

