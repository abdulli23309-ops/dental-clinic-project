"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";

export interface OptimisticMutationOptions<T, V> {
  optimisticUpdate: (currentData: T, variables: V) => T;
  mutationFn: (variables: V) => Promise<unknown>;
  onSuccess?: (result: unknown, variables: V) => void;
  onError?: (error: Error, variables: V, previousData: T) => void;
  successMessage?: string | ((variables: V) => string);
  errorMessage?: string | ((error: Error, variables: V) => string);
}

/**
 * Hook for optimistic UI updates with automatic rollback and toast notifications on failure.
 */
export function useOptimisticMutation<T, V>(
  currentData: T,
  options: OptimisticMutationOptions<T, V>
) {
  const [data, setData] = useState<T>(currentData);
  const [isPending, setIsPending] = useState(false);
  const previousDataRef = useRef<T>(currentData);

  // Keep state in sync if parent passed updated external data while not pending
  useEffect(() => {
    if (!isPending && currentData !== previousDataRef.current) {
      previousDataRef.current = currentData;
      setData(currentData);
    }
  }, [currentData, isPending]);

  const mutate = useCallback(
    async (variables: V) => {
      const rollbackData = data;
      const optimisticState = options.optimisticUpdate(rollbackData, variables);
      setData(optimisticState);
      setIsPending(true);

      try {
        const result = await options.mutationFn(variables);
        setIsPending(false);

        if (options.successMessage) {
          const msg =
            typeof options.successMessage === "function"
              ? options.successMessage(variables)
              : options.successMessage;
          toast.success(msg);
        }

        options.onSuccess?.(result, variables);
        return result;
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        // Rollback state immediately
        setData(rollbackData);
        setIsPending(false);

        const errorMsg =
          typeof options.errorMessage === "function"
            ? options.errorMessage(error, variables)
            : options.errorMessage || error.message || "Action failed. Changes were rolled back.";
        toast.error(errorMsg);

        options.onError?.(error, variables, rollbackData);
        throw error;
      }
    },
    [data, options]
  );

  return {
    data,
    setData,
    mutate,
    isPending,
  };
}

