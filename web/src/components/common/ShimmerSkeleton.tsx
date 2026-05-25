/* ════════════════════════════════════════
   ShimmerSkeleton — Animated Shimmer Loading Card
   Matches card dimensions exactly, shown within 300ms of fetch start
   ════════════════════════════════════════ */

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/* ─── Shimmer Base ─────────────────────────────────────── */

interface ShimmerBlockProps {
  className?: string;
}

function ShimmerBlock({ className = "" }: ShimmerBlockProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700 ${className}`}
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10"
        animate={{ x: ["-100%", "100%"] }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "linear",
        }}
      />
    </div>
  );
}

/* ─── Card Shimmer (exact card dimensions) ─────────────── */

/**
 * Shimmer skeleton that matches the swipeable card layout exactly.
 *
 * Dimensions match the Card component:
 *   - Image area: aspect-[4/3]
 *   - Body padding: p-5 with title, description, tags, metadata
 *
 * Use within a SkeletonWrapper with loading=true when fetching.
 */
export function CardShimmer() {
  return (
    <div className="w-full max-w-sm mx-auto" aria-hidden="true">
      {/* Image/header area — matches card aspect ratio */}
      <ShimmerBlock className="aspect-[4/3] w-full rounded-t-2xl" />

      {/* Card body */}
      <div className="space-y-3 p-5">
        {/* Title line */}
        <ShimmerBlock className="h-6 w-3/4" />

        {/* Description lines */}
        <ShimmerBlock className="h-4 w-full" />
        <ShimmerBlock className="h-4 w-5/6" />
        <ShimmerBlock className="h-4 w-4/6" />

        {/* Tag chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          <ShimmerBlock className="h-6 w-16 rounded-full" />
          <ShimmerBlock className="h-6 w-20 rounded-full" />
          <ShimmerBlock className="h-6 w-14 rounded-full" />
        </div>

        {/* Bottom metadata row */}
        <div className="flex items-center gap-3 pt-1">
          <ShimmerBlock className="h-4 w-24" />
          <ShimmerBlock className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

/* ─── Stack Shimmer (3-card stack) ─────────────────────── */

/**
 * Renders a stack of card shimmers to fill the viewport
 * while the initial batch loads.
 */
export function StackShimmer() {
  return (
    <div className="flex flex-col items-center gap-3 w-full" aria-label="Loading cards">
      <CardShimmer />
    </div>
  );
}

/* ─── Skeleton Wrapper with Delay ──────────────────────── */

interface ShimmerSkeletonProps {
  /** Whether data is still loading */
  loading: boolean;
  /** Minimum time before showing skeleton (prevents flash) */
  delayMs?: number;
  /** Skeleton content to show while loading */
  skeleton?: React.ReactNode;
  /** Actual content when not loading */
  children: React.ReactNode;
}

/**
 * ShimmerSkeleton wrapper with configurable show delay.
 *
 * Shows the skeleton only after `delayMs` (default 300ms) of loading.
 * This prevents a flash of skeleton content for fast fetches
 * while ensuring skeletons appear within the performance target.
 *
 * Usage:
 *   <ShimmerSkeleton loading={isLoading}>
 *     <MyContent />
 *   </ShimmerSkeleton>
 */
export function ShimmerSkeleton({
  loading,
  delayMs = 300,
  skeleton = <StackShimmer />,
  children,
}: ShimmerSkeletonProps) {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowSkeleton(false);
      return;
    }

    // Show skeleton after delay to avoid flash
    const timer = setTimeout(() => setShowSkeleton(true), delayMs);
    return () => clearTimeout(timer);
  }, [loading, delayMs]);

  if (loading && showSkeleton) {
    return <>{skeleton}</>;
  }

  return <>{children}</>;
}

export default ShimmerSkeleton;
