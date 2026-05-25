/* ════════════════════════════════════════
   Animation Definitions — Grad Projects Hub v3
   Framer Motion (motion) swipe + micro-interactions
   Import from "motion/react" (framer-motion v12+)
   ════════════════════════════════════════ */

import { type Variants, type Transition } from "framer-motion";

// ── Constants ──
export const SWIPE_THRESHOLD = 150;
export const SWIPE_VELOCITY_THRESHOLD = 500;
export const SWIPE_DURATION = 300;
export const SWIPE_TRANSLATE_X = 500;
export const SWIPE_ROTATE = 15;
export const CARD_ENTER_DURATION = 350;

// ── Transition Presets ──

/** Easing functions matching CSS custom properties */
export const ease = {
  out: [0, 0, 0.2, 1] as [number, number, number, number],
  in: [0.4, 0, 1, 1] as [number, number, number, number],
  inOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  backOut: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
};

/** Standard transitions */
export const transitions = {
  /** Fast micro-interaction (button hover/press) */
  micro: {
    type: "spring" as const,
    stiffness: 500,
    damping: 30,
    mass: 0.5,
    duration: 0.15,
  },
  /** Swipe exit animation */
  swipe: {
    type: "tween" as const,
    ease: ease.out,
    duration: 0.3,
  },
  /** Card entry from stack */
  cardEnter: {
    type: "spring" as const,
    stiffness: 300,
    damping: 25,
    mass: 0.8,
    duration: 0.35,
  },
  /** Spring-back when under threshold */
  springBack: {
    type: "spring" as const,
    stiffness: 300,
    damping: 20,
    mass: 0.5,
  },
  /** Page transition */
  page: {
    type: "tween" as const,
    ease: ease.out,
    duration: 0.2,
  },
};

// ── Variants ──

/**
 * Card swipe variants — animate card off screen
 * Use with AnimatePresence custom prop for direction-aware exit
 */
export const cardSwipeVariants: Variants = {
  /** Initial state — centered, full opacity */
  initial: {
    x: 0,
    y: 0,
    rotate: 0,
    opacity: 1,
    scale: 1,
  },
  /** Swipe right */
  swipeRight: {
    x: SWIPE_TRANSLATE_X,
    rotate: SWIPE_ROTATE,
    opacity: 0,
    transition: transitions.swipe,
  },
  /** Swipe left */
  swipeLeft: {
    x: -SWIPE_TRANSLATE_X,
    rotate: -SWIPE_ROTATE,
    opacity: 0,
    transition: transitions.swipe,
  },
  /** Swipe up (superlike) */
  swipeUp: {
    y: -SWIPE_TRANSLATE_X,
    opacity: 0,
    transition: transitions.swipe,
  },
};

/**
 * Card stack variants — layering for 3 visible cards
 */
export const cardStackVariants: Variants = {
  /** Top card — full scale, draggable */
  top: {
    scale: 1,
    y: 0,
    opacity: 1,
    zIndex: 30,
    transition: transitions.cardEnter,
  },
  /** Middle card — slightly scaled back, offset down */
  middle: {
    scale: 0.98,
    y: 4,
    opacity: 1,
    zIndex: 20,
    transition: transitions.cardEnter,
  },
  /** Bottom card — further scaled back, more offset */
  bottom: {
    scale: 0.96,
    y: 8,
    opacity: 0.9,
    zIndex: 10,
    transition: transitions.cardEnter,
  },
  /** Entering the stack */
  enter: {
    scale: 0.95,
    y: 8,
    opacity: 0,
    transition: { duration: 0 },
  },
  /** Exiting the stack */
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

/**
 * Card drag variants — while user is dragging
 */
export const cardDragVariants: Variants = {
  idle: {
    scale: 1,
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  },
  dragging: {
    scale: 1.04,
    boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
    cursor: "grabbing",
  },
};

// ── Button Micro-interactions ──

/** Like/Dislike action button hover & press */
export const buttonVariants: Variants = {
  idle: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: { duration: 0.15, ease: ease.out },
  },
  tap: {
    scale: 0.95,
    transition: { duration: 0.1, ease: ease.in },
  },
};

