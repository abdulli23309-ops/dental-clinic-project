"use client";

import { useState, useEffect } from "react";

/**
 * Custom hook to debounce a fast-changing value (e.g. search query, filter input).
 * Value only updates after `delay` milliseconds of inactivity.
 */
export function useDebounce<T>(value: T, delay: number = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

