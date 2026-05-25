/* ════════════════════════════════════════
   SwipeableCard — Tinder-style draggable card
   Framer Motion drag, rotation, swipe feedback overlays
   Uses Tailwind colors with dark: variants
   ════════════════════════════════════════ */

import { motion } from "framer-motion";
import { useSwipe } from "../../hooks/useSwipe";
import { categoryLabel, difficultyLabel, ideaDescription, ideaTitle } from "../../i18n";
import { useStore } from "../../store";
import type { Idea, SwipeDirection } from "../../types/swipe";

interface SwipeableCardProps {
  idea: Idea;
  onSwipe: (direction: SwipeDirection) => void;
  isTop: boolean;
}

/** Placeholder gradient based on idea category for when no image_url is provided */
function categoryGradient(category: string): string {
  const gradients: Record<string, string> = {
    "Web Development": "linear-gradient(135deg, #3B82F6, #2563EB)",
    "Machine Learning": "linear-gradient(135deg, #8B5CF6, #6D28D9)",
    "Mobile": "linear-gradient(135deg, #10B981, #059669)",
    "Cloud": "linear-gradient(135deg, #F59E0B, #D97706)",
    "Security": "linear-gradient(135deg, #EF4444, #DC2626)",
    "DevOps": "linear-gradient(135deg, #6366F1, #4F46E5)",
    "Data Science": "linear-gradient(135deg, #14B8A6, #0D9488)",
    "AI": "linear-gradient(135deg, #A855F7, #9333EA)",
  };
  return gradients[category] ?? "linear-gradient(135deg, #6B7280, #4B5563)";
}

export function SwipeableCard({ idea, onSwipe, isTop }: SwipeableCardProps) {
  const language = useStore((s) => s.language);
  const { x, rotate, likeOpacity, nopeOpacity, onDragEnd } = useSwipe({
    onSwipe,
  });
  const title = ideaTitle(idea, language);

  return (
    <div className="absolute inset-0" style={{ zIndex: isTop ? 30 : 20 }}>
        <motion.div
          className="relative w-full h-full select-none"
          style={
            isTop
              ? { x, rotate, cursor: "grab" }
              : undefined
          }
          whileHover={isTop ? { scale: 1.02 } : undefined}
          whileTap={isTop ? { cursor: "grabbing" } : undefined}
          {...(isTop
            ? {
                drag: "x",
                dragConstraints: { left: 0, right: 0 },
                dragElastic: 0.9,
                onDragEnd,
                whileDrag: {
                  scale: 1.04,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
                },
              }
            : {})}
        >
          {/* Card face */}
          <div className="w-full h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col shadow-md">
            {/* Image area (top 55%) */}
            <div className="relative h-[55%] min-h-[200px] overflow-hidden">
              {idea.image_url ? (
                <img
                  src={idea.image_url}
                  alt={idea.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: categoryGradient(idea.category) }}
                >
                  <span className="text-white/90 text-4xl font-bold select-none">
                    {title.charAt(0)}
                  </span>
                </div>
              )}

              {/* Swipe direction overlays */}
              {isTop && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-t-xl flex items-center justify-start pl-6"
                    style={{ opacity: likeOpacity }}
                  >
                    <span className="text-emerald-500 dark:text-emerald-400 text-5xl font-bold -rotate-12 border-4 border-emerald-500 dark:border-emerald-400 rounded-xl px-4 py-2 bg-white/80 dark:bg-gray-900/80">
                      {language === "ar" ? "إعجاب" : "LIKE"}
                    </span>
                  </motion.div>
                  <motion.div
                    className="absolute inset-0 rounded-t-xl flex items-center justify-end pr-6"
                    style={{ opacity: nopeOpacity }}
                  >
                    <span className="text-red-500 dark:text-red-400 text-5xl font-bold rotate-12 border-4 border-red-500 dark:border-red-400 rounded-xl px-4 py-2 bg-white/80 dark:bg-gray-900/80">
                      {language === "ar" ? "رفض" : "NOPE"}
                    </span>
                  </motion.div>
                </>
              )}

              {/* Difficulty badge */}
              <div className="absolute top-3 left-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                    idea.difficulty === "beginner"
                      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                      : idea.difficulty === "intermediate"
                        ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                        : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                  }`}
                >
                  {difficultyLabel(idea.difficulty, language)}
                </span>
              </div>

              {/* Category badge */}
              <div className="absolute top-3 right-3">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-gray-900/90"
                >
                  {categoryLabel(idea.category, language)}
                </span>
              </div>
            </div>

            {/* Content area (bottom 45%) */}
            <div className="flex-1 flex flex-col px-6 py-5 gap-3">
              {/* Title */}
              <h4 className="font-sans text-xl font-semibold leading-tight text-gray-900 dark:text-gray-50 line-clamp-2">
                {title}
              </h4>

              {/* Description */}
              <p className="font-body text-sm leading-normal text-gray-500 dark:text-gray-400 line-clamp-3 flex-1">
                {ideaDescription(idea, language)}
              </p>

              {/* Tags row */}
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {idea.keywords.slice(0, 4).map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                  >
                    {kw}
                  </span>
                ))}
                {idea.keywords.length > 4 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium text-gray-400 dark:text-gray-500">
                    +{idea.keywords.length - 4}
                  </span>
                )}
              </div>

              {/* Estimated time */}
              {idea.estimated_time && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {idea.estimated_time}
                </div>
              )}
            </div>
          </div>
        </motion.div>
    </div>
  );
}
