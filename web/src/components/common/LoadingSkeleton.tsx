/* ════════════════════════════════════════
   LoadingSkeleton — Skeleton Loading Placeholders
   Shimmer-animated placeholders for cards, history, preferences
   ════════════════════════════════════════ */

import { motion } from "framer-motion";

/* ─── Shimmer Base ──────────────────────────────────────── */

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700 ${className}`}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
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

/* ─── Card Skeleton ─────────────────────────────────────── */

/**
 * Full card skeleton matching the Card component layout.
 * Use in place of <CardStack /> while loading initial cards.
 */
export function CardSkeleton() {
  return (
    <div className="w-full max-w-card mx-auto" aria-hidden="true">
      {/* Image placeholder */}
      <Shimmer className="aspect-[4/3] w-full rounded-t-2xl" />

      {/* Body */}
      <div className="space-y-3 p-5">
        {/* Title */}
        <Shimmer className="h-6 w-3/4" />

        {/* Description lines */}
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-4 w-5/6" />

        {/* Tag pills */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Shimmer className="h-6 w-16 rounded-full" />
          <Shimmer className="h-6 w-20 rounded-full" />
          <Shimmer className="h-6 w-14 rounded-full" />
        </div>

        {/* Bottom metadata */}
        <div className="flex items-center gap-3 pt-2">
          <Shimmer className="h-4 w-24" />
          <Shimmer className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

/* ─── Card Stack Skeleton (3 cards) ─────────────────────── */

/**
 * Renders a stack of card skeletons to show while the
 * initial batch of ideas is loading from the backend.
 */
export function CardStackSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <CardSkeleton />
    </div>
  );
}

/* ─── History List Skeleton ─────────────────────────────── */

/**
 * Row skeleton for the history table/list.
 * Repeats 5 times to fill the visible viewport.
 */
export function HistoryListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {/* Header row */}
      <div className="flex items-center gap-4 px-4 py-2">
        <Shimmer className="h-4 w-8" />
        <Shimmer className="h-4 w-40" />
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-4 w-12" />
        <Shimmer className="h-4 w-24" />
      </div>

      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg px-4 py-3"
        >
          <Shimmer className="h-5 w-8 shrink-0" />
          <Shimmer className="h-5 w-36 flex-1" />
          <Shimmer className="h-5 w-16 shrink-0" />
          <Shimmer className="h-5 w-10 shrink-0 rounded-full" />
          <Shimmer className="h-5 w-28 shrink-0 hidden sm:block" />
        </div>
      ))}
    </div>
  );
}

/* ─── Preference Panel Skeleton ─────────────────────────── */

/**
 * Skeleton for the preference panel showing category tag chips,
 * keyword chips, and stat cards.
 */
export function PreferencePanelSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {/* Favourite categories section */}
      <div>
        <Shimmer className="h-5 w-36 mb-4" />
        <div className="flex flex-wrap gap-2">
          <Shimmer className="h-8 w-20 rounded-full" />
          <Shimmer className="h-8 w-28 rounded-full" />
          <Shimmer className="h-8 w-24 rounded-full" />
          <Shimmer className="h-8 w-16 rounded-full" />
          <Shimmer className="h-8 w-32 rounded-full" />
        </div>
      </div>

      {/* Keywords section */}
      <div>
        <Shimmer className="h-5 w-28 mb-4" />
        <div className="flex flex-wrap gap-2">
          <Shimmer className="h-6 w-16 rounded-md" />
          <Shimmer className="h-6 w-24 rounded-md" />
          <Shimmer className="h-6 w-20 rounded-md" />
          <Shimmer className="h-6 w-12 rounded-md" />
          <Shimmer className="h-6 w-28 rounded-md" />
          <Shimmer className="h-6 w-18 rounded-md" />
        </div>
      </div>

      {/* Stats section */}
      <div>
        <Shimmer className="h-5 w-24 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          <Shimmer className="h-20 rounded-xl" />
          <Shimmer className="h-20 rounded-xl" />
          <Shimmer className="h-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ─── Utility: Skeleton Wrapper ─────────────────────────── */

interface SkeletonWrapperProps {
  /** Whether to show skeleton or children */
  loading: boolean;
  /** Skeleton component to render while loading */
  skeleton: React.ReactNode;
  /** Content rendered when not loading */
  children: React.ReactNode;
}

/**
 * Wrapper component that conditionally renders a skeleton
 * or its children based on the `loading` prop.
 */
export function SkeletonWrapper({ loading, skeleton, children }: SkeletonWrapperProps) {
  if (loading) {
    return <>{skeleton}</>;
  }
  return <>{children}</>;
}
