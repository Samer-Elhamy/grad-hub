/* ════════════════════════════════════════
   CardActions — Action buttons row
   Dislike, super-like, like with Framer Motion micro-interactions
   ════════════════════════════════════════ */

import { motion } from "framer-motion";
import type { SwipeDirection } from "../../types/swipe";
import { t } from "../../i18n";
import { useStore } from "../../store";

interface CardActionsProps {
  onAction: (direction: SwipeDirection) => void;
  disabled?: boolean;
}

const buttonVariants = {
  idle: { scale: 1 },
  hover: {
    scale: 1.1,
    transition: { duration: 0.15, ease: [0, 0, 0.2, 1] },
  },
  tap: {
    scale: 0.9,
    transition: { duration: 0.1, ease: [0.4, 0, 1, 1] },
  },
};

function ActionCircle({
  icon,
  className,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  className: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm border border-gray-200 dark:border-gray-700 ${className} ${
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      }`}
      variants={buttonVariants}
      initial="idle"
      whileHover={disabled ? undefined : "hover"}
      whileTap={disabled ? undefined : "tap"}
      onClick={disabled ? undefined : onClick}
      aria-label={label}
      disabled={disabled}
    >
      {icon}
    </motion.button>
  );
}

export function CardActions({ onAction, disabled }: CardActionsProps) {
  const language = useStore((s) => s.language);
  return (
    <div className="flex items-center justify-center gap-5 py-4">
      {/* Spacer for symmetry */}
      <div className="w-14" />

      {/* Dislike */}
      <ActionCircle
        icon={
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        }
        className="text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30"
        label={t(language, "skipIdea")}
        onClick={() => onAction("left")}
        disabled={disabled}
      />

      {/* Super-like */}
      <ActionCircle
        icon={
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        }
        className="text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30"
        label={t(language, "starIdea")}
        onClick={() => onAction("up")}
        disabled={disabled}
      />

      {/* Like */}
      <ActionCircle
        icon={
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        }
        className="text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30"
        label={t(language, "likeIdea")}
        onClick={() => onAction("right")}
        disabled={disabled}
      />

      {/* Spacer for symmetry */}
      <div className="w-14" />
    </div>
  );
}
