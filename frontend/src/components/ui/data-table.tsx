"use client";

import React, { useState } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Inbox,
  LucideIcon,
} from "lucide-react";
import { SkeletonTableRow } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  width?: string;
}

export type SortDirection = "asc" | "desc" | null;

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T, index: number) => string | number;
  isLoading?: boolean;
  loadingRows?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  // Sorting
  sortKey?: string | null;
  sortDirection?: SortDirection;
  onSort?: (key: string) => void;
  // Selection
  selectable?: boolean;
  selectedIds?: Array<string | number>;
  onToggleSelect?: (id: string | number, index: number, e?: React.MouseEvent) => void;
  onToggleAll?: () => void;
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
  // Pagination
  currentPage?: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  // Styling
  stickyHeader?: boolean;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  loadingRows = 5,
  emptyTitle = "No records found",
  emptyDescription = "There are currently no items to display in this list.",
  emptyIcon = Inbox,
  emptyActionLabel,
  onEmptyAction,
  sortKey,
  sortDirection,
  onSort,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
  onToggleAll,
  isAllSelected = false,
  isIndeterminate = false,
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  stickyHeader = true,
  className,
}: DataTableProps<T>) {
  const selectedSet = new Set(selectedIds);
  const totalCols = columns.length + (selectable ? 1 : 0);

  const handleHeaderSort = (key: string, sortable?: boolean) => {
    if (!sortable || !onSort) return;
    onSort(key);
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead
              className={cn(
                "bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold tracking-wider uppercase text-[11px]",
                stickyHeader && "sticky top-0 z-10 backdrop-blur-xs"
              )}
            >
              <tr>
                {selectable && (
                  <th className="w-10 px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      onChange={() => onToggleAll?.()}
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      aria-label="Select all rows"
                    />
                  </th>
                )}

                {columns.map((col) => {
                  const isSorted = sortKey === col.key;
                  return (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      className={cn(
                        "px-4 py-3.5 select-none",
                        col.sortable && "cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors",
                        col.headerClassName
                      )}
                      onClick={() => handleHeaderSort(col.key, col.sortable)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.header}</span>
                        {col.sortable && (
                          <span className="shrink-0 text-slate-400">
                            {isSorted && sortDirection === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-primary" />
                            ) : isSorted && sortDirection === "desc" ? (
                              <ArrowDown className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-50" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-slate-700 dark:text-slate-200">
              {isLoading ? (
                Array.from({ length: loadingRows }).map((_, i) => (
                  <SkeletonTableRow key={i} cols={totalCols} />
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={totalCols} className="p-8">
                    <EmptyState
                      icon={emptyIcon}
                      title={emptyTitle}
                      description={emptyDescription}
                      actionLabel={emptyActionLabel}
                      onAction={onEmptyAction}
                      className="border-none bg-transparent py-4"
                    />
                  </td>
                </tr>
              ) : (
                data.map((item, index) => {
                  const id = keyExtractor(item, index);
                  const selected = selectedSet.has(id);

                  return (
                    <tr
                      key={id}
                      className={cn(
                        "transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50",
                        selected && "bg-primary/5 dark:bg-primary/10"
                      )}
                    >
                      {selectable && (
                        <td className="w-10 px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) =>
                              onToggleSelect?.(id, index, e.nativeEvent as unknown as React.MouseEvent)
                            }
                            className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                            aria-label={`Select row ${id}`}
                          />
                        </td>
                      )}

                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn("px-4 py-3.5", col.className)}
                        >
                          {col.render
                            ? col.render(item, index)
                            : (item as Record<string, unknown>)[col.key] !== undefined
                            ? String((item as Record<string, unknown>)[col.key])
                            : null}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {!isLoading && totalItems !== undefined && pageSize !== undefined && totalItems > pageSize && currentPage && onPageChange && (
        <div className="flex items-center justify-between pt-2 px-1">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {Math.ceil(totalItems / pageSize)} ({totalItems} records)
          </p>
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
