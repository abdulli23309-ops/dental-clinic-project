"use client";

import { useState, useCallback, useRef } from "react";

export interface UseSelectionOptions<T> {
  items: T[];
  getItemId: (item: T) => string | number;
}

/**
 * Hook for managing multi-row selection with Shift+Click range support.
 */
export function useSelection<T>({ items, getItemId }: UseSelectionOptions<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const lastSelectedIndex = useRef<number | null>(null);

  const isSelected = useCallback(
    (id: string | number) => selectedIds.has(id),
    [selectedIds]
  );

  const toggleSelect = useCallback(
    (id: string | number, index: number, event?: React.MouseEvent) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);

        // Handle Shift + Click Range Selection
        if (event?.shiftKey && lastSelectedIndex.current !== null && lastSelectedIndex.current !== index) {
          const start = Math.min(lastSelectedIndex.current, index);
          const end = Math.max(lastSelectedIndex.current, index);

          for (let i = start; i <= end; i++) {
            const item = items[i];
            if (item) {
              next.add(getItemId(item));
            }
          }
        } else {
          // Normal toggle
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
        }

        return next;
      });

      lastSelectedIndex.current = index;
    },
    [items, getItemId]
  );

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((item) => getItemId(item))));
  }, [items, getItemId]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastSelectedIndex.current = null;
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === items.length && items.length > 0) {
      clearSelection();
    } else {
      selectAll();
    }
  }, [selectedIds, items, clearSelection, selectAll]);

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < items.length;

  return {
    selectedIds: Array.from(selectedIds),
    selectedSet: selectedIds,
    count: selectedIds.size,
    isSelected,
    toggleSelect,
    selectAll,
    clearSelection,
    toggleAll,
    isAllSelected,
    isIndeterminate,
  };
}

