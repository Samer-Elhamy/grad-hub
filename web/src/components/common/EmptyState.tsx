/* ════════════════════════════════════════
   EmptyState — "Searching for ideas..." state
   Animated search indicator with estimated wait time
   ════════════════════════════════════════ */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

/* ─── Animated Search Icon ─────────────────────────────── */

function SearchIndicator() {
  return (
    <motion.div
      className="relative flex items-center justify-center"
      aria-hidden="true"
    >
      {/* Pulse ring */}
      <motion.div
        className="absolute h-20 w-20 rounded-full border-2 border-blue-400/30 dark:border-blue-500/30"
        animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute h-14 w-14 rounded-full border-2 border-blue-400/50 dark:border-blue-500/50"
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: 0.3 }}
      />

      {/* Search icon */}
      <motion.svg
        className="relative h-12 w-12 text-blue-500 dark:text-blue-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        animate={{ rotate: [0, 15, -15, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </motion.svg>
    </motion.div>
  );
}

/* ─── Estimated Wait Timer ─────────────────────────────── */

function EstimatedWait() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const display =
    elapsed < 60
      ? `${elapsed}s`
      : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;

  return (
    <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
      Searching for {display}...
    </p>
  );
}

/* ─── EmptyState Component ─────────────────────────────── */

interface EmptyStateProps {
  /** Custom message override (default: "Searching for ideas...") */
  message?: string;
  /** Subtitle shown below the main message */
  subtitle?: string;
  /** Whether to show the estimated wait indicator */
  showTimer?: boolean;
}

/**
 * Empty state shown when no ideas are available:
 *   - Initial load (waiting for backend)
 *   - All ideas swiped (waiting for more)
 *
 * Features an animated search icon, status message,
 * and estimated wait time indicator.
 */
export function EmptyState({
  message = "Searching for ideas...",
  subtitle = "We're scanning university repositories and trending projects to find ideas that match your preferences.",
  showTimer = true,
}: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      role="status"
      aria-label="Loading ideas"
    >
      {/* Animated search indicator */}
      <SearchIndicator />

      {/* Message */}
      <h2 className="mt-6 text-lg font-semibold text-gray-700 dark:text-gray-300">
        {message}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
        {subtitle}
      </p>

      {/* Estimated wait */}
      {showTimer && (
        <div className="mt-6">
          <EstimatedWait />
        </div>
      )}

      {/* Subtle loading dots */}
      <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-blue-400 dark:bg-blue-500"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
