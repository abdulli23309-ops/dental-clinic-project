"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type AutosaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

export interface AutosaveOptions<T> {
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  draftKey?: string; // Optional localStorage key to preserve draft across crashes
  onError?: (error: Error) => void;
}

/**
 * Universal SaaS autosave hook.
 * Debounces saves in the background, tracks saving status, and can persist drafts to localStorage.
 */
export function useAutosave<T>(data: T, options: AutosaveOptions<T>) {
  const { onSave, debounceMs = 1200, draftKey, onError } = options;
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const initialRender = useRef(true);
  const latestData = useRef<T>(data);

  useEffect(() => {
    latestData.current = data;
  }, [data]);

  // Persist draft to localStorage on change if draftKey provided
  useEffect(() => {
    if (draftKey && typeof window !== "undefined") {
      try {
        localStorage.setItem(draftKey, JSON.stringify(data));
      } catch {
        // storage quota exceeded or disabled
      }
    }
  }, [data, draftKey]);

  const executeSave = useCallback(async () => {
    setStatus("saving");
    setError(null);
    try {
      await onSave(latestData.current);
      setStatus("saved");
      setLastSavedAt(new Date());
      // Clear draft on successful server sync
      if (draftKey && typeof window !== "undefined") {
        try {
          localStorage.removeItem(draftKey);
        } catch {}
      }
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      setStatus("error");
      onError?.(e);
    }
  }, [onSave, draftKey, onError]);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    setStatus("unsaved");
    const timer = setTimeout(() => {
      executeSave();
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [data, debounceMs, executeSave]);

  return {
    status,
    lastSavedAt,
    error,
    saveNow: executeSave,
  };
}

