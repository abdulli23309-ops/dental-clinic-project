"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";

export interface LightboxItem {
  layoutId: string;
  src: string;
  alt: string;
  caption?: string | null;
}

interface LightboxContextType {
  activeImage: LightboxItem | null;
  openLightbox: (item: LightboxItem) => void;
  closeLightbox: () => void;
}

const LightboxContext = createContext<LightboxContextType | undefined>(undefined);

export function useLightbox() {
  const context = useContext(LightboxContext);
  if (!context) {
    throw new Error("useLightbox must be used within a LightboxProvider");
  }
  return context;
}

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [activeImage, setActiveImage] = useState<LightboxItem | null>(null);

  const openLightbox = useCallback((item: LightboxItem) => {
    setActiveImage(item);
  }, []);

  const closeLightbox = useCallback(() => {
    setActiveImage(null);
  }, []);

  // Keyboard accessibility: Escape key dismisses modal
  useEffect(() => {
    if (!activeImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeLightbox();
      }
    };

    // Lock body scroll while modal is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [activeImage, closeLightbox]);

  return (
    <LightboxContext.Provider value={{ activeImage, openLightbox, closeLightbox }}>
      {children}

      <AnimatePresence>
        {activeImage && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={activeImage.caption || activeImage.alt || "Expanded image preview"}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8"
          >
            {/* Semi-transparent dark backdrop with blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={closeLightbox}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            />

            {/* Floating Top-Right Close 'X' Button */}
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8, rotate: -45 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.8, rotate: -45 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={closeLightbox}
              className="absolute top-5 right-5 sm:top-6 sm:right-6 z-50 text-white text-lg font-bold bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-full h-11 w-11 flex items-center justify-center transition-colors cursor-pointer border border-white/15 shadow-xl backdrop-blur-md"
              aria-label="Close image preview"
            >
              ✕
            </motion.button>

            {/* Centered Modal Content Container with Fixed Viewport Sizing */}
            <div
              onClick={closeLightbox}
              className="relative z-10 w-full h-full flex flex-col items-center justify-center cursor-pointer pointer-events-auto select-none"
            >
              {/* Uniform Viewport Image Stage */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-[92vw] h-[82vh] md:w-[90vw] md:h-[90vh] flex items-center justify-center cursor-default pointer-events-auto"
              >
                {/* Shared Element Transition Image with object-fit: contain */}
                <motion.img
                  layoutId={activeImage.layoutId}
                  src={activeImage.src}
                  alt={activeImage.alt}
                  className="w-full h-full object-contain rounded-2xl shadow-2xl"
                  transition={{
                    type: "spring",
                    stiffness: 320,
                    damping: 32,
                    mass: 0.8,
                  }}
                />
              </div>

              {/* Optional Localized Caption */}
              {activeImage.caption && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25, delay: 0.15 }}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3 px-5 py-2 rounded-full bg-white/15 border border-white/20 backdrop-blur-md text-white text-xs sm:text-sm font-semibold tracking-wide text-center shadow-lg max-w-lg cursor-default"
                >
                  {activeImage.caption}
                </motion.div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </LightboxContext.Provider>
  );
}

export default LightboxProvider;

