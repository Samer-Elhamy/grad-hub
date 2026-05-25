/**
 * Preference Vector Types — Feedback Agent Vector Builder
 *
 * Defines the type system for the preference vector computation engine:
 * - PreferenceVector: full preference state with pgvector embedding
 * - VectorComponent: a single scored dimension in the embedding
 * - VectorConfig: builder configuration (batch size, decay, etc.)
 * - VectorQuery: pgvector nearest-neighbor search parameters
 * - DecayConfig: temporal decay function parameters
 *
 * Compatibility:
 *   These types extend the PreferenceVector type in api.ts (used by routes/controllers)
 *   with additional fields needed for pgvector similarity search and the vector builder.
 */

// ── Core Data Types ───────────────────────────────────────────────────

/**
 * A single scored component/dimension in the preference embedding.
 * Each component maps a label (category, keyword, or topic) to a numeric score.
 */
export interface VectorComponent {
  /** Label for this dimension (e.g. "AI/ML", "python", "web") */
  label: string;
  /** Normalized score (0.0–1.0) after all weighting and decay */
  score: number;
}

/**
 * Full preference vector with pgvector-compatible embedding.
 *
 * Two representations:
 *   - Structured fields (category_weights, keyword_weights, topic_affinities)
 *     stored as JSONB for human readability and AI provider consumption
 *   - Flat embedding array stored as pgvector vector(n) for similarity search
 *
 * The embedding is a deterministic concatenation of sorted category weights,
 * keyword weights, and topic affinities — ensuring the same dimensions
 * every time for consistent cosine distance calculations.
 */
export interface PreferenceVector {
  /** Per-category affinity weights (sum ≈ 1.0 after normalization) */
  category_weights: Record<string, number>;
  /** Per-keyword interest weights from liked idea tech_stacks */
  keyword_weights: Record<string, number>;
  /** Per-topic affinity scores from liked idea descriptions */
  topic_affinities: Record<string, number>;
  /** Flat embedding array for pgvector <=> (cosine distance) search */
  embedding: number[];
  /** Categories the user has repeatedly disliked (excluded from feed) */
  excluded_categories: string[];
  /** Preferred difficulty level string (e.g. "متوسط", "متقدم") or null */
  difficulty_preference: string | null;
  /** Numeric difficulty preference: 1=beginner, 2=intermediate, 3=advanced */
  difficulty_numeric: number | null;
  /** Total number of swipes used to compute this vector */
  swipe_count: number;
  /** ISO-8601 timestamp of last vector recalculation */
  last_updated: string;
}

// ── Configuration Types ───────────────────────────────────────────────

/**
 * Configuration for the preference vector builder.
 * All values have sensible defaults — override via env vars or constructor.
 */
export interface VectorConfig {
  /** Recalculate preference vector after every N swipes (default: 5) */
  batchSize: number;
  /**
   * Exponential decay lambda for temporal weighting (default: 0.05).
   * weight = e^(-λ × days_since_swipe)
   * λ=0.05 → ~14 day half-life, old swipes decay gently
   */
  decayLambda: number;
  /**
   * Swipes older than this many days get <1% weight (default: 90).
   * Prevents ancient interactions from skewing current preferences.
   */
  maxAgeDays: number;
  /**
   * Dwell time normalization range (milliseconds).
   * dwellMs ≤ minDwell → factor = 0.5
   * dwellMs ≥ maxDwell → factor = 1.5
   */
  minDwellMs: number;
  maxDwellMs: number;
  /**
   * Maximum number of keywords to track in the embedding.
   * Excess keywords are pruned by frequency to keep vector dimensions bounded.
   */
  maxKeywords: number;
  /**
   * Dimensionality mapping for the flat embedding array.
   * embedding = [category_dims..., keyword_dims..., topic_dims...]
   */
  dimensions: {
    /** Number of category dimensions (auto-detected if 0) */
    categories: number;
    /** Number of keyword dimensions (capped by maxKeywords) */
    keywords: number;
    /** Number of topic affinity dimensions */
    topics: number;
  };
}

