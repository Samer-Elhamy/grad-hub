/**
 * VectorBuilder — Pure-function preference vector computation engine
 *
 * This module contains ONLY pure functions:
 *   - Same input → same output (no side effects)
 *   - No I/O, no persistence, no event emission
 *   - All state passed in explicitly
 *
 * Formula:
 *   category_score = ∑(swipe_weight × dwell_factor × rating_multiplier) / total_swipes
 *
 * Where:
 *   swipe_weight:       +1 for right (like), -1 for left (dislike)
 *   dwell_factor:       Normalized dwell time (0.5–1.5 range)
 *   rating_multiplier:  0 if no rating, 0.5–1.5 mapping rating 1–5
 *
 * Output: normalized vector where all category scores sum to 1.0
 */

import type { SwipeRecord, Idea } from '../../types/api';
import type {
  PreferenceVector,
  VectorComponent,
  VectorConfig,
  DecayConfig,
} from '../../types/vector.types';
import { DIFFICULTY_MAP, DEFAULT_VECTOR_CONFIG } from '../../types/vector.types';
import { computeDecayFactors } from './vector-decay';

// ── Public API ────────────────────────────────────────────────────────

/**
 * Build a full PreferenceVector from swipe history and idea data.
 *
 * Pure function: swipes + ideas + config → new PreferenceVector.
 * No I/O, no mutation — returns a fresh object every call.
 *
 * Computation steps:
 *   1. Apply temporal decay to all swipes
 *   2. Compute weighted category scores
 *   3. Normalize category scores (sum = 1.0)
 *   4. Build keyword frequency map from liked ideas
 *   5. Compute topic affinities from liked idea descriptions
 *   6. Assemble flat pgvector embedding
 */
export function buildPreferenceVector(
  swipes: SwipeRecord[],
  ideasMap: Map<number, Idea>,
  vectorConfig?: Partial<VectorConfig>,
  decayConfig?: Partial<DecayConfig>,
): PreferenceVector {
  const config: VectorConfig = { ...DEFAULT_VECTOR_CONFIG, ...vectorConfig };
  const now = Date.now();

  // 1. Compute decay factors for all swipes
  const decayFactors = computeDecayFactors(swipes, now, decayConfig);

  // 2. Separate liked and disliked swipes
  const likedSwipes = swipes.filter((s) => s.direction === 'right');
  const allSwipes = swipes;

  // 3. Compute weighted category scores
  const rawCategoryScores = computeCategoryScores(allSwipes, ideasMap, decayFactors, config);

  // 4. Normalize category scores to sum to 1.0
  const categoryWeights = normalizeScores(rawCategoryScores);

  // 5. Build keyword frequency map from liked ideas only
  const keywordWeights = computeKeywordWeights(likedSwipes, ideasMap, config);

  // 6. Compute topic affinities from liked idea descriptions
  const topicAffinities = computeTopicAffinities(likedSwipes, ideasMap, config);

  // 7. Compute the flat embedding array for pgvector
  const embedding = buildEmbedding(categoryWeights, keywordWeights, topicAffinities, config);

  // 8. Determine aggregated preferences
  const excludedCategories = computeExcludedCategories(categoryWeights);
  const { difficultyPreference, difficultyNumeric } = computeDifficultyPreference(likedSwipes, ideasMap);

  return {
    category_weights: categoryWeights,
    keyword_weights: keywordWeights,
    topic_affinities: topicAffinities,
    embedding,
    excluded_categories: excludedCategories,
    difficulty_preference: difficultyPreference,
    difficulty_numeric: difficultyNumeric,
    swipe_count: swipes.length,
    last_updated: new Date().toISOString(),
  };
}

/**
 * Compute per-category affinity scores with decay and rating multipliers.
 *
 * Formula for each swipe's contribution to a category:
 *   contribution = swipe_weight × dwell_factor × rating_multiplier × decay_factor
 *
 * Where:
 *   swipe_weight:       +1 (right), -1 (left)
 *   dwell_factor:       mapDwellToFactor(dwellMs) → 0.5–1.5
 *   rating_multiplier:  getRatingMultiplier(rating) → 0.5–1.5, or 1.0 if no rating
 *   decay_factor:       e^(-λ × days_since_swipe) → (0, 1]
 */
export function computeCategoryScores(
  swipes: SwipeRecord[],
  ideasMap: Map<number, Idea>,
  decayFactors: number[],
  config: VectorConfig,
): Record<string, number> {
  const scores: Record<string, { sum: number; count: number }> = {};

  for (let i = 0; i < swipes.length; i++) {
    const swipe = swipes[i];
    const idea = ideasMap.get(swipe.idea_id);
    if (!idea) continue; // Skip unknown ideas

    const category = idea.category;
    if (!category) continue;

    // Initialize bucket if first time seeing this category
    if (!scores[category]) {
      scores[category] = { sum: 0, count: 0 };
    }

    // Compute contribution for this swipe
    const swipeWeight = swipe.direction === 'right' ? 1 : -1;
    const dwell = mapDwellToFactor(swipe.dwell_time_ms ?? 0, config);
    const rating = getRatingMultiplier(swipe.rating);
    const decay = i < decayFactors.length ? decayFactors[i] : 1.0;

    const contribution = swipeWeight * dwell * rating * decay;
    scores[category].sum += contribution;
    scores[category].count += 1;
  }

  // Compute average per category
  const result: Record<string, number> = {};
  for (const [category, { sum, count }] of Object.entries(scores)) {
    result[category] = count > 0 ? sum / count : 0;
  }

  return result;
}

