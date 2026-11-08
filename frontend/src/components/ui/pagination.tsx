"use client";

import React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
  className?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [6, 12, 24],
  itemName = "items",
  className = "",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // If no items at all, don't show pagination controls
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipses for desktop
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("ellipsis");
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <nav
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 text-sm text-muted-foreground ${className}`}
      aria-label="Pagination Navigation"
    >
      {/* Result Count & Page Size */}
      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-medium">
        <span>
          Showing <span className="font-semibold text-foreground">{startItem}</span>
          {"–"}
          <span className="font-semibold text-foreground">{endItem}</span> of{" "}
          <span className="font-semibold text-foreground">{totalItems}</span> {itemName}
        </span>

        {onPageSizeChange && pageSizeOptions.length > 1 && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-border">
            <label htmlFor="pagination-page-size" className="text-xs text-muted-foreground">
              Per page:
            </label>
            <select
              id="pagination-page-size"
              aria-label={`Select number of ${itemName} per page`}
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="text-xs bg-background border border-border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground cursor-pointer font-medium transition-all"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page Navigation Controls */}
      <div className="flex items-center gap-1.5" role="group" aria-label="Page navigation controls">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          aria-label="Previous Page"
          className="inline-flex items-center justify-center w-8 h-8 rounded-xl border border-border bg-card text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 shadow-xs focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Mobile View: Collapsed text "Page X of Y" */}
        <div className="sm:hidden px-3 py-1 text-xs font-semibold text-foreground">
          Page {currentPage} of {totalPages}
        </div>

        {/* Desktop View: Full Numbered Page Pills */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === "ellipsis") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-8 h-8 flex items-center justify-center text-muted-foreground"
                  aria-hidden="true"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-label={isActive ? `Current page, Page ${p}` : `Go to Page ${p}`}
                aria-current={isActive ? "page" : undefined}
                className={`w-8 h-8 text-xs font-semibold rounded-xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20"
                    : "bg-card border border-border text-foreground hover:bg-muted shadow-xs"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          aria-label="Next Page"
          className="inline-flex items-center justify-center w-8 h-8 rounded-xl border border-border bg-card text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 shadow-xs focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
