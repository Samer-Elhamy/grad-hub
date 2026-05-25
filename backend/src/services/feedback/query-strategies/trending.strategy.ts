/**
 * TrendingStrategy — Recent high-signal query strategy
 *
 * Target: Keep the feed fresh and prevent stagnation.
 *
 * Logic:
 *   1. Focus on recency: crawl latest projects regardless of category
 *   2. Target GitHub trending + university recent capstone projects
 *   3. If user has explicit preferred difficulty, filter by it
 *   4. Use trending keywords as primary signal (not categories)
 *
 * This strategy is category-agnostic — it prioritizes timestamp over
 * category matching to surface new content the user hasn't seen.
 */

import type {
  SearchParams,
  FeedbackSignals,
  StrategyType,
} from '../../../types/search-params.types';
import { DEFAULT_OPTIMIZER_CONFIG } from '../../../types/search-params.types';

// ── Constants ──────────────────────────────────────────────────────────

/** How far back to look for "trending" content (7 days) */
const TRENDING_LOOKBACK_DAYS = 7;

/** Always exclude embedded systems keywords */
const ALWAYS_EXCLUDED_KEYWORDS: string[] = [
  'embedded', 'microcontroller', 'arduino', 'esp32', 'firmware',
];

// ── Strategy Implementation ────────────────────────────────────────────

/**
 * Build trending-search parameters from feedback signals.
 *
 * Pure function: signals + config → SearchParams.
 * Focuses on recency and trending signals rather than category affinity.
 */
export function buildTrendingParams(
  signals: FeedbackSignals,
  configOverrides?: { hardExcludedCategories?: string[] },
): SearchParams {
  const hardExcluded = configOverrides?.hardExcludedCategories
    ?? DEFAULT_OPTIMIZER_CONFIG.hardExcludedCategories;

  // 1. Use trending keywords as primary signal (expand with AI recommendations)
  const techKeywords = [
    ...signals.trendingKeywords,
    ...signals.aiRecommendations,
  ].slice(0, 15);

  // 2. Include ALL user categories (both liked and neutral)
  //    We don't filter by category — we let recency be the driver
  const allCategories = [
    ...signals.topLikedCategories.map((c) => c.category),
    ...signals.positivelyRatedCategories.map((c) => c.category),
  ];
  const deduplicatedCategories = [...new Set(allCategories)];

  // 3. Only exclude hard-excluded categories
  const excludeCategories = [...hardExcluded];

  // 4. Set min recency to TRENDING_LOOKBACK_DAYS ago
  const minRecency = new Date();
  minRecency.setDate(minRecency.getDate() - TRENDING_LOOKBACK_DAYS);

  // 5. Apply difficulty preference if available (but let through null)
  const diffNumerics: Record<string, number> = {
    مبتدئ: 1, beginner: 1,
    متوسط: 2, intermediate: 2,
    متقدم: 3, advanced: 3,
  };
  const diffNumeric = signals.difficultyNumeric
    ?? (signals.difficultyPreference ? diffNumerics[signals.difficultyPreference] : null);

  // 6. Trending strategy prefers GitHub repos (faster iteration) + fresh univ projects
  return {
    techKeywords,
    categories: deduplicatedCategories.length > 0
      ? deduplicatedCategories
      : [], // Empty categories = no category filter (all categories)
    excludeCategories,
    minDifficulty: diffNumeric ?? null,
    maxDifficulty: diffNumeric ?? null,
    minRecency,
    source: 'both',
    strategy: 'trending' as StrategyType,
  };
}

/**
 * Validate trending params — must have at least some keywords
 * to anchor the trending search.
 */
export function validateTrendingParams(params: SearchParams): boolean {
  return params.techKeywords.length > 0;
}
