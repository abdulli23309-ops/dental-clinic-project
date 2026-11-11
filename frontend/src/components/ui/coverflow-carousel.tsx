"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CoverflowItemMeta {
  isFront: boolean;
  offset: number;
  isVisible: boolean;
  safeIndex: number;
  total: number;
}

export interface CoverflowCarouselProps<T> {
  items: T[];
  renderItem: (item: T, index: number, meta: CoverflowItemMeta) => React.ReactNode;
  activeIndex: number;
  onChange: (index: number) => void;
  prevAriaLabel?: string;
  nextAriaLabel?: string;
  itemAriaLabelPrefix?: string;
  ariaLabel?: string;
  getItemKey?: (item: T, index: number) => React.Key;
  isRtl?: boolean;
  className?: string;
  variant?: "coverflow" | "glass-drum";
}

export function CoverflowCarousel<T>({
  items,
  renderItem,
  activeIndex,
  onChange,
  prevAriaLabel = "Previous",
  nextAriaLabel = "Next",
  itemAriaLabelPrefix = "Slide",
  ariaLabel = "Carousel",
  getItemKey,
  isRtl = false,
  className = "",
  variant = "coverflow",
}: CoverflowCarouselProps<T>) {
  const [windowWidth, setWindowWidth] = useState<number>(1200);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartX = useRef<number>(0);
  const hasDragged = useRef<boolean>(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const n = items.length;
  const safeIndex = n > 0 ? ((activeIndex % n) + n) % n : 0;

  const handleNext = useCallback(() => {
    if (n <= 1) return;
    onChange((safeIndex + 1) % n);
  }, [n, safeIndex, onChange]);

  const handlePrev = useCallback(() => {
    if (n <= 1) return;
    onChange((safeIndex - 1 + n) % n);
  }, [n, safeIndex, onChange]);

  // Pointer drag & touch-swipe handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || n <= 1) return;
    setIsDragging(true);
    hasDragged.current = false;
    dragStartX.current = e.clientX;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX.current;
    if (Math.abs(deltaX) > 10) {
      hasDragged.current = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (!hasDragged.current) return;
    const deltaX = e.clientX - dragStartX.current;
    const threshold = 35;

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        if (isRtl) handleNext();
        else handlePrev();
      } else {
        if (isRtl) handlePrev();
        else handleNext();
      }
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (isRtl) handleNext();
      else handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (isRtl) handlePrev();
      else handleNext();
    }
  };

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const rtlSign = isRtl ? -1 : 1;

  // Exact 3D Geometry and Cinematic Blur from deployed live site (commit 76fb612)
  const getSlotStyle = (offset: number) => {
    if (isMobile) {
      if (offset === 0) {
        return {
          transform: `translate3d(0px, 0px, 40px) scale(1)`,
          zIndex: 30,
          opacity: 1,
          filter: "blur(0px)",
          pointerEvents: "auto" as const,
          visibility: "visible" as const,
        };
      }
      if (offset === -1) {
        return {
          transform: `translate3d(${-42 * rtlSign}px, 14px, -60px) rotateY(${12 * rtlSign}deg) scale(0.91)`,
          zIndex: 20,
          opacity: 0.55,
          filter: "blur(2.5px)",
          pointerEvents: "auto" as const,
          visibility: "visible" as const,
        };
      }
      if (offset === 1) {
        return {
          transform: `translate3d(${42 * rtlSign}px, 14px, -60px) rotateY(${-12 * rtlSign}deg) scale(0.91)`,
          zIndex: 20,
          opacity: 0.55,
          filter: "blur(2.5px)",
          pointerEvents: "auto" as const,
          visibility: "visible" as const,
        };
      }
      return {
        transform: `translate3d(0px, 0px, -150px) scale(0.8)`,
        zIndex: 0,
        opacity: 0,
        filter: "blur(6px)",
        pointerEvents: "none" as const,
        visibility: "hidden" as const,
      };
    }

    // Desktop & Tablet
    const xStep1 = isTablet ? 220 : 310;
    const xStep2 = isTablet ? 400 : 560;
    const z1 = -60;
    const z2 = -170;
    const rot1 = 22;
    const rot2 = 34;
    const s1 = 0.90;
    const s2 = 0.80;

    if (offset === 0) {
      return {
        transform: `translate3d(0px, 0px, 60px) rotateY(0deg) scale(1)`,
        zIndex: 30,
        opacity: 1,
        filter: "blur(0px)",
        pointerEvents: "auto" as const,
        visibility: "visible" as const,
      };
    }
    if (offset === -1) {
      return {
        transform: `translate3d(${-xStep1 * rtlSign}px, 0px, ${z1}px) rotateY(${rot1 * rtlSign}deg) scale(${s1})`,
        zIndex: 20,
        opacity: 0.75,
        filter: "blur(3px)",
        pointerEvents: "auto" as const,
        visibility: "visible" as const,
      };
    }
    if (offset === 1) {
      return {
        transform: `translate3d(${xStep1 * rtlSign}px, 0px, ${z1}px) rotateY(${-rot1 * rtlSign}deg) scale(${s1})`,
        zIndex: 20,
        opacity: 0.75,
        filter: "blur(3px)",
        pointerEvents: "auto" as const,
        visibility: "visible" as const,
      };
    }
    if (offset === -2) {
      return {
        transform: `translate3d(${-xStep2 * rtlSign}px, 0px, ${z2}px) rotateY(${rot2 * rtlSign}deg) scale(${s2})`,
        zIndex: 10,
        opacity: 0.40,
        filter: "blur(5.5px)",
        pointerEvents: "none" as const,
        visibility: "visible" as const,
      };
    }
    if (offset === 2) {
      return {
        transform: `translate3d(${xStep2 * rtlSign}px, 0px, ${z2}px) rotateY(${-rot2 * rtlSign}deg) scale(${s2})`,
        zIndex: 10,
        opacity: 0.40,
        filter: "blur(5.5px)",
        pointerEvents: "none" as const,
        visibility: "visible" as const,
      };
    }
    return {
      transform: `translate3d(0px, 0px, -300px) scale(0.5)`,
      zIndex: 0,
      opacity: 0,
      filter: "blur(8px)",
      pointerEvents: "none" as const,
      visibility: "hidden" as const,
    };
  };

  // Build render card instances:
  // When n >= 5: map 1:1 with standard circular wrap around safeIndex
  // When n == 1: 1 centered card at offset 0
  // When n == 2, 3, 4: repeat items into virtual instances so all 5 slots [-2, -1, 0, 1, 2]
  // are populated with real content, no blanks, and smooth gliding transitions!
  const renderedCards = useMemo(() => {
    if (n === 0) return [];
    if (n === 1) {
      return [
        {
          key: getItemKey ? getItemKey(items[0], 0) : ((items[0] as { id?: string })?.id || 0),
          item: items[0],
          origIdx: 0,
          offset: 0,
        },
      ];
    }
    if (n >= 5) {
      return items.map((item, idx) => {
        let diff = (idx - safeIndex) % n;
        while (diff > n / 2) diff -= n;
        while (diff < -n / 2) diff += n;
        const baseKey = getItemKey ? String(getItemKey(item, idx)) : ((item as { id?: string })?.id || idx);
        return {
          key: baseKey,
          item,
          origIdx: idx,
          offset: diff,
        };
      });
    }

    // n in [2, 3, 4]: no wrap-around, no duplicated/virtual cards.
    // Every real card renders exactly once at its raw offset (idx - safeIndex).
    // The active card keeps its position; the others stack to its right
    // (or to its left when the active card is later in the list). The group
    // is not re-centered.
    return items.map((item, idx) => {
      const baseKey = getItemKey ? String(getItemKey(item, idx)) : ((item as { id?: string })?.id || idx);
      return {
        key: baseKey,
        item,
        origIdx: idx,
        offset: idx - safeIndex,
      };
    });
  }, [items, n, safeIndex, getItemKey]);

  if (n === 0) return null;

  return (
    <div
      className={`relative w-full overflow-visible py-4 md:py-6 select-none ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={ariaLabel}
    >
      {/* Ambient Radial Round Glass Aura behind carousel */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden="true"
      >
        {variant === "glass-drum" ? (
          <>
            <div className="glass-carousel-orb glass-carousel-orb-primary" />
            <div className="glass-carousel-orb glass-carousel-orb-violet" />
          </>
        ) : (
          <div className="w-[450px] h-[450px] sm:w-[650px] sm:h-[650px] rounded-full bg-primary/10 blur-3xl" />
        )}
      </div>

      {/* Curved Glass Base Ring Pedestal */}
      {variant === "glass-drum" ? (
        <div className="glass-carousel-floor" aria-hidden="true" />
      ) : (
        <>
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[340px] sm:w-[500px] h-12 rounded-[100%] bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-md pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[300px] sm:w-[440px] h-6 rounded-[100%] border border-primary/20 bg-primary/5 backdrop-blur-sm pointer-events-none"
            aria-hidden="true"
          />
        </>
      )}

      {/* Floating Round Glass Navigation Controls (Desktop/Tablet Only) */}
      {n > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label={prevAriaLabel}
            className={variant === "glass-drum" ? "glass-carousel-control" : "hidden md:flex absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 z-40 h-11 w-11 sm:h-12 sm:w-12 rounded-full border border-white/60 dark:border-white/15 bg-white/90 dark:bg-slate-900/90 text-gray-800 dark:text-gray-100 shadow-xl backdrop-blur-xl items-center justify-center hover:scale-105 active:scale-95 hover:border-primary/40 hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer"}
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label={nextAriaLabel}
            className={variant === "glass-drum" ? "glass-carousel-control glass-carousel-control-next" : "hidden md:flex absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 z-40 h-11 w-11 sm:h-12 sm:w-12 rounded-full border border-white/60 dark:border-white/15 bg-white/90 dark:bg-slate-900/90 text-gray-800 dark:text-gray-100 shadow-xl backdrop-blur-xl items-center justify-center hover:scale-105 active:scale-95 hover:border-primary/40 hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer"}
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 rtl:rotate-180" />
          </button>
        </>
      )}

      {/* 3D Perspective Stage Container with touch-swipe */}
      <div
        className={`coverflow-stage relative w-full h-[540px] sm:h-[570px] md:h-[590px] flex items-center justify-center cursor-grab active:cursor-grabbing touch-pan-y ${variant === "glass-drum" ? "glass-carousel-stage" : ""}`}
        style={{
          perspective: variant === "glass-drum" ? "1400px" : "1600px",
          perspectiveOrigin: variant === "glass-drum" ? "50% 45%" : "50% 50%",
        }}
        data-coverflow-stage="true"
        role="region"
        aria-label={ariaLabel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Relative Slot-Based Stage */}
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{ transformStyle: "preserve-3d" }}
        >
          {variant === "glass-drum" ? (
            renderedCards.map((card) => {
              const isFront = card.offset === 0;
              const isVisible = Math.abs(card.offset) <= 2;

              return (
                <div
                  key={String(card.key)}
                  data-carousel-index={card.origIdx}
                  data-carousel-active={isFront ? "true" : "false"}
                  data-carousel-offset={card.offset}
                  className={`absolute will-change-transform gd-card gd-offset-${card.offset}`}
                  style={{
                    transition: isDragging
                      ? "none"
                      : "transform 600ms cubic-bezier(0.22, 1, 0.36, 1), opacity 600ms ease",
                  }}
                  onClick={(e) => {
                    if (!isFront && isVisible && !hasDragged.current) {
                      e.stopPropagation();
                      onChange(card.origIdx);
                    }
                  }}
                >
                  <div className="relative h-full w-full">
                    {renderItem(card.item, card.origIdx, {
                      isFront,
                      offset: card.offset,
                      isVisible,
                      safeIndex,
                      total: n,
                    })}
                  </div>
                </div>
              );
            })
          ) : renderedCards.map((card) => {
            const isFront = card.offset === 0;
            const isVisible = Math.abs(card.offset) <= 2;
            const slotStyle = getSlotStyle(card.offset);

            return (
              <div
                key={String(card.key)}
                data-carousel-index={card.origIdx}
                data-carousel-active={isFront ? "true" : "false"}
                className="absolute w-[280px] sm:w-[310px] md:w-[320px] h-[495px] sm:h-[525px] will-change-transform"
                style={{
                  ...slotStyle,
                  transition: isDragging
                    ? "none"
                    : "transform 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms ease, filter 500ms ease",
                }}
                onClick={(e) => {
                  if (!isFront && isVisible && !hasDragged.current) {
                    e.stopPropagation();
                    onChange(card.origIdx);
                  }
                }}
              >
                {renderItem(card.item, card.origIdx, {
                  isFront,
                  offset: card.offset,
                  isVisible,
                  safeIndex,
                  total: n,
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Bottom Dock Navigation (Mobile Only) */}
      {n > 1 && (
        <div className={variant === "glass-drum" ? "hidden" : "glass-carousel-mobile-controls md:hidden"}>
          <button
            type="button"
            onClick={handlePrev}
            aria-label={prevAriaLabel}
            className="grid h-10 w-10 place-items-center rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </button>

          <div className="rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-mono font-bold text-primary">
            {String(safeIndex + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
          </div>

          <button
            type="button"
            onClick={handleNext}
            aria-label={nextAriaLabel}
            className="grid h-10 w-10 place-items-center rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <ChevronRight className="h-5 w-5 rtl:rotate-180" />
          </button>
        </div>
      )}

      {/* Pagination Indicators (Desktop/Tablet Only) */}
      {n > 1 && (
        <div className={variant === "glass-drum" ? "glass-carousel-pagination" : "hidden md:flex items-center justify-center gap-1.5 pt-4 md:pt-6"}>
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i)}
              aria-label={`Go to ${itemAriaLabelPrefix} ${i + 1}`}
              aria-current={i === safeIndex ? "true" : undefined}
              className={`${variant === "glass-drum" ? "glass-carousel-dot" : "h-2 rounded-full transition-all cursor-pointer"} ${
                i === safeIndex
                  ? "w-6 sm:w-7 bg-primary"
                  : "w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CoverflowCarousel;
