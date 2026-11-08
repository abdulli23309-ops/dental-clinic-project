/**
 * Marlow Dental — Central animation system
 *
 * Single source of truth for all motion values used across the frontend.
 * Import from here instead of inline-ing animation objects, so durations,
 * easings and hover styles stay consistent (DRY) and can be tuned in one place.
 *
 * All variants respect `useReducedMotion()` — see `reducedVariant()` helper
 * below, and every wrapper component checks reduced motion first.
 */

import type { Variants } from "motion/react";
import { useReducedMotion } from "motion/react";

/*─────────────────────────────────────────────────────────────────────────────
  Timing & easing
─────────────────────────────────────────────────────────────────────────────*/

/* Soft, fast, never flashy: ease-out for entrances, spring for hover/layout. */
export const easeOut = [0.22, 1, 0.36, 1] as const;
export const easeInOut = [0.42, 0, 0.58, 1] as const;

export const springHover = {
  type: "spring",
  stiffness: 340,
  damping: 26,
} as const;

export const springLayout = {
  type: "spring",
  stiffness: 380,
  damping: 30,
} as const;

export const duration = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.35,
  slow: 0.5,
} as const;

export const pageTransitionDuration = 0.4;
export const modalDuration = 0.3;

/*─────────────────────────────────────────────────────────────────────────────
  Entrance variants
─────────────────────────────────────────────────────────────────────────────*/

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: duration.normal, ease: easeOut },
  },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: easeOut },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.normal, ease: easeOut },
  },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.slow, ease: easeOut },
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.slow, ease: easeOut },
  },
};

/*─────────────────────────────────────────────────────────────────────────────
  Container / stagger
─────────────────────────────────────────────────────────────────────────────*/

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerRow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

/*─────────────────────────────────────────────────────────────────────────────
  Interaction variants
─────────────────────────────────────────────────────────────────────────────*/

/* Soft elevated shadow on hover, slight press on tap. boxShadow is kept subtle
   and short-lived so it stays performant on the few cards that use it. */
export const cardHover = {
  whileHover: {
    y: -5,
    boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.10)",
    transition: { duration: 0.2, ease: easeOut },
  },
  whileTap: { scale: 0.98 },
} as const;

export const buttonHover = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.97 },
} as const;

export const iconButtonHover = {
  whileHover: { scale: 1.1, rotate: 6 },
  whileTap: { scale: 0.9 },
} as const;

/*─────────────────────────────────────────────────────────────────────────────
  Page transitions
─────────────────────────────────────────────────────────────────────────────*/

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: pageTransitionDuration, ease: easeOut },
  },
  exit: {
    opacity: 0,
    y: -16,
    transition: { duration: 0.3, ease: easeInOut },
  },
};

/*─────────────────────────────────────────────────────────────────────────────
  Modals / overlays / drawers
─────────────────────────────────────────────────────────────────────────────*/

export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25, ease: easeOut },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: easeInOut },
  },
};

export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 14 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: modalDuration, ease: easeOut },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 14,
    transition: { duration: 0.22, ease: easeInOut },
  },
};

export const drawerSlide: Variants = {
  hidden: { opacity: 0, x: "100%" },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: easeOut },
  },
  exit: {
    opacity: 0,
    x: "100%",
    transition: { duration: 0.25, ease: easeInOut },
  },
};

/*─────────────────────────────────────────────────────────────────────────────
  Lists & tables
─────────────────────────────────────────────────────────────────────────────*/

export const listItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: easeOut },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2, ease: easeInOut },
  },
};

/*─────────────────────────────────────────────────────────────────────────────
  Forms
─────────────────────────────────────────────────────────────────────────────*/

/* Staggered container for groups of form fields. Children fade up in sequence. */
export const formContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

/* Single form field entrance: fades up slightly. */
export const formField: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: easeOut },
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: { duration: 0.15, ease: easeInOut },
  },
};

/* Shake the field wrapper when a validation error appears / changes. */
export const fieldShake: Variants = {
  idle: { x: 0 },
  shake: {
    x: [0, -7, 7, -5, 5, -3, 3, 0],
    transition: {
      duration: 0.45,
      times: [0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 1],
      ease: "linear",
    },
  },
};

/* Slide the inline validation error message down when it appears. */
export const errorSlideDown: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: easeOut },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15, ease: easeInOut },
  },
};

/* Submit button: idle <-> loading <-> success states. */
export const submitButton: Variants = {
  idle: { scale: 1 },
  loading: { scale: 0.98 },
  success: {
    scale: 1,
    boxShadow: "0 0 0 4px rgba(34, 197, 94, 0.2)",
    transition: { duration: 0.2, ease: easeOut },
  },
};

/*─────────────────────────────────────────────────────────────────────────────
  Helpers
─────────────────────────────────────────────────────────────────────────────*/

/** Returns a reduced-motion-safe variant: instant opacity, no transforms. */
export function reducedVariant(base: Variants): Variants {
  return {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.01 } },
    ...(base.exit ? { exit: { opacity: 0, transition: { duration: 0.01 } } } : {}),
  };
}

/** Hook re-export so every animation file imports from one place. */
export { useReducedMotion };
