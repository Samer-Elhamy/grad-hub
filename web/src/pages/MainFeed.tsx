/* ════════════════════════════════════════
   MainFeed — Card stack feed page
   WebSocket integration, card stack, action buttons
   ════════════════════════════════════════ */

import { useCallback } from "react";
import { motion } from "framer-motion";
import { CardStack } from "../components/Card/CardStack";
import { CardActions } from "../components/Card/CardActions";
import { useWebSocket } from "../hooks/useWebSocket";
import { useStore } from "../store";
import type { SwipeDirection } from "../types/swipe";
import { t } from "../i18n";

export function MainFeed() {
  const { status } = useWebSocket();
  const consumeTopCard = useStore((s) => s.consumeTopCard);
  const performSwipe = useStore((s) => s.performSwipe);
  const cards = useStore((s) => s.cards);
  const currentIndex = useStore((s) => s.currentIndex);
  const language = useStore((s) => s.language);

  const hasCards = currentIndex < cards.length;

  const handleAction = useCallback(
    (direction: SwipeDirection) => {
      if (!hasCards) return;
      const idea = consumeTopCard();
      if (idea) {
        performSwipe(idea, direction);
      }
    },
    [hasCards, consumeTopCard, performSwipe],
  );

  const statusColor =
    status === "connected"
      ? "bg-emerald-500"
      : status === "reconnecting"
        ? "bg-amber-500"
        : "bg-gray-400 dark:bg-gray-500";

  const statusLabel =
    status === "connected"
      ? t(language, "live")
      : status === "reconnecting"
        ? t(language, "reconnecting")
        : t(language, "offline");

  return (
    <motion.main
      className="flex flex-col items-center justify-between min-h-[calc(100vh-3.5rem)] px-4 py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
    >
      {/* Connection indicator */}
      <div className="w-full max-w-card flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Card stack */}
      <div className="relative flex-1 flex items-center justify-center w-full py-4">
        <SideSwipeButton
          testId="discover-side-dislike"
          direction="left"
          label={t(language, "skipIdea")}
          disabled={!hasCards}
          onClick={() => handleAction("left")}
        />
        <CardStack />
        <SideSwipeButton
          testId="discover-side-like"
          direction="right"
          label={t(language, "likeIdea")}
          disabled={!hasCards}
          onClick={() => handleAction("right")}
        />
      </div>

      {/* Action buttons */}
      <div className="w-full max-w-card">
        <CardActions onAction={handleAction} disabled={!hasCards} />
      </div>
    </motion.main>
  );
}

interface SideSwipeButtonProps {
  testId: string;
  direction: "left" | "right";
  label: string;
  disabled: boolean;
  onClick: () => void;
}

function SideSwipeButton({
  testId,
  direction,
  label,
  disabled,
  onClick,
}: SideSwipeButtonProps) {
  const isRight = direction === "right";
  const position = isRight ? "right-1 sm:right-4" : "left-1 sm:left-4";
  const colors = isRight
    ? "border-emerald-200/80 bg-emerald-50/80 text-emerald-600 shadow-emerald-500/15 hover:bg-emerald-100/90 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300"
    : "border-red-200/80 bg-red-50/80 text-red-600 shadow-red-500/15 hover:bg-red-100/90 dark:border-red-700/60 dark:bg-red-950/40 dark:text-red-300";

  return (
    <motion.button
      type="button"
      data-testid={testId}
      aria-label={label}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`absolute ${position} top-1/2 z-40 hidden h-24 w-12 -translate-y-1/2 items-center justify-center rounded-full border shadow-lg backdrop-blur sm:flex ${colors} ${
        disabled ? "cursor-not-allowed opacity-35" : "cursor-pointer"
      }`}
      whileHover={disabled ? undefined : { scale: 1.06 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
    >
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        {isRight ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        )}
      </svg>
    </motion.button>
  );
}
