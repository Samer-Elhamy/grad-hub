/**
 * Combined Scoring Engine — computes the final score that determines
 * whether a crawled idea is accepted into the database.
 *
 * Formula:
 *   combined = (recency_weight × recency_score)
 *            + (relevance_weight × relevance_score)
 *            - dedup_penalty
 *
 * Dedup penalties:
 *   - Exact / URL duplicate: 100 (overwhelms any positive score)
 *   - Fuzzy duplicate (80%+): 50 (may still pass if scores are very high)
 *   - Unique: 0
 *
 * Threshold: combined_score > 0 → accepted (configurable via FILTER_MINIMUM_SCORE)
 */

import { searchConfig } from '../../config/search.config';
import type { RecencyFilterResult } from './filters/recency-filter';
import type { RelevanceFilterResult } from './filters/relevance-filter';
import type { DedupFilterResult } from './filters/dedup-filter';

export interface CombinedScoreResult {
  /** Final combined score */
  combined: number;
  /** Per-component breakdown for debugging / logging */
  breakdown: {
    recencyScore: number;
    relevanceScore: number;
    dedupPenalty: number;
    recencyWeight: number;
    relevanceWeight: number;
  };
  /** Whether the idea passes the minimum threshold */
  accepted: boolean;
}

/**
 * Compute the combined score from all filter stage results.
 *
 * @param recencyResult - Output from the recency filter
 * @param relevanceResult - Output from the relevance filter
 * @param dedupResult - Output from the dedup filter
 * @returns Combined score with breakdown and acceptance decision
 */
export function computeCombinedScore(
  recencyResult: RecencyFilterResult,
  relevanceResult: RelevanceFilterResult,
  dedupResult: DedupFilterResult,
): CombinedScoreResult {
  const {
    recencyWeight,
    relevanceWeight,
    dedupExactPenalty,
    dedupFuzzyPenalty,
    minimumScore,
  } = searchConfig;

  // Determine dedup penalty based on match type
  let dedupPenalty = 0;
  if (dedupResult.isDuplicate) {
    switch (dedupResult.matchType) {
      case 'exact':
      case 'url':
        dedupPenalty = dedupExactPenalty;
        break;
      case 'fuzzy':
        dedupPenalty = dedupFuzzyPenalty;
        break;
    }
  }

  // Combined formula
  const combined =
    recencyWeight * recencyResult.score +
    relevanceWeight * relevanceResult.score -
    dedupPenalty;

  return {
    combined,
    breakdown: {
      recencyScore: recencyResult.score,
      relevanceScore: relevanceResult.score,
      dedupPenalty,
      recencyWeight,
      relevanceWeight,
    },
    accepted: combined > minimumScore,
  };
}