/**
 * Build keyword frequency weights from liked ideas' tech_stacks and descriptions.
 *
 * Process:
 *   1. Collect all keywords from tech_stack arrays of liked ideas
 *   2. Also extract keywords from descriptions (split on common delimiters)
 *   3. Count frequency (each liked swipe counts once per keyword)
 *   4. Normalize by total keyword occurrences (sum = 1.0)
 *   5. Prune to maxKeywords to keep vector dimensions bounded
 */
export function computeKeywordWeights(
  likedSwipes: SwipeRecord[],
  ideasMap: Map<number, Idea>,
  config: VectorConfig,
): Record<string, number> {
  const frequencies: Record<string, number> = {};
  let totalOccurrences = 0;

  for (const swipe of likedSwipes) {
    const idea = ideasMap.get(swipe.idea_id);
    if (!idea) continue;

    // Collect tech_stack keywords
    const techStack = idea.tech_stack ?? [];
    const techLower = techStack.map((t) => t.toLowerCase());

    // Collect description keywords (split on spaces and common delimiters)
    const descKeywords = extractDescriptionKeywords(idea.description);

    // Combine and deduplicate per idea
    const uniqueKeywords = new Set([...techLower, ...descKeywords]);

    for (const keyword of uniqueKeywords) {
      if (keyword.length < 2) continue; // Skip single chars
      frequencies[keyword] = (frequencies[keyword] ?? 0) + 1;
      totalOccurrences++;
    }
  }

  // Normalize to weights (frequency / total)
  const normalized: Record<string, number> = {};
  for (const [keyword, count] of Object.entries(frequencies)) {
    normalized[keyword] = totalOccurrences > 0 ? count / totalOccurrences : 0;
  }

  // Sort by weight descending and prune to maxKeywords
  const sorted = Object.entries(normalized)
    .sort(([, a], [, b]) => b - a)
    .slice(0, config.maxKeywords);

  return Object.fromEntries(sorted);
}

/**
 * Compute topic affinity scores from liked idea descriptions.
 *
 * Extracts meaningful bigrams/trigrams from descriptions and scores them
 * by frequency in liked swipes. Provides deeper insight into WHAT about
 * a category the user finds interesting.
 */
export function computeTopicAffinities(
  likedSwipes: SwipeRecord[],
  ideasMap: Map<number, Idea>,
  config: VectorConfig,
): Record<string, number> {
  const topics: Record<string, number> = {};
  let totalTopics = 0;

  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'in', 'of', 'for', 'to', 'and', 'or', 'is', 'are',
    'that', 'this', 'with', 'from', 'by', 'on', 'at', 'it', 'as', 'be',
  ]);

  for (const swipe of likedSwipes) {
    const idea = ideasMap.get(swipe.idea_id);
    if (!idea) continue;

    // Extract significant words from description
    const words = (idea.description ?? '')
      .toLowerCase()
      .split(/[\s,.;:!?()]+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    // Build bigrams as topic indicators
    const seen = new Set<string>();
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (!seen.has(bigram)) {
        seen.add(bigram);
        topics[bigram] = (topics[bigram] ?? 0) + 1;
        totalTopics++;
      }
    }
  }

  // Normalize to weights
  const normalized: Record<string, number> = {};
  for (const [topic, count] of Object.entries(topics)) {
    normalized[topic] = totalTopics > 0 ? count / totalTopics : 0;
  }

  // Sort by weight and limit to configured topics dimension count
  const sorted = Object.entries(normalized)
    .sort(([, a], [, b]) => b - a)
    .slice(0, config.dimensions.topics || 10);

  return Object.fromEntries(sorted);
}

/**
 * Build the flat embedding array for pgvector by concatenating
 * sorted category_weights, keyword_weights, and topic_affinities.
 *
 * The order is deterministic (sorted by key) to ensure consistent
 * dimension mapping across all vector computations.
 *
 * embedding = [cat_weight_1, ..., cat_weight_N,
 *              kw_weight_1, ..., kw_weight_M,
 *              topic_aff_1, ..., topic_aff_P]
 */
export function buildEmbedding(
  categoryWeights: Record<string, number>,
  keywordWeights: Record<string, number>,
  topicAffinities: Record<string, number>,
  _config: VectorConfig,
): number[] {
  const sortedCategories = Object.entries(categoryWeights)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, score]) => score);

  const sortedKeywords = Object.entries(keywordWeights)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, score]) => score);

  const sortedTopics = Object.entries(topicAffinities)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, score]) => score);

  return [...sortedCategories, ...sortedKeywords, ...sortedTopics];
}

