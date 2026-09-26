"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, CornerDownLeft, ArrowUpDown } from "lucide-react";
import { searchSite, SearchResult } from "@/lib/search-index";

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults(searchSite(""));
      setSelectedIndex(0);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          results.length > 0 ? (prev - 1 + results.length) % results.length : 0
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[selectedIndex]) {
          const target = results[selectedIndex].href;
          onClose();
          router.push(target);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, router]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    const searchRes = searchSite(val);
    setResults(searchRes);
    setSelectedIndex(0);
  };

  const handleSelect = (href: string) => {
    onClose();
    router.push(href);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-16 sm:pt-24"
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-forest-deep/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Surface */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-line bg-bone elevation-4">
        {/* Search Header */}
        <div className="flex items-center border-b border-line px-4 py-3 sm:px-5">
          <Search className="h-5 w-5 text-ink-soft shrink-0" />
          <input
            ref={inputRef}
            type="search"
            id="search-dialog-title"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search procedures, cash fees, insurance, or doctor info..."
            className="ml-3.5 flex-1 bg-transparent text-[15px] sm:text-[16px] text-ink outline-none placeholder:text-ink-soft/60"
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button
              onClick={() => handleQueryChange("")}
              className="p-1 text-ink-soft hover:text-ink"
              aria-label="Clear query"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block rounded border border-line bg-cream px-1.5 py-0.5 text-[11px] text-ink-soft">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-2 sm:p-3">
          {query.trim() === "" ? (
            <div className="py-8 text-center">
              <p className="text-[13px] font-medium text-ink-soft">Quick suggestions</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {[
                  "Cash rates",
                  "Invisalign",
                  "Cleaning & exam",
                  "Root canals",
                  "Insurance",
                  "Parking",
                ].map((term) => (
                  <button
                    key={term}
                    onClick={() => handleQueryChange(term)}
                    className="rounded-md border border-line bg-cream/70 px-3 py-1.5 text-xs text-ink-soft hover:border-forest hover:text-forest"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-display text-lg text-ink">No exact matches found</p>
              <p className="mt-1 text-sm text-ink-soft">
                Try searching for general terms like &ldquo;cleaning&rdquo;, &ldquo;crown&rdquo;, or &ldquo;insurance&rdquo;.
              </p>
            </div>
          ) : (
            <ul className="space-y-1" role="listbox">
              {results.map((r, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <li
                    key={r.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(r.href)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex cursor-pointer items-start justify-between rounded-lg p-3 transition-colors ${
                      isSelected
                        ? "bg-cream border border-forest/30"
                        : "hover:bg-cream/60 border border-transparent"
                    }`}
                  >
                    <div className="pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-[15px] font-medium text-ink">
                          {r.title}
                        </span>
                        <span className="rounded bg-sand/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-forest">
                          {r.category}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-ink-soft line-clamp-2">
                        {r.snippet}
                      </p>
                    </div>
                    {isSelected && (
                      <CornerDownLeft className="mt-1 h-4 w-4 text-forest shrink-0" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="hidden sm:flex items-center justify-between border-t border-line bg-cream/50 px-4 py-2.5 text-[11.5px] text-ink-soft">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUpDown className="h-3 w-3" /> Navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" /> Select
            </span>
          </div>
          <span>Lincoln Park, Chicago · Marlow Dental</span>
        </div>
      </div>
    </div>
  );
}
