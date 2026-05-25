/* ════════════════════════════════════════
   useSwipe — Drag gesture tracking hook
   Encapsulates Framer Motion drag logic for swipeable cards
   Handles threshold detection, snap-back, and exit direction
   ════════════════════════════════════════ */

import { useMotionValue, useTransform, animate, type MotionValue } from "framer-motion";
import { useCallback } from "react";
import type { SwipeDirection } from "../types/swipe";

export const SWIPE_THRESHOLD = 150;
export const SWIPE_VELOCITY_THRESHOLD = 500;
export const SNAP_BACK_SPRING = {
  type: "spring" as const,
  stiffness: 300,
  damping: 20,
  mass: 0.5,
};

export interface SwipeHandlers {
  x: MotionValue<number>;
  rotate: MotionValue<number>;
  likeOpacity: MotionValue<number>;
  nopeOpacity: MotionValue<number>;
  onDragEnd: (
    _: unknown,
    info: { offset: { x: number; y: number }; velocity: { x: number; y: number } },
  ) => void;
}

interface UseSwipeOptions {
  onSwipe: (direction: SwipeDirection) => void;
}

/**
 * Hook that provides Framer Motion values and handlers for card swiping.
 *
 * - x: MotionValue for horizontal drag position
 * - rotate: derived from x (max ±15deg)
 * - likeOpacity: fades in when dragging right
 * - nopeOpacity: fades in when dragging left
 * - onDragEnd: checks threshold, snaps back or triggers swipe
 */
export function useSwipe({ onSwipe }: UseSwipeOptions): SwipeHandlers {
  const x = useMotionValue(0);

  // Rotation follows drag: ~0.05deg per px, max 15deg at 300px
  const rotate = useTransform(x, [-300, 300], [-15, 15]);

  // Like indicator fades in when card moves right past 0
  const likeOpacity = useTransform(x, [0, 150], [0, 1]);

  // Nope indicator fades in when card moves left past 0
  const nopeOpacity = useTransform(x, [-150, 0], [1, 0]);

  const onDragEnd = useCallback(
    (
      _: unknown,
      info: { offset: { x: number; y: number }; velocity: { x: number; y: number } },
    ) => {
      const { offset, velocity } = info;
      const absX = Math.abs(offset.x);
      const absVX = Math.abs(velocity.x);

      const crossedThreshold = absX > SWIPE_THRESHOLD || absVX > SWIPE_VELOCITY_THRESHOLD;

      if (!crossedThreshold) {
        // Snap back to center with spring animation
        animate(x, 0, SNAP_BACK_SPRING);
        return;
      }

      // Trigger swipe - parent will handle exit animation via AnimatePresence
      const direction: SwipeDirection = offset.x > 0 ? "right" : "left";
      onSwipe(direction);
    },
    [onSwipe, x],
  );

  return {
    x,
    rotate,
    likeOpacity,
    nopeOpacity,
    onDragEnd,
  };
}
