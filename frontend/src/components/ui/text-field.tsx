import React, { useId } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export interface TextFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  error?: string;
  helpText?: string;
  multiline?: boolean;
  rows?: number;
}

/**
 * Renders an accessible form input or multi-line textarea with linked label and validation error alerts.
 * It automatically announces errors to assistive technology and connects labels to inputs via unique IDs.
 */
export const TextField = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  TextFieldProps
>(
  (
    {
      id: customId,
      label,
      error,
      helpText,
      multiline = false,
      rows = 3,
      className,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = customId || generatedId;
    const errorId = `${inputId}-error`;
    const helpId = `${inputId}-help`;

    const commonClasses = cn(
      "w-full rounded-2xl border bg-cream/70 dark:bg-gray-800/80 px-4 py-3 text-[14px] text-ink dark:text-bone outline-none transition-colors",
      "focus:border-primary focus:ring-2 focus:ring-primary/20",
      error
        ? "border-red-600 focus:border-red-600 focus:ring-red-600/20"
        : "border-line dark:border-gray-700 hover:border-line/80 dark:hover:border-gray-600",
      className
    );

    return (
      <div className="w-full space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft/80"
        >
          {label}
          {required && <span className="ml-1 text-clay">*</span>}
        </label>

        {multiline ? (
          <textarea
            id={inputId}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            rows={rows}
            className={cn(commonClasses, "resize-none")}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helpText ? helpId : undefined}
            required={required}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            id={inputId}
            ref={ref as React.Ref<HTMLInputElement>}
            className={commonClasses}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helpText ? helpId : undefined}
            required={required}
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}

        {helpText && !error && (
          <p id={helpId} className="text-[12px] text-ink-soft/75">
            {helpText}
          </p>
        )}

        {error && (
          <p
            id={errorId}
            role="alert"
            aria-live="polite"
            className="flex items-center gap-1.5 text-[12px] text-red-600 dark:text-red-400 font-medium pt-0.5"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

TextField.displayName = "TextField";
export default TextField;
