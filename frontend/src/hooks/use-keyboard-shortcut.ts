"use client";

import { useEffect, useCallback } from "react";

export interface ShortcutOptions {
  ctrl?: boolean;
  meta?: boolean; // Cmd on Mac, Windows key on Windows
  alt?: boolean;
  shift?: boolean;
  ignoreInputs?: boolean; // defaults to true: don't fire when typing in input/textarea
}

/**
 * Universal hook for registering keyboard shortcuts.
 * Automatically handles Mac (metaKey) vs Windows/Linux (ctrlKey) mappings.
 */
export function useKeyboardShortcut(
  key: string,
  callback: (e: KeyboardEvent) => void,
  options: ShortcutOptions = {}
) {
  const {
    ctrl = false,
    meta = false,
    alt = false,
    shift = false,
    ignoreInputs = true,
  } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Check if user is typing in an input, textarea, or contentEditable element
      if (ignoreInputs) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable)
        ) {
          return;
        }
      }

      // Check key match (case-insensitive)
      if (e.key.toLowerCase() !== key.toLowerCase()) {
        return;
      }

      // If either meta or ctrl is requested, allow either (supports Cmd on macOS and Ctrl on Win/Linux)
      if (meta || ctrl) {
        if (!e.metaKey && !e.ctrlKey) return;
      } else {
        if (e.metaKey || e.ctrlKey) return;
      }

      if (alt && !e.altKey) return;
      if (!alt && e.altKey) return;

      if (shift && !e.shiftKey) return;
      if (!shift && e.shiftKey) return;

      e.preventDefault();
      callback(e);
    },
    [key, callback, ctrl, meta, alt, shift, ignoreInputs]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

