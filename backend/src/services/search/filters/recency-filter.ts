/**
 * Recency Filter — scores ideas based on how fresh/recent they are.
 *
 * Scoring rules:
 *   - Ideas with an explicit year: recency_score = max(0, 1 - (2026 - year) / 5)
 *     Projects from 2026 get 1.0, from 2021 get 0.0, linear decay in between.
 *   - Ideas from GitHub trending: recency_score = 1.0 (always considered fresh)
 *   - Web-crawled ideas without dates: recency_score = 0.5 (neutral assumption)
 *
 * This filter does NOT reject ideas — it only assigns a score. The combined
 * scorer later decides whether the idea clears the minimum threshold.
 */

import type { CrawledIdea } from '../../../types/search.types';

export interface RecencyFilterResult {
  /** Recency score between 0 and 1 */
  score: number;
  /** Metadata describing how the score was determined */
  metadata: {
    /** Whether the idea had an explicit date */
    dated: boolean;
    /** Source of freshness signal */
    sourceFreshness: 'explicit' | 'github' | 'unknown';
  };
}

/** The current year used as the reference point for recency calculations */
const CURRENT_YEAR = 2026;

/**
 * Score an idea's recency based on available date/source information.
 *
 * @param idea - The crawled idea to score
 * @returns Recency score and metadata
 */
export function scoreRecency(idea: CrawledIdea): RecencyFilterResult {
  // GitHub trending repos are always fresh
  if (idea.sourceType === 'github') {
    return {
      score: 1.0,
      metadata: { dated: false, sourceFreshness: 'github' },
    };
  }

  // Ideas with an explicit year — linear decay over 5 years
  if (idea.year !== null && idea.year > 0) {
    const yearsAgo = CURRENT_YEAR - idea.year;
    const score = Math.max(0, 1 - yearsAgo / 5);
    return {
      score,
      metadata: { dated: true, sourceFreshness: 'explicit' },
    };
  }

  // Web-crawled without any date information — neutral score
  return {
    score: 0.5,
    metadata: { dated: false, sourceFreshness: 'unknown' },
  };
}
