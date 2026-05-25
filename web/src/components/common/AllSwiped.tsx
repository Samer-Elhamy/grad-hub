/* ════════════════════════════════════════
   AllSwiped — "All Swiped" State
   "More ideas coming soon" with reconnect countdown + background search indicator
   ════════════════════════════════════════ */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

/* ─── Types ────────────────────────────────────────────── */

interface AllSwipedProps {
  /** WebSocket status from the useWebSocket hook */
  wsStatus: "disconnected" | "connecting" | "connected" | "reconnecting";
  /** Callback to manually reconnect WebSocket */
  onReconnect?: () => void;
  /** Custom message (default: "More ideas coming soon") */
  message?: string;
  /** Expected reconnection delay in seconds (for countdown display) */
  estimatedReconnectSeconds?: number;
}

/* ─── Reconnect Countdown ───────────────────────────────── */

function ReconnectCountdown({ estimatedSeconds }: { estimatedSeconds: number }) {
  const [remaining, setRemaining] = useState(estimatedSeconds);

  useEffect(() => {
    setRemaining(estimatedSeconds);
    if (estimatedSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [estimatedSeconds]);

  if (remaining <= 0) return null;

  return (
    <p className="text-xs text-gray-400 dark:text-gray-500">
      Auto-reconnect in{" "}
      <span className="tabular-nums font-medium text-gray-600 dark:text-gray-400">
        {remaining}s
      </span>
    </p>
  );
}

/* ─── Background Search Animation ──────────────────────── */

function BackgroundSearchAnimation() {
  return (
    <div className="relative flex items-center justify-center" aria-hidden="true">
      {/* Orbiting dots */}
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute h-2 w-2 rounded-full bg-blue-400/60 dark:bg-blue-500/40"
          animate={{
            rotate: [0, 360],
            scale: [1, 0.5, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            delay: i * 0.75,
            ease: "linear",
          }}
          style={{
            transformOrigin: "0 -24px",
            left: "50%",
            top: "50%",
            rotate: `${i * 90}deg`,
          }}
        />
      ))}

      {/* Center dot */}
      <motion.div
        className="h-3 w-3 rounded-full bg-blue-500 dark:bg-blue-400"
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      />
    </div>
  );
}

/* ─── Status Badge ─────────────────────────────────────── */

function WsStatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    connected: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    connecting: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    reconnecting: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    disconnected: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  };

  const labelMap: Record<string, string> = {
    connected: "Connected",
    connecting: "Connecting...",
    reconnecting: "Reconnecting...",
    disconnected: "Disconnected",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        colorMap[status] ?? colorMap.disconnected
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "connected"
            ? "bg-emerald-500"
            : status === "connecting" || status === "reconnecting"
              ? "bg-amber-500 animate-pulse"
              : "bg-gray-400"
        }`}
      />
      {labelMap[status] ?? "Unknown"}
    </span>
  );
}

/* ─── AllSwiped Component ──────────────────────────────── */

/**
 * "All swiped" state shown when the user has gone through
 * all available ideas. Shows:
 *   - "More ideas coming soon" message
 *   - Background search animation (Deep Search Agent working)
 *   - WebSocket connection status with reconnect countdown
 *   - Manual retry/reconnect button
 *
 * Usage:
 *   <AllSwiped wsStatus={wsStatus} onReconnect={reconnect} />
 */
export function AllSwiped({
  wsStatus,
  onReconnect,
  message = "More ideas coming soon",
  estimatedReconnectSeconds = 10,
}: AllSwipedProps) {
  const handleRetry = useCallback(() => {
    onReconnect?.();
  }, [onReconnect]);

  return (
    <motion.div
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      role="status"
      aria-label="All ideas swiped"
    >
      {/* Background search animation */}
      <div className="mb-6">
        <BackgroundSearchAnimation />
      </div>

      {/* Message */}
      <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
        {message}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
        Our Deep Search Agent is crawling top university repositories and GitHub
        trending projects to find fresh ideas tailored to your preferences.
      </p>

      {/* Status info */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <WsStatusBadge status={wsStatus} />

        {(wsStatus === "disconnected" || wsStatus === "reconnecting") && (
          <>
            <ReconnectCountdown estimatedSeconds={estimatedReconnectSeconds} />

            {onReconnect && (
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm
                  hover:bg-blue-700 active:bg-blue-800 transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                  dark:focus-visible:ring-offset-gray-900"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                  />
                </svg>
                Reconnect Now
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

export default AllSwiped;
