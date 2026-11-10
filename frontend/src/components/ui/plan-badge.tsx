import React from "react";
import { Sparkles, ShieldCheck, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaaSPlanTier = "starter" | "pro" | "enterprise";

export interface PlanBadgeProps {
  tier?: SaaSPlanTier | string;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

/**
 * Visual badge indicating current SaaS organization tier.
 */
export function PlanBadge({
  tier = "enterprise",
  size = "sm",
  showIcon = true,
  className,
}: PlanBadgeProps) {
  const normalized = tier.toLowerCase();

  const isEnterprise = normalized.includes("enterprise");
  const isPro = normalized.includes("pro");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-mono font-bold uppercase tracking-wider select-none border transition-colors",
        size === "sm" ? "px-2.5 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        isEnterprise &&
          "bg-primary/10 text-primary border-primary/20",
        isPro &&
          "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
        !isEnterprise &&
          !isPro &&
          "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
        className
      )}
    >
      {showIcon && (
        <>
          {isEnterprise ? (
            <Crown className="w-3 h-3 text-primary" />
          ) : isPro ? (
            <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          ) : (
            <ShieldCheck className="w-3 h-3 text-slate-600 dark:text-slate-400" />
          )}
        </>
      )}
      <span>{tier}</span>
    </span>
  );
}

