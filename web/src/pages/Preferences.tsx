/* ════════════════════════════════════════
   Preferences — Category toggle chips, stats summary
   ════════════════════════════════════════ */

import { motion } from "framer-motion";
import { useEffect } from "react";
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

export function Preferences() {
  const { preferences, loading, toggleExcludedCategory, isCategoryExcluded } =
    usePreferences();
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
    new Set([...ALL_CATEGORIES, ...Object.keys(preferences.category_weights ?? {})]),
  );

  const sortedCategories = categories.sort((a, b) => {
    const aExcluded = isCategoryExcluded(a);
    const bExcluded = isCategoryExcluded(b);
    if (aExcluded && !bExcluded) return 1;
    if (!aExcluded && bExcluded) return -1;
    return 0;
  });

  const totalSwipes = historyTotal || history.length;
  const starredCount = history.filter((record) => record.direction === "up").length;
  const likedCount = history.filter((record) => record.direction === "right").length;
  const likedPct = totalSwipes > 0 ? Math.round((likedCount / totalSwipes) * 100) : 0;

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

      {/* Category toggles */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          {t(language, "categories")}
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          {t(language, "categoriesHelp")}
        </p>
        <div className="flex flex-wrap gap-2">
          {sortedCategories.map((cat) => {
            const excluded = isCategoryExcluded(cat);
            const weight = preferences.category_weights?.[cat] ?? 0;

            return (
              <motion.button
                key={cat}
                onClick={() => toggleExcludedCategory(cat)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  excluded
                    ? "bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 line-through opacity-60"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 border border-gray-200 dark:border-gray-700"
                }`}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
              >
                {categoryLabel(cat, language)}
                {weight > 0 && !excluded && (
                  <span className="text-xs text-emerald-500 dark:text-emerald-400 font-semibold">
                    {(weight * 100).toFixed(0)}%
                  </span>
                )}
              </motion.button>
            );
          })}
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
