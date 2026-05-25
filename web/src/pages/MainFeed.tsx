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
      <div className="flex-1 flex items-center justify-center w-full py-4">
        <CardStack />
      </div>

      {/* Action buttons */}
      <div className="w-full max-w-card">
        <CardActions onAction={handleAction} disabled={!hasCards} />
      </div>
    </motion.main>
  );
}
