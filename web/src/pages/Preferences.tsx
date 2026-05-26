/* ════════════════════════════════════════
   Preferences — Category toggle chips, stats summary
   ════════════════════════════════════════ */

import { motion } from "framer-motion";
import { useEffect, type DragEvent } from "react";
import { usePreferences } from "../hooks/usePreferences";
import { useStore } from "../store";
import { categoryLabel, t } from "../i18n";

const ALL_CATEGORIES = [
  "AI/ML",
  "Web Applications",
  "Mobile Apps",
  "Cybersecurity",
  "Data Science",
  "Cloud/DevOps",
  "Blockchain",
  "Game Development",
  "IoT",
];

const LIKED_CATEGORY_THRESHOLD = 0.6;

type CategoryGroup = "available" | "liked" | "disliked";

export function Preferences() {
  const {
    preferences,
    loading,
    isCategoryExcluded,
    markCategoryLiked,
    markCategoryDisliked,
    clearCategoryPreference,
  } = usePreferences();
  const history = useStore((s) => s.history);
  const historyTotal = useStore((s) => s.historyTotal);
  const loadHistory = useStore((s) => s.loadHistory);
  const language = useStore((s) => s.language);

  useEffect(() => {
    loadHistory(1, 1000);
  }, [loadHistory]);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7261/ingest/f0a8580a-2159-4d02-8dff-6d707a9bcc1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3cfbd7'},body:JSON.stringify({sessionId:'3cfbd7',runId:'pre-fix',hypothesisId:'H8,H9,H10,H16',location:'web/src/pages/Preferences.tsx:renderState',message:'react preferences page state rendered',data:{loading,hasPreferences:Boolean(preferences),excludedCategories:preferences?.excluded_categories,categoryWeights:preferences?.category_weights,keywordWeights:preferences?.keyword_weights,historyTotal,loadedHistoryCount:history.length,href:window.location.href},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [loading, preferences, history.length, historyTotal]);

  if (loading || !preferences) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  const categories = Array.from(
    new Set([
      ...ALL_CATEGORIES,
      ...Object.keys(preferences.category_weights ?? {}),
      ...(preferences.excluded_categories ?? []),
    ]),
  );

  const dislikedCategories = categories.filter((cat) => isCategoryExcluded(cat));
  const likedCategories = categories.filter(
    (cat) =>
      !isCategoryExcluded(cat) &&
      (preferences.category_weights?.[cat] ?? 0) >= LIKED_CATEGORY_THRESHOLD,
  );
  const availableCategories = categories.filter(
    (cat) => !isCategoryExcluded(cat) && !likedCategories.includes(cat),
  );

  const totalSwipes = historyTotal || history.length;
  const starredCount = history.filter((record) => record.direction === "up").length;
  const likedCount = history.filter((record) => record.direction === "right").length;
  const likedPct = totalSwipes > 0 ? Math.round((likedCount / totalSwipes) * 100) : 0;
  const moveCategory = (category: string, group: CategoryGroup) => {
    if (group === "liked") markCategoryLiked(category);
    if (group === "disliked") markCategoryDisliked(category);
    if (group === "available") clearCategoryPreference(category);
  };
  const handleDrop = (group: CategoryGroup) => (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const category = event.dataTransfer.getData("text/plain");
    if (category) moveCategory(category, group);
  };
  const handleDragStart = (category: string) => (event: DragEvent<HTMLElement>) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", category);
  };

  return (
    <motion.main
      className="max-w-2xl mx-auto px-4 py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
    >
      <h1 className="text-2xl font-bold font-sans text-gray-900 dark:text-gray-50 mb-6">
        {t(language, "preferences")}
      </h1>

      {/* Stats summary */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          {t(language, "summary")}
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 text-center">
            <span className="block text-2xl font-bold font-sans text-gray-900 dark:text-gray-50">
              {totalSwipes}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{t(language, "totalSwipes")}</span>
          </div>
          <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 text-center">
            <span className="block text-2xl font-bold font-sans text-emerald-500 dark:text-emerald-400">
              {likedCount}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{t(language, "liked")}</span>
          </div>
          <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 text-center">
            <span className="block text-2xl font-bold font-sans text-purple-500 dark:text-purple-400">
              {starredCount}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{t(language, "starred")}</span>
          </div>
          <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 text-center">
            <span className="block text-2xl font-bold font-sans text-gray-900 dark:text-gray-50">
              {likedPct}%
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{t(language, "likeRate")}</span>
          </div>
        </div>
      </section>

      {/* Category movement zones */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          {t(language, "categories")}
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          {language === "ar"
            ? "اسحب التصنيف أو استخدم الأزرار لوضعه في الإعجاب أو عدم الإعجاب."
            : "Drag a category or use the buttons to move it into like or dislike."}
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <CategoryZone
            title={language === "ar" ? "التصنيفات المتاحة" : "Available Categories"}
            testId="available-categories"
            tone="neutral"
            categories={availableCategories}
            emptyText={language === "ar" ? "لا توجد تصنيفات متاحة" : "No neutral categories"}
            language={language}
            onDragStart={handleDragStart}
            onDrop={handleDrop("available")}
            onLike={(cat) => moveCategory(cat, "liked")}
            onDislike={(cat) => moveCategory(cat, "disliked")}
            onClear={(cat) => moveCategory(cat, "available")}
          />
          <CategoryZone
            title={language === "ar" ? "تصنيفات الإعجاب" : "Liked Categories"}
            testId="liked-categories"
            tone="liked"
            categories={likedCategories}
            emptyText={language === "ar" ? "اسحب تصنيفًا هنا للإعجاب" : "Drag categories here to like them"}
            language={language}
            onDragStart={handleDragStart}
            onDrop={handleDrop("liked")}
            onLike={(cat) => moveCategory(cat, "liked")}
            onDislike={(cat) => moveCategory(cat, "disliked")}
            onClear={(cat) => moveCategory(cat, "available")}
          />
          <CategoryZone
            title={language === "ar" ? "تصنيفات عدم الإعجاب" : "Disliked Categories"}
            testId="disliked-categories"
            tone="disliked"
            categories={dislikedCategories}
            emptyText={language === "ar" ? "اسحب تصنيفًا هنا لإخفائه" : "Drag categories here to dislike them"}
            language={language}
            onDragStart={handleDragStart}
            onDrop={handleDrop("disliked")}
            onLike={(cat) => moveCategory(cat, "liked")}
            onDislike={(cat) => moveCategory(cat, "disliked")}
            onClear={(cat) => moveCategory(cat, "available")}
          />
        </div>
      </section>

      {/* Top keywords */}
      {preferences.keyword_weights &&
        Object.keys(preferences.keyword_weights).length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              {t(language, "topKeywords")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(preferences.keyword_weights)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 20)
                .map(([kw, weight]) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400"
                  >
                    {kw}
                    <span className="text-emerald-500 dark:text-emerald-400 font-semibold">
                      {(weight * 100).toFixed(0)}%
                    </span>
                  </span>
                ))}
            </div>
          </section>
        )}
    </motion.main>
  );
}