/** Generic icon button (tag, close, etc.) */
export const iconButtonVariants: Variants = {
  idle: { scale: 1 },
  hover: {
    scale: 1.1,
    transition: { duration: 0.15, ease: ease.out },
  },
  tap: {
    scale: 0.9,
    transition: { duration: 0.1, ease: ease.in },
  },
};

// ── Page Transitions ──

/** Fade in for page-level transitions */
export const pageTransitionVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2, ease: ease.out },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: ease.in },
  },
};

/** Slide up for modals / panels entering */
export const slideUpVariants: Variants = {
  initial: { y: 40, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: ease.out },
  },
  exit: {
    y: 20,
    opacity: 0,
    transition: { duration: 0.2, ease: ease.in },
  },
};

/** Scale bounce for "superlike" / star animations */
export const bounceVariants: Variants = {
  initial: { scale: 0 },
  animate: {
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 15,
      mass: 0.5,
    },
  },
};

// ── Swipe Indicator Overlay ──

/**
 * Returns the transform value map for real-time swipe tracking.
 * Use with motion.div's `style` prop and `useMotionValue`.
 *
 * Example:
 * ```tsx
 * const x = useMotionValue(0);
 * const rotate = useTransform(x, [-300, 300], [-15, 15]);
 * const likeOpacity = useTransform(x, [0, 150], [0, 1]);
 * const nopeOpacity = useTransform(x, [-150, 0], [1, 0]);
 * ```
 */
export const swipeTransformConfig = {
  /** Input range (drag offset in px) */
  inputRange: [-300, 0, 300] as [number, number, number],
  /** Output rotation in degrees */
  rotateRange: [-15, 0, 15] as [number, number, number],
  /** Like indicator opacity (appears when dragging right) */
  likeOpacityInput: [0, 150] as [number, number],
  likeOpacityOutput: [0, 1] as [number, number],
  /** Nope indicator opacity (appears when dragging left) */
  nopeOpacityInput: [-150, 0] as [number, number],
  nopeOpacityOutput: [1, 0] as [number, number],
};

// ── Gesture Helpers ──

export interface SwipeDirection {
  /** Normalized direction: "left" | "right" | "up" | null */
  direction: "left" | "right" | "up" | null;
  /** Whether the swipe exceeds threshold */
  isSwiped: boolean;
}

/**
 * Determine swipe direction from drag end event.
 *
 * @param offsetX - Total horizontal drag offset in px
 * @param offsetY - Total vertical drag offset in px
 * @param velocityX - Final horizontal velocity in px/s
 * @param velocityY - Final vertical velocity in px/s
 * @returns Detected swipe direction and whether it exceeds threshold
 */
export function getSwipeDirection(
  offsetX: number,
  offsetY: number,
  velocityX: number,
  velocityY: number
): SwipeDirection {
  const absOffsetX = Math.abs(offsetX);
  const absOffsetY = Math.abs(offsetY);
  const absVelocityX = Math.abs(velocityX);
  const absVelocityY = Math.abs(velocityY);

  // Determine primary axis
  const isHorizontal = absOffsetX > absOffsetY;

  // Check threshold
  const exceededThreshold =
    absOffsetX > SWIPE_THRESHOLD || absVelocityX > SWIPE_VELOCITY_THRESHOLD;

  if (!exceededThreshold) {
    return { direction: null, isSwiped: false };
  }

  if (isHorizontal) {
    return {
      direction: offsetX > 0 ? "right" : "left",
      isSwiped: true,
    };
  }

  // Vertical swipe (superlike)
  if (absOffsetY > SWIPE_THRESHOLD || absVelocityY > SWIPE_VELOCITY_THRESHOLD) {
    return {
      direction: offsetY < 0 ? "up" : null,
      isSwiped: offsetY < 0,
    };
  }

  return { direction: null, isSwiped: false };
}

/**
 * Variant name for AnimatePresence exit based on direction
 */
export function getExitVariant(direction: "left" | "right" | "up"): string {
  switch (direction) {
    case "right":
      return "swipeRight";
    case "left":
      return "swipeLeft";
    case "up":
      return "swipeUp";
  }
}
