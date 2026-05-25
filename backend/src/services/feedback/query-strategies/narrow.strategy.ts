/**
 * NarrowStrategy — Precise match query strategy
 *
 * Target: Find MORE of what the user clearly likes.
 *
 * Logic:
 *   1. Take top 3 liked categories as primary filter
 *   2. Include keywords from highest-weighted preference components
 *   3. Exclude ALL disliked categories
 *   4. Apply difficulty preference if available
 *
 * This is the most constrained strategy — it minimizes exploration
 * and maximizes precision for categories the user has already shown
 * strong affinity toward.
 */

import type {
  SearchParams,
  FeedbackSignals,
  StrategyType,
} from '../../../types/search-params.types';
import { DEFAULT_OPTIMIZER_CONFIG } from '../../../types/search-params.types';

// ── Constants ──────────────────────────────────────────────────────────

/** Always exclude embedded systems keywords at filter level */
const ALWAYS_EXCLUDED_KEYWORDS: string[] = [
  'embedded', 'microcontroller', 'arduino', 'esp32', 'firmware',
];

// ── Strategy Implementation ────────────────────────────────────────────

/**
 * Build narrow-search parameters from feedback signals.
 *
 * Pure function: signals + config → SearchParams.
 * No side effects, no I/O — safe to call repeatedly.
 */
export function buildNarrowParams(
  signals: FeedbackSignals,
  configOverrides?: { narrowTopCategoryCount?: number; hardExcludedCategories?: string[] },
): SearchParams {
  const topCategoryCount = configOverrides?.narrowTopCategoryCount ?? DEFAULT_OPTIMIZER_CONFIG.narrowTopCategoryCount;
  const hardExcluded = configOverrides?.hardExcludedCategories ?? DEFAULT_OPTIMIZER_CONFIG.hardExcludedCategories;

  // 1. Take top N liked categories
  const topCategories = signals.topLikedCategories
    .slice(0, topCategoryCount)
    .map((c) => c.category);

  // 2. Build keyword list: combine trending keywords + AI recommendations
  const techKeywords = [
    ...signals.trendingKeywords.slice(0, 10),
    ...signals.aiRecommendations.filter((r) => r.length > 2),
  ].slice(0, 15);

  // 3. Combine disliked + hard-excluded categories
  const excludeCategories = [
    ...new Set([
      ...signals.dislikedCategories,
      ...hardExcluded,
    ]),
  ];

  // 4. Map difficulty to numeric range
  const diffNumerics: Record<string, number> = {
    مبتدئ: 1, beginner: 1,
    متوسط: 2, intermediate: 2,
    متقدم: 3, advanced: 3,
  };
  const diffNumeric = signals.difficultyNumeric
    ?? (signals.difficultyPreference ? diffNumerics[signals.difficultyPreference] : null);

  return {
    techKeywords,
    categories: topCategories,
    excludeCategories,
    minDifficulty: diffNumeric ?? null,
    maxDifficulty: diffNumeric ?? null,
    minRecency: null,
    source: 'both',
    strategy: 'narrow' as StrategyType,
  };
}

/**
 * Validate that narrow params contain at least one category.
 * Returns false if topLikedCategories were empty (no preference data).
 */
export function validateNarrowParams(params: SearchParams): boolean {
  return params.categories.length > 0;
}
