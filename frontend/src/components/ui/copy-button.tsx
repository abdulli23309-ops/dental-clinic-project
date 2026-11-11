"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

/**
 * Renders a compact button that copies text (such as an address or phone number) to the visitor's clipboard.
 * Provides clear visual confirmation by changing into a green/primary checkmark after being clicked.
 */
export function CopyButton({ text, label = "Copy", className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleCopy = async () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback if clipboard API is restricted
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className={`relative inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 px-3 py-2 text-xs font-semibold transition-all hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-primary/50 hover:text-primary dark:hover:text-primary active:scale-[0.97] cursor-pointer shadow-2xs ${className}`}
      aria-label={`${copied ? "Copied" : "Copy"} ${text}`}
      title={`Copy ${text}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={copied ? "copied" : "copy"} initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(4px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(4px)" }} transition={{ duration: 0.18, ease: "easeOut" }} className="inline-flex items-center justify-center gap-1.5">
          {copied ? <><Check className="h-3.5 w-3.5 text-primary" /><span className="text-primary font-semibold" aria-live="polite">Copied!</span></> : <><Copy className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" /><span>{label}</span></>}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
