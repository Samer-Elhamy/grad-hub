/**
 * BroadStrategy — Exploratory query strategy
 *
 * Target: Discover NEW categories the user might like.
 *
 * Logic:
 *   1. Use ALL positively-rated categories (right_ratio > 0.4)
 *   2. Slightly expand keyword set with AI-related terms
 *   3. NO exclude filter (except Embedded Systems — always excluded per hard rule)
 *   4. Remove difficulty filter to broaden results
 *
 * This is the most permissive strategy — it intentionally relaxes constraints
 * to surface ideas from categories the user may not know they like.
 */

import type {
  SearchParams,
  FeedbackSignals,
  StrategyType,
} from '../../../types/search-params.types';
import { DEFAULT_OPTIMIZER_CONFIG } from '../../../types/search-params.types';

// ── Constants ──────────────────────────────────────────────────────────

/** Expansion terms added to broaden keyword coverage */
const EXPANSION_TERMS: string[] = [
  'modern', 'capstone', 'research', 'project',
  'application', 'system', 'framework', 'platform',
];

// ── Strategy Implementation ────────────────────────────────────────────

/**
 * Build broad-search parameters from feedback signals.
 *
 * Pure function: signals + config → SearchParams.
 * No side effects, no I/O — safe to call repeatedly.
 */
export function buildBroadParams(
  signals: FeedbackSignals,
  configOverrides?: { broadPositiveThreshold?: number; hardExcludedCategories?: string[] },
): SearchParams {
  const positiveThreshold = configOverrides?.broadPositiveThreshold
    ?? DEFAULT_OPTIMIZER_CONFIG.broadPositiveThreshold;
  const hardExcluded = configOverrides?.hardExcludedCategories
    ?? DEFAULT_OPTIMIZER_CONFIG.hardExcludedCategories;

  // 1. All positively-rated categories (above threshold)
  const broadCategories = signals.positivelyRatedCategories
    .filter((c) => c.rightRatio > positiveThreshold)
    .map((c) => c.category);

  // 2. Expand keywords: trending + AI recommendations + predefined expansion terms
  const techKeywords = [
    ...signals.trendingKeywords,
    ...signals.aiRecommendations,
    ...EXPANSION_TERMS,
  ].slice(0, 20);

  // 3. Only hard-excluded categories (disliked categories are omitted for exploration)
  //    But we MUST always exclude Embedded Systems
  const excludeCategories = [...hardExcluded];

  // 4. No difficulty filter — broadest possible results
  return {
    techKeywords,
    categories: broadCategories,
    excludeCategories,
    minDifficulty: null,
    maxDifficulty: null,
    minRecency: null,
    source: 'both',
    strategy: 'broad' as StrategyType,
  };
}

/**
 * Validate that broad params have at least some categories or keywords.
 */
export function validateBroadParams(params: SearchParams): boolean {
  return params.categories.length > 0 || params.techKeywords.length > 0;
}
