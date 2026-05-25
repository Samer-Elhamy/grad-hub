/* ════════════════════════════════════════
   History — Paginated swipe history with filter chips
   All / Liked / Disliked tabs
   ════════════════════════════════════════ */

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useStore } from "../store";
import { categoryLabel, ideaDescription, ideaTitle, t } from "../i18n";

const FILTERS = [
  { key: "all" as const, labelKey: "all" as const },
  { key: "starred" as const, labelKey: "starred" as const },
  { key: "liked" as const, labelKey: "liked" as const },
  { key: "disliked" as const, labelKey: "disliked" as const },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DirectionIcon({ direction }: { direction: string }) {
  if (direction === "up") {
    return (
      <span className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-purple-500 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </span>
    );
  }
  if (direction === "right") {
    return (
      <span className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </span>
    );
  }
  return (
    <span className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center shrink-0">
      <svg className="w-4 h-4 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </span>
  );
}

function DirectionLabel({ direction, language }: { direction: string; language: "en" | "ar" }) {
  if (direction === "up") {
    return <span className="text-xs text-purple-500 dark:text-purple-400">{t(language, "starred")}</span>;
  }
  if (direction === "right") {
    return <span className="text-xs text-emerald-500 dark:text-emerald-400">{t(language, "liked")}</span>;
  }
  return <span className="text-xs text-red-500 dark:text-red-400">{t(language, "disliked")}</span>;
}

export function History() {
  const history = useStore((s) => s.history);
  const historyPage = useStore((s) => s.historyPage);
  const historyTotal = useStore((s) => s.historyTotal);
  const historyLoading = useStore((s) => s.historyLoading);
  const historyFilter = useStore((s) => s.historyFilter);
  const loadHistory = useStore((s) => s.loadHistory);
  const deleteHistoryItem = useStore((s) => s.deleteHistoryItem);
  const setHistoryFilter = useStore((s) => s.setHistoryFilter);
  const language = useStore((s) => s.language);

  const totalPages = Math.max(1, Math.ceil(historyTotal / 20));

  useEffect(() => {
    loadHistory(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.main
      className="max-w-2xl mx-auto px-4 py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
    >
      <h1 className="text-2xl font-bold font-sans text-gray-900 dark:text-gray-50 mb-6">
        {t(language, "history")}
      </h1>

      {/* Filter chips */}
      <div className="flex gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setHistoryFilter(f.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              historyFilter === f.key
                ? "bg-blue-500 dark:bg-blue-400 text-white"
                : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 border border-gray-200 dark:border-gray-700"
            }`}
          >
            {t(language, f.labelKey)}
          </button>
        ))}
      </div>

      {/* Loading */}
      {historyLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!historyLoading && history.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
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
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {t(language, "noSwipes")}
          </p>
        </div>
      )}

      {/* History list */}
      {!historyLoading && history.length > 0 && (
        <div className="flex flex-col gap-3">
          {history.map((record, i) => (
            <motion.div
              key={record.id ?? i}
              className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
            >
              {record.idea?.image_url && (
                <img
                  src={record.idea.image_url}
                  alt={ideaTitle(record.idea, language)}
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                  loading="lazy"
                />
              )}
              <DirectionIcon direction={record.direction} />

              <div className="flex-1 min-w-0">
                <Link
                  to={`/ideas/${record.idea_id}`}
                  className="font-sans font-semibold text-sm text-gray-900 dark:text-gray-50 hover:text-blue-500 dark:hover:text-blue-400 truncate block"
                >
                  {record.idea ? ideaTitle(record.idea, language) : t(language, "detailsUnavailable")}
                </Link>
                {record.idea && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {ideaDescription(record.idea, language)}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <DirectionLabel direction={record.direction} language={language} />
                  {record.idea?.category && (
                    <span className="text-xs text-blue-500 dark:text-blue-400">
                      {categoryLabel(record.idea.category, language)}
                    </span>
                  )}
                  {record.idea?.source_university && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {record.idea.source_university}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(record.timestamp)}
                  </span>
                  {record.dwell_time_ms > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {(record.dwell_time_ms / 1000).toFixed(1)}s
                    </span>
                  )}
                  {record.rating !== null && record.rating !== undefined && (
                    <span className="text-xs text-amber-500 dark:text-amber-400">
                      {"★".repeat(record.rating)}
                      {"☆".repeat(5 - record.rating)}
                    </span>
                  )}
                </div>
                {record.idea?.keywords && record.idea.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {record.idea.keywords.slice(0, 5).map((keyword) => (
                      <span
                        key={keyword}
                        className="px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => deleteHistoryItem(record.idea_id)}
                className="px-2 py-1 rounded-lg text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              >
                {t(language, "delete")}
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => loadHistory(Math.max(1, historyPage - 1))}
            disabled={historyPage <= 1}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {t(language, "previous")}
          </button>
          <span className="text-sm text-gray-400 dark:text-gray-500">
            {historyPage} / {totalPages}
          </span>
          <button
            onClick={() => loadHistory(Math.min(totalPages, historyPage + 1))}
            disabled={historyPage >= totalPages}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {t(language, "next")}
          </button>
        </div>
      )}
    </motion.main>
  );
}
