"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Custom hook to throttle a rapidly changing value.
 * Updates at most once every `limit` milliseconds.
 */
export function useThrottle<T>(value: T, limit: number = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

/**
 * Creates a throttled callback function that only fires once every `limit` milliseconds.
 * Useful for rapid-click prevention, infinite scroll handlers, and window resize listeners.
 */
export function useThrottledCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  limit: number = 400
): (...args: Args) => void {
  const lastCall = useRef<number>(0);

  return useCallback(
    (...args: Args) => {
      const now = Date.now();
      if (now - lastCall.current >= limit) {
        lastCall.current = now;
        callback(...args);
      }
    },
    [callback, limit]
  );
}