/**
 * Default vector configuration values.
 * Used by preference-vector.service when no config is provided.
 */
export const DEFAULT_VECTOR_CONFIG: VectorConfig = Object.freeze({
  batchSize: 5,
  decayLambda: 0.05,
  maxAgeDays: 90,
  minDwellMs: 500,
  maxDwellMs: 5_000,
  maxKeywords: 50,
  dimensions: {
    categories: 0, // auto-detect from swipe data
    keywords: 50,
    topics: 10,
  },
});

// ── Query Types ───────────────────────────────────────────────────────

/**
 * Parameters for a pgvector nearest-neighbor similarity query.
 * Builds a WHERE-filtered ORDER BY embedding <=> $1 LIMIT $2 query.
 */
export interface VectorQuery {
  /** Maximum number of results to return */
  limit: number;
  /** Number of results to skip (for pagination) */
  offset?: number;
  /** Categories to exclude from results */
  excludedCategories?: string[];
  /** Minimum allowed difficulty numeric value (1=beginner, 3=advanced) */
  minDifficulty?: number;
  /** Maximum allowed difficulty numeric value */
  maxDifficulty?: number;
  /**
   * Minimum cosine similarity threshold (0.0–1.0).
   * Results below this threshold are excluded even if they're top-N.
   * Default: 0.0 (no threshold)
   */
  threshold?: number;
}

/**
 * Result of a pgvector similarity query.
 */
export interface VectorQueryResult {
  /** Matched idea IDs in similarity order (most similar first) */
  ideaIds: number[];
  /** Cosine similarity scores for each result (1.0 = identical, 0.0 = orthogonal) */
  scores: number[];
  /** Total number of matching ideas (before LIMIT, for pagination) */
  total: number;
}

// ── Decay Types ───────────────────────────────────────────────────────

/**
 * Configuration for the exponential temporal decay function.
 * weight = e^(-λ × days_since_swipe)
 */
export interface DecayConfig {
  /**
   * Decay rate constant λ (lambda).
   * Higher λ = faster decay (older swipes lose weight more quickly).
   * Default: 0.05 (~14 day half-life)
   */
  lambda: number;
  /**
   * Swipes older than this many days get approximately 0 weight.
   * Default: 90 days (<1% weight at λ=0.05)
   */
  maxDays: number;
  /**
   * Computed half-life in days: ln(2) / λ.
   * At half-life, a swipe's weight is exactly 0.5.
   */
  halfLifeDays: number;
}

/**
 * Compute the decay half-life from a lambda value.
 * halfLife = ln(2) / λ
 */
export function computeHalfLife(lambda: number): number {
  if (lambda <= 0) return Infinity;
  return Math.LN2 / lambda;
}

/**
 * Build a DecayConfig from a partial config or defaults.
 * If no config is provided, uses λ=0.05 and maxDays=90.
 */
export function buildDecayConfig(overrides?: Partial<DecayConfig>): DecayConfig {
  const lambda = overrides?.lambda ?? 0.05;
  const maxDays = overrides?.maxDays ?? 90;
  return Object.freeze({
    lambda,
    maxDays,
    halfLifeDays: computeHalfLife(lambda),
  });
}

// ── Difficulty Mapping ────────────────────────────────────────────────

/**
 * Maps difficulty labels to numeric values for query filtering and embedding.
 * 1 = beginner, 2 = intermediate, 3 = advanced
 */
export const DIFFICULTY_MAP: Record<string, number> = Object.freeze({
  مبتدئ: 1,
  beginner: 1,
  متوسط: 2,
  intermediate: 2,
  متقدم: 3,
  advanced: 3,
});

/**
 * Reverse map from numeric difficulty back to Arabic label.
 */
export const DIFFICULTY_REVERSE: Record<number, string> = Object.freeze({
  1: 'مبتدئ',
  2: 'متوسط',
  3: 'متقدم',
});
