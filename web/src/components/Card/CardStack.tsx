/* ════════════════════════════════════════
   CardStack — 3-card layered stack with auto-refill
   Manages card queue: top (draggable), middle, bottom layers
   Swipe exit: flies off screen with rotation, next card enters
   ════════════════════════════════════════ */

import { useEffect, useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../../store";
import { SwipeableCard } from "./SwipeableCard";
import type { Idea, SwipeDirection } from "../../types/swipe";
import { categoryLabel, ideaDescription, ideaTitle, t } from "../../i18n";

const stackPositions = {
  top: { scale: 1, y: 0, z: 30 },
  middle: { scale: 0.96, y: 8, z: 20 },
  bottom: { scale: 0.92, y: 16, z: 10 },
};

/** Exit animation flies card off in swipe direction */
function exitAnimation(direction: SwipeDirection | null) {
  if (direction === "right") {
    return { x: 500, rotate: 15, opacity: 0 };
  }
  if (direction === "left") {
    return { x: -500, rotate: -15, opacity: 0 };
  }
  // Default exit (fade out)
  return { opacity: 0, scale: 0.9 };
}

export function CardStack() {
  const cards = useStore((s) => s.cards);
  const currentIndex = useStore((s) => s.currentIndex);
  const loadNextCards = useStore((s) => s.loadNextCards);
  const consumeTopCard = useStore((s) => s.consumeTopCard);
  const performSwipe = useStore((s) => s.performSwipe);
  const isLoadingCards = useStore((s) => s.isLoadingCards);
  const language = useStore((s) => s.language);

  const [swiping, setSwiping] = useState(false);
  const [exitDir, setExitDir] = useState<SwipeDirection | null>(null);
  const mountedRef = useRef(false);

  // Load initial cards on mount
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      loadNextCards();
      loadNextCards();
      loadNextCards();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refill when running low
  useEffect(() => {
    const remaining = cards.length - currentIndex;
    if (remaining <= 2 && !isLoadingCards) {
      loadNextCards();
    }
  }, [cards.length, currentIndex, loadNextCards, isLoadingCards]);

  const visibleCards: Idea[] = [];
  for (let i = 0; i < 3; i++) {
    const idx = currentIndex + i;
    if (idx < cards.length) {
      visibleCards.push(cards[idx]);
    }
  }

  const handleSwipe = useCallback(
    (direction: SwipeDirection) => {
      if (swiping) return;
      setSwiping(true);
      setExitDir(direction);

      const idea = consumeTopCard();
      if (idea) {
        performSwipe(idea, direction);
      }

      // Reset after exit animation completes
      setTimeout(() => {
        setSwiping(false);
        setExitDir(null);
      }, 400);
    },
    [consumeTopCard, performSwipe, swiping],
  );

  return (
    <div className="relative w-full max-w-card mx-auto" style={{ height: 480 }}>
      {/* Empty state */}
      {visibleCards.length === 0 && !isLoadingCards && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-gray-400 dark:text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-1">
            {t(language, "noMoreIdeas")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t(language, "noMoreIdeasHelp")}
          </p>
          <button
            onClick={() => {
              loadNextCards();
              loadNextCards();
              loadNextCards();
            }}
            className="inline-flex items-center px-5 py-2 rounded-lg bg-blue-500 dark:bg-blue-400 text-white text-sm font-medium hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
          >
            {t(language, "refresh")}
          </button>
        </div>
      )}

      {/* Loading state */}
      {visibleCards.length === 0 && isLoadingCards && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {t(language, "loadingIdeas")}
            </p>
          </div>
        </div>
      )}

      {/* Stacked cards */}
      <AnimatePresence mode="popLayout">
        {visibleCards.map((idea, index) => {
          const pos = index === 0 ? stackPositions.top : index === 1 ? stackPositions.middle : stackPositions.bottom;
          const isTop = index === 0;

          return (
            <motion.div
              key={idea.id}
              layout
              className="absolute inset-0"
              style={{ zIndex: pos.z }}
              initial={{ scale: 0.95, y: 8, opacity: 0 }}
              animate={{
                scale: pos.scale,
                y: pos.y,
                opacity: index === 2 ? 0.85 : 1,
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  mass: 0.8,
                },
              }}
              exit={exitAnimation(isTop ? exitDir : null)}
              transition={{
                type: "tween",
                ease: [0, 0, 0.2, 1],
                duration: 0.3,
              }}
            >
              {isTop ? (
                <SwipeableCard
                  idea={idea}
                  onSwipe={handleSwipe}
                  isTop={true}
                />
              ) : (
                <div className="w-full h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col shadow-sm">
                  <div className="h-[55%] min-h-[200px] bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                    <span className="text-gray-400 dark:text-gray-500 text-lg font-medium">
                      {categoryLabel(idea.category, language)}
                    </span>
                  </div>
                  <div className="flex-1 px-6 py-5 flex flex-col gap-2">
                    <h4 className="font-sans text-lg font-semibold leading-tight text-gray-900 dark:text-gray-50 line-clamp-2">
                      {ideaTitle(idea, language)}
                    </h4>
                    <p className="font-body text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {ideaDescription(idea, language)}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