// ── Utility functions ─────────────────────────────────────────────────

/**
 * Normalize scores so they sum to 1.0.
 * If all scores are 0, returns equal distribution.
 * Clamps negative scores to 0 before normalization.
 */
export function normalizeScores(scores: Record<string, number>): Record<string, number> {
  const clamped: Record<string, number> = {};
  let total = 0;

  for (const [key, value] of Object.entries(scores)) {
    const clampedValue = Math.max(0, value);
    clamped[key] = clampedValue;
    total += clampedValue;
  }

  if (total === 0) {
    // Equal distribution if no signal
    const equalWeight = 1 / Object.keys(clamped).length;
    for (const key of Object.keys(clamped)) {
      clamped[key] = equalWeight;
    }
    return clamped;
  }

  const normalized: Record<string, number> = {};
  for (const [key, value] of Object.entries(clamped)) {
    normalized[key] = roundTo(value / total, 4);
  }

  return normalized;
}

/**
 * Map dwell time to a factor in the [0.5, 1.5] range.
 *
 * - Below minDwellMs → 0.5 (user swiped quickly, likely low interest)
 * - Between min and max → linear interpolation (0.5 – 1.5)
 * - Above maxDwellMs → 1.5 (user studied the card, high engagement)
 */
export function mapDwellToFactor(dwellMs: number, config: VectorConfig): number {
  const { minDwellMs, maxDwellMs } = config;

  if (dwellMs <= minDwellMs) return 0.5;
  if (dwellMs >= maxDwellMs) return 1.5;

  // Linear interpolation: 0.5 + (dwell - min) / (max - min) * 1.0
  const range = maxDwellMs - minDwellMs;
  if (range <= 0) return 1.0;
  return 0.5 + ((dwellMs - minDwellMs) / range) * 1.0;
}

/**
 * Map an explicit rating (1–5) to a multiplier in [0.5, 1.5].
 * Rating 1 → 0.5, Rating 3 → 1.0, Rating 5 → 1.5
 * If no rating (undefined), returns 1.0 (neutral).
 */
export function getRatingMultiplier(rating: number | undefined): number {
  if (rating === undefined || rating === 0) return 1.0;
  // Map 1–5 → 0.5–1.5
  return 0.5 + ((Math.max(1, Math.min(5, rating)) - 1) * 1.0) / 4;
}

/**
 * Get the swipe weight based on direction.
 * Right (like) = +1, Left (dislike) = -1
 */
export function swipeWeight(direction: 'left' | 'right'): number {
  return direction === 'right' ? 1 : -1;
}

/**
 * Determine which categories to exclude based on consistently negative weights.
 * Categories with weight below 0.05 are excluded (user consistently disliked them).
 */
export function computeExcludedCategories(
  categoryWeights: Record<string, number>,
): string[] {
  return Object.entries(categoryWeights)
    .filter(([, weight]) => weight < 0.05)
    .map(([category]) => category);
}

/**
 * Compute the user's difficulty preference from liked swipe data.
 * Returns the most-frequently-liked difficulty level.
 */
export function computeDifficultyPreference(
  likedSwipes: SwipeRecord[],
  ideasMap: Map<number, Idea>,
): { difficultyPreference: string | null; difficultyNumeric: number | null } {
  const counts: Record<string, number> = {};

  for (const swipe of likedSwipes) {
    const idea = ideasMap.get(swipe.idea_id);
    if (!idea?.difficulty) continue;

    counts[idea.difficulty] = (counts[idea.difficulty] ?? 0) + 1;
  }

  const entries = Object.entries(counts);
  if (entries.length === 0) return { difficultyPreference: null, difficultyNumeric: null };

  // Find the most frequent difficulty
  const [topDifficulty] = entries.sort(([, a], [, b]) => b - a)[0];
  return {
    difficultyPreference: topDifficulty,
    difficultyNumeric: DIFFICULTY_MAP[topDifficulty] ?? null,
  };
}

/**
 * Extract meaningful keywords from a description string.
 * Splits on common delimiters, lowercases, filters short words.
 */
function extractDescriptionKeywords(description: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'in', 'of', 'for', 'to', 'and', 'or', 'is', 'are',
    'that', 'this', 'with', 'from', 'by', 'on', 'at', 'it', 'as', 'be',
    'system', 'platform', 'using', 'based', 'data', 'real',
  ]);

  return (description ?? '')
    .toLowerCase()
    .split(/[\s,.;:!?()\[\]{}'"\/\\|–—]+/)
    .filter((w) => w.length > 2 && !stopWords.has(w) && /^[a-z]/.test(w));
}

/**
 * Round a number to a fixed number of decimal places.
 * Prevents floating-point drift in normalized scores.
 */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ── Type exports for isolated testing ─────────────────────────────────

export type { VectorComponent };
