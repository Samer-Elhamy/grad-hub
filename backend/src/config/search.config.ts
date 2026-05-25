import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Search configuration schema — validates filter weights, thresholds, and
 * category preferences from environment variables with sensible defaults.
 *
 * Fail-fast validation: if any env var is invalid, the process exits immediately
 * with a clear error message so misconfiguration is caught at startup.
 */
const searchConfigSchema = z.object({
  FILTER_RECENCY_WEIGHT: z.coerce.number().min(0).max(1).default(0.3),
  FILTER_RELEVANCE_WEIGHT: z.coerce.number().min(0).max(1).default(0.7),
  FILTER_MINIMUM_SCORE: z.coerce.number().default(0),
  DEDUP_EXACT_PENALTY: z.coerce.number().default(100),
  DEDUP_FUZZY_PENALTY: z.coerce.number().default(50),
  DEDUP_FUZZY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.8),
});

const parsed = searchConfigSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid search environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

/**
 * Frozen search config object — read-only after initialization.
 * Provides typed access to all filter settings.
 */
export const searchConfig = Object.freeze({
  /** Weight applied to recency score in combined formula */
  recencyWeight: env.FILTER_RECENCY_WEIGHT,
  /** Weight applied to relevance score in combined formula */
  relevanceWeight: env.FILTER_RELEVANCE_WEIGHT,
  /** Minimum combined score required for an idea to be accepted */
  minimumScore: env.FILTER_MINIMUM_SCORE,
  /** Penalty applied when an exact/URL duplicate is detected */
  dedupExactPenalty: env.DEDUP_EXACT_PENALTY,
  /** Penalty applied when a fuzzy duplicate (80%+ similarity) is detected */
  dedupFuzzyPenalty: env.DEDUP_FUZZY_PENALTY,
  /** Similarity threshold (0-1) for fuzzy title matching */
  dedupFuzzyThreshold: env.DEDUP_FUZZY_THRESHOLD,
});

export type SearchConfig = typeof searchConfig;
