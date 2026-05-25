/* ════════════════════════════════════════
   NetworkBanner — Offline Network Banner
   Shows "You're offline — swipes saved locally" banner at top
   Auto-hides when connectivity restored
   ════════════════════════════════════════ */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Constants ────────────────────────────────────────── */

const STORAGE_KEY_QUEUE = "grad-hub-offline-queue";

/* ─── Banner Variants ──────────────────────────────────── */

const bannerVariants = {
  hidden: { y: -48, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 28 },
  },
  exit: {
    y: -48,
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

/* ─── Network Detection ────────────────────────────────── */

function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    function goOnline() {
      setIsOnline(true);
    }
    function goOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}

/* ─── Offline Queue Count ───────────────────────────────── */

function useOfflineQueueCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function updateCount() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_QUEUE);
        const queue = raw ? JSON.parse(raw) : [];
        setCount(Array.isArray(queue) ? queue.length : 0);
      } catch {
        setCount(0);
      }
    }

    // Check on mount and when storage changes
    updateCount();
    window.addEventListener("storage", updateCount);
    return () => window.removeEventListener("storage", updateCount);
  }, []);

  return count;
}

/* ─── NetworkBanner Component ──────────────────────────── */

interface NetworkBannerProps {
  /** Custom offline message (default: "You're offline") */
  offlineMessage?: string;
  /** Custom online sync message (default: "Back online — syncing...") */
  onlineMessage?: string;
}

/**
 * Network connectivity banner.
 *
 * Shows a slide-down banner when the browser goes offline,
 * and auto-hides when connectivity is restored.
 * Displays the count of locally queued swipes.
 *
 * Usage:
 *   <NetworkBanner />  — Place once near the top of the app layout
 */
export function NetworkBanner({
  offlineMessage = "You're offline",
  onlineMessage = "Back online — syncing...",
}: NetworkBannerProps) {
  const isOnline = useOnlineStatus();
  const queueCount = useOfflineQueueCount();
  const [showSyncing, setShowSyncing] = useState(false);
  const [prevOnline, setPrevOnline] = useState(true);

  // Detect transition from offline → online to show syncing state
  useEffect(() => {
    if (!prevOnline && isOnline && queueCount > 0) {
      setShowSyncing(true);
      const timer = setTimeout(() => setShowSyncing(false), 3000);
      return () => clearTimeout(timer);
    }
    setPrevOnline(isOnline);
  }, [isOnline, prevOnline, queueCount]);

  const isVisible = !isOnline || showSyncing;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={showSyncing ? "syncing" : "offline"}
          variants={bannerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={`sticky top-0 z-[60] w-full px-4 py-2.5 text-center text-sm font-medium shadow-sm ${
            showSyncing
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
              : "bg-amber-50 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="mx-auto flex max-w-lg items-center justify-center gap-2">
            {/* Icon */}
            {showSyncing ? (
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.499 7.498h16.002m0 0l-5.665-5.665m5.665 5.665l-5.665 5.665m-11.337 4.168h16.002m0 0l-5.665 5.665m5.665-5.665l-5.665-5.665"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 4.243a1 1 0 010-1.414"
                />
              </svg>
            )}

            <span>
              {showSyncing
                ? onlineMessage
                : `${offlineMessage} — swipes saved locally`}
            </span>

            {/* Queue count badge */}
            {!showSyncing && queueCount > 0 && (
              <span
                className="inline-flex items-center justify-center rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800
                  dark:bg-amber-800 dark:text-amber-200"
              >
                {queueCount}
              </span>
            )}

            {/* Spinning sync indicator */}
            {showSyncing && (
              <svg
                className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-300"
                fill="none"
                viewBox="0 0 24 24"
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NetworkBanner;
