import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  shadow?: "flat" | "subtle" | "card" | "elevated" | "modal";
  surface?: "bone" | "cream" | "sand";
  hoverLift?: boolean;
  children: React.ReactNode;
}

export function Card({
  shadow = "subtle",
  surface = "bone",
  hoverLift = false,
  className,
  children,
  ...props
}: CardProps) {
  const surfaceStyles = {
    bone: "bg-bone border-line",
    cream: "bg-cream/60 border-line/80",
    sand: "bg-sand/40 border-line",
  };

  const shadowStyles = {
    flat: "",
    subtle: "shadow-subtle",
    card: "shadow-card",
    elevated: "shadow-elevated",
    modal: "shadow-modal",
  };

  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border transition-all duration-200",
        surfaceStyles[surface],
        shadowStyles[shadow],
        hoverLift && "hover:-translate-y-1 hover:shadow-card hover:border-forest/30",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
export default Card;
