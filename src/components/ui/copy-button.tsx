"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

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
      className={`inline-flex items-center gap-1.5 rounded-md border border-line bg-cream/70 px-2 py-1 text-[11px] font-medium text-ink-soft transition-all hover:border-forest/40 hover:text-ink hover:bg-sand/50 active:scale-95 ${className}`}
      aria-label={`${copied ? "Copied" : "Copy"} ${text}`}
      title={`Copy ${text}`}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-forest" />
          <span className="text-forest font-semibold" aria-live="polite">
            Copied
          </span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3 opacity-70" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
