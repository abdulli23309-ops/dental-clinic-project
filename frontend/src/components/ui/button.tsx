"use client";

import React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "premium" | "tactile-secondary";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  href?: string;
  external?: boolean;
  children: React.ReactNode;
}

const MotionLink = motion.create(Link);

/**
 * Renders an interactive button or navigational link styled with the clinic's signature pill shape.
 * It supports multiple visual styles and reduced-motion-aware tactile press feedback.
 */
export const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      href,
      external,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();
    const tapAnimation = !shouldReduceMotion ? { scale: 0.97 } : undefined;

    // Pill shape is an intentional editorial design choice for Marlow Dental
    const baseStyles =
      "inline-flex items-center justify-center font-medium tracking-wide select-none cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transition-colors duration-150";

    const variantStyles = {
      primary:
        "bg-primary text-white shadow-md hover:bg-primary/90 hover:opacity-95 active:opacity-90 active:scale-[0.97] focus-visible:ring-primary focus-visible:ring-offset-2 transition-all duration-150",
      premium:
        "bg-primary text-white shadow-md hover:bg-primary/90 hover:opacity-95 active:opacity-90 active:scale-[0.97] focus-visible:ring-primary focus-visible:ring-offset-2 transition-all duration-150",
      secondary:
        "btn-tactile-secondary focus-visible:ring-gray-400",
      "tactile-secondary":
        "btn-tactile-secondary focus-visible:ring-gray-400",
      outline:
        "bg-transparent text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary hover:-translate-y-0.5 hover:shadow-subtle active:translate-y-0 active:scale-[0.97] focus-visible:ring-primary transition-all duration-200",
      ghost:
        "bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.97] focus-visible:ring-primary transition-all duration-200",
    };

    const sizeStyles = {
      sm: "px-4 py-1.5 text-xs gap-1.5",
      md: "px-5 py-2.5 text-sm gap-2",
      lg: "px-7 py-3.5 text-[14.5px] gap-2.5",
    };

    const combinedClassName = cn(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      className
    );

    const content = (
      <>
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </>
    );

    if (href) {
      if (external) {
        return (
          <motion.a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={props.tabIndex ?? 0}
            suppressHydrationWarning
            className={combinedClassName}
            whileTap={tapAnimation}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            ref={ref as React.Ref<HTMLAnchorElement>}
            {...(props as any)}
          >
            {content}
          </motion.a>
        );
      }
      return (
        <MotionLink
          href={href}
          tabIndex={props.tabIndex ?? 0}
          suppressHydrationWarning
          className={combinedClassName}
          whileTap={tapAnimation}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          ref={ref as React.Ref<HTMLAnchorElement>}
          {...(props as any)}
        >
          {content}
        </MotionLink>
      );
    }

    return (
      <motion.button
        ref={ref as React.Ref<HTMLButtonElement>}
        tabIndex={props.tabIndex ?? 0}
        suppressHydrationWarning
        className={combinedClassName}
        disabled={disabled || isLoading}
        whileTap={disabled || isLoading ? undefined : tapAnimation}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
        {...(props as any)}
      >
        {content}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
export default Button;
