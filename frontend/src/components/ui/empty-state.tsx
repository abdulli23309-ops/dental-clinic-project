import React from "react";
import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Reusable SaaS Empty State component.
 * Displays a styled icon, title, description, and primary CTA to resolve the empty state.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40",
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-center text-primary mb-4 transition-transform hover:scale-105">
        <Icon className="w-7 h-7" />
      </div>

      <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-1.5 tracking-tight">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel || children) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionLabel && (
            <Button
              variant="primary"
              size="sm"
              onClick={onAction}
              href={actionHref}
              className="rounded-xl shadow-xs"
            >
              {actionLabel}
            </Button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onSecondaryAction}
              className="rounded-xl"
            >
              {secondaryActionLabel}
            </Button>
          )}

          {children}
        </div>
      )}
    </div>
  );
}

