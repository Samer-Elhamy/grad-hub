/* ════════════════════════════════════════
   ErrorToast — Error Toast Notification
   Animated slide-in from top, auto-dismiss, stacking support
   ════════════════════════════════════════ */

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../../store";

const AUTO_DISMISS_MS = 5000;

/* ── Variants ───────────────────────────────────────────── */

const toastVariants = {
  initial: { y: -80, opacity: 0, scale: 0.95 },
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
  exit: {
    y: -40,
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

/* ── Individual Toast ────────────────────────────────────── */

interface ToastItemProps {
  id: string;
  message: string;
  type: "error" | "success";
  onRetry?: () => void;
  onDismiss: (id: string) => void;
}

function ToastItem({ id, message, type, onRetry, onDismiss }: ToastItemProps) {
  const isError = type === "error";

  return (
    <motion.div
      layout
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`
        pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg
        ${isError
          ? "bg-red-50 text-red-900 dark:bg-red-900/90 dark:text-red-100"
          : "bg-emerald-50 text-emerald-900 dark:bg-emerald-900/90 dark:text-emerald-100"
        }
      `}
    >
      {/* Icon */}
      <span className="mt-0.5 shrink-0 text-lg leading-none">
        {isError ? "⚠️" : "✓"}
      </span>

      {/* Message */}
      <p className="flex-1 text-sm leading-snug">{message}</p>

      {/* Retry button (error only) */}
      {isError && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium
            bg-red-200 text-red-800 hover:bg-red-300
            dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700
            transition-colors"
        >
          Retry
        </button>
      )}

      {/* Close button */}
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="shrink-0 self-start p-0.5 text-current opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M4 4L12 12M12 4L4 12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </motion.div>
  );
}

/* ── Toast Container ─────────────────────────────────────── */

interface ErrorToastProps {
  /** Override retry handler for all error toasts */
  globalRetry?: () => void;
}

/**
 * Error toast container that renders all toasts from the store.
 * Toasts slide in from the top and auto-dismiss after 5 seconds.
 * Place once at the app root level.
 */
export function ErrorToast({ globalRetry }: ErrorToastProps) {
  const toasts = useStore((s) => s.toasts);
  const removeToast = useStore((s) => s.removeToast);

  const handleDismiss = useCallback(
    (id: string) => {
      removeToast(id);
    },
    [removeToast],
  );

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-4 z-[100] flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4"
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            onRetry={toast.type === "error" ? globalRetry : undefined}
            onDismiss={handleDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
