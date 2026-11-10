"use client";

import { useState } from "react";
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 px-3 py-2 text-xs font-semibold transition-all hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-primary/50 hover:text-primary dark:hover:text-primary active:scale-95 cursor-pointer shadow-2xs ${className}`}
      aria-label={`${copied ? "Copied" : "Copy"} ${text}`}
      title={`Copy ${text}`}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-primary" />
          <span className="text-primary font-semibold" aria-live="polite">
            Copied
          </span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
