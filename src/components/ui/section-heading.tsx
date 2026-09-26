import React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  theme?: "light" | "dark";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  theme = "light",
  className,
}: SectionHeadingProps) {
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "space-y-3",
        align === "center" ? "text-center mx-auto max-w-2xl" : "max-w-2xl",
        className
      )}
    >
      {eyebrow && (
        <p className={cn("eyebrow", isDark && "text-clay")}>{eyebrow}</p>
      )}

      <h2
        className={cn(
          "fluid-h2 tracking-[-0.02em] font-normal",
          isDark ? "text-bone" : "text-ink"
        )}
      >
        {title}
      </h2>

      {description && (
        <div
          className={cn(
            "text-[15px] leading-relaxed pt-1",
            isDark ? "text-bone/80" : "text-ink-soft"
          )}
        >
          {typeof description === "string" ? <p>{description}</p> : description}
        </div>
      )}
    </div>
  );
}
export default SectionHeading;