interface CategoryZoneProps {
  title: string;
  testId: string;
  tone: "neutral" | "liked" | "disliked";
  categories: string[];
  emptyText: string;
  language: "en" | "ar";
  onDragStart: (category: string) => (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onLike: (category: string) => void;
  onDislike: (category: string) => void;
  onClear: (category: string) => void;
}

function CategoryZone({
  title,
  testId,
  tone,
  categories,
  emptyText,
  language,
  onDragStart,
  onDrop,
  onLike,
  onDislike,
  onClear,
}: CategoryZoneProps) {
  const toneClasses = {
    neutral: "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900",
    liked: "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20",
    disliked: "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20",
  }[tone];

  return (
    <section
      data-testid={testId}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className={`min-h-40 rounded-2xl border border-dashed p-3 transition-colors ${toneClasses}`}
    >
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
        {title}
      </h3>

      {categories.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => (
            <div
              key={category}
              draggable
              onDragStart={onDragStart(category)}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 shadow-sm cursor-grab active:cursor-grabbing"
            >
              <div className="text-sm font-medium text-gray-900 dark:text-gray-50">
                {categoryLabel(category, language)}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tone !== "liked" && (
                  <button
                    type="button"
                    aria-label={`Move ${category} to preferred categories`}
                    onClick={() => onLike(category)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M3.2 6.4c1.4-2.5 4.5-2.1 5.8 0.1l1 1.6 1-1.6c1.3-2.2 4.4-2.6 5.8-0.1 1 1.8 0.6 4-1 5.5L10 17.2 4.2 11.9c-1.6-1.5-2-3.7-1-5.5Z" />
                    </svg>
                  </button>
                )}
                {tone !== "disliked" && (
                  <button
                    type="button"
                    aria-label={`Move ${category} to avoided categories`}
                    onClick={() => onDislike(category)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                      <path strokeLinecap="round" d="M5 5l10 10M15 5 5 15" />
                    </svg>
                  </button>
                )}
                {tone !== "neutral" && (
                  <button
                    type="button"
                    aria-label={`Clear ${category} preference`}
                    onClick={() => onClear(category)}
                    title={language === "ar" ? "إزالة" : "Clear"}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 10h12M10 4v12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
