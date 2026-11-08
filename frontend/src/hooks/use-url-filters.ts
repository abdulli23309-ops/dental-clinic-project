"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

/**
 * Hook to synchronize state filters with URL query parameters for shareable, bookmarkable views.
 */
export function useUrlFilters<T extends Record<string, string | undefined>>() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => {
    const current: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      if (val) current[key] = val;
    });
    return current as T;
  }, [searchParams]);

  const setFilter = useCallback(
    (key: string, value: string | undefined | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value.trim() !== "") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset page if page parameter exists
      if (params.has("page") && key !== "page") {
        params.set("page", "1");
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const removeFilter = useCallback(
    (key: string) => {
      setFilter(key, undefined);
    },
    [setFilter]
  );

  const clearAllFilters = useCallback(
    (keepKeys: string[] = []) => {
      const params = new URLSearchParams();
      for (const k of keepKeys) {
        const val = searchParams.get(k);
        if (val) params.set(k, val);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    searchParams.forEach((val, key) => {
      if (key !== "page" && key !== "limit" && key !== "sort" && val) count++;
    });
    return count;
  }, [searchParams]);

  return {
    filters,
    setFilter,
    removeFilter,
    clearAllFilters,
    hasActiveFilters: activeFilterCount > 0,
    activeFilterCount,
  };
}

