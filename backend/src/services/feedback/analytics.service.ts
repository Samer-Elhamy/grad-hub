/**
 * AnalyticsService — Pure-function aggregation engine for swipe data
 *
 * This module contains ONLY pure functions:
 *   - Same input → same output (no side effects)
 *   - No I/O, no persistence, no event emission
 *   - All state is passed in explicitly
 *
 * Responsibilities:
 *   - SwipeStats: right/total ratio per category, avg dwell time per category
 *   - CategoryAffinity: learned preference weight per category (-1.0 to +1.0)
 *   - PreferenceTrend: time-series evolution of category preference
 *   - PreferenceVector: update category/keyword weights from swipe data
 */

import type {
  SwipeStats,
  CategoryStats,
  CategoryAffinity,
  PreferenceTrend,
  GeoPreference,
} from '../../types/swipe.types';
import type { SwipeRecord, PreferenceVector } from '../../types/api';

// ── Constants ────────────────────────────────────────────────────────

/** Category keyword mapping used to infer category from idea data */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'AI/ML': ['ai', 'ml', 'machine learning', 'deep learning', 'neural', 'intelligence', 'tensorflow', 'pytorch'],
  'Web Applications': ['web', 'react', 'next.js', 'vue', 'node.js', 'frontend', 'backend', 'fullstack'],
  'Mobile Apps': ['mobile', 'flutter', 'react native', 'android', 'ios', 'kotlin', 'swift'],
  Cybersecurity: ['security', 'cyber', 'encryption', 'authentication', 'vulnerability', 'phishing'],
  'Data Science': ['data', 'analytics', 'statistics', 'visualization', 'pandas', 'tableau'],
  'Cloud/DevOps': ['cloud', 'devops', 'kubernetes', 'docker', 'aws', 'terraform', 'serverless'],
  Blockchain: ['blockchain', 'ethereum', 'solidity', 'web3', 'crypto', 'smart contract'],
  'Game Development': ['game', 'unity', 'unreal', 'vr', 'ar', 'procedural'],
  IoT: ['iot', 'sensor', 'embedded', 'raspberry', 'arduino', 'esp32'],
};

/** Decay factor for affinity calculation: older swipes weigh less */
const AFFINITY_DECAY = 0.95;

/** Minimum data points required for trend calculation */
const MIN_TREND_DATA_POINTS = 5;

// ── SwipeStats aggregation ───────────────────────────────────────────

/**
 * Compute aggregated swipe statistics from raw swipe records.
 * Pure function: given records → returns stats, no side effects.
 */
export function computeSwipeStats(records: SwipeRecord[]): SwipeStats {
  const categoryBuckets = new Map<string, SwipeRecord[]>();

  for (const record of records) {
    // Infer category from idea data or use a default
    const category = inferCategoryFromIdea(record.idea_id) ?? 'Unknown';
    const bucket = categoryBuckets.get(category) ?? [];
    bucket.push(record);
    categoryBuckets.set(category, bucket);
  }

  const totalSwipes = records.length;
  const totalLikes = records.filter((r) => r.direction === 'right').length;
  const totalDislikes = records.filter((r) => r.direction === 'left').length;
  const totalDwell = records.reduce((sum, r) => sum + (r.dwell_time_ms ?? 0), 0);
  const allRatings = records.filter((r): r is SwipeRecord & { rating: number } => r.rating !== undefined);

  const categories: Record<string, CategoryStats> = {};
  for (const [category, bucket] of categoryBuckets) {
    const rightSwipes = bucket.filter((r) => r.direction === 'right').length;
    const dwellSum = bucket.reduce((sum, r) => sum + (r.dwell_time_ms ?? 0), 0);
    const ratedSwipes = bucket.filter((r) => r.rating !== undefined);

    categories[category] = {
      category,
      total_swipes: bucket.length,
      right_swipes: rightSwipes,
      right_ratio: bucket.length > 0 ? rightSwipes / bucket.length : 0,
      average_dwell_time_ms: bucket.length > 0 ? dwellSum / bucket.length : 0,
      average_rating:
        ratedSwipes.length > 0
          ? ratedSwipes.reduce((s, r) => s + (r.rating ?? 0), 0) / ratedSwipes.length
          : null,
    };
  }

  return {
    total_swipes: totalSwipes,
    total_likes: totalLikes,
    total_dislikes: totalDislikes,
    like_ratio: totalSwipes > 0 ? totalLikes / totalSwipes : 0,
    average_dwell_time_ms: totalSwipes > 0 ? totalDwell / totalSwipes : 0,
    categories,
    last_updated: new Date().toISOString(),
  };
}

// ── CategoryAffinity calculation ─────────────────────────────────────

/**
 * Calculate category affinity scores from swipe records.
 * Returns an array of CategoryAffinity for all categories with data.
 *
 * Affinity formula:
 *   weight = sum( (direction_score * rating_multiplier) * decay^index ) / count
 *   direction_score: +1 for right, -1 for left
 *   rating_multiplier: rating/5 if present, 1.0 if absent
 *   decay: older swipes contribute less (0.95 per swipe)
 */
export function computeCategoryAffinities(records: SwipeRecord[]): CategoryAffinity[] {
  const categoryBuckets = new Map<string, { scores: number[]; timestamps: string[] }>();

  for (const record of records) {
    const category = inferCategoryFromIdea(record.idea_id) ?? 'Unknown';
    const bucket = categoryBuckets.get(category) ?? { scores: [], timestamps: [] };

    const directionScore = record.direction === 'left' ? -1 : 1;
    const ratingMultiplier = record.rating ? record.rating / 5 : 1.0;
    const score = directionScore * ratingMultiplier;

    bucket.scores.push(score);
    bucket.timestamps.push(record.timestamp);
    categoryBuckets.set(category, bucket);
  }

  const affinities: CategoryAffinity[] = [];

  for (const [category, { scores, timestamps }] of categoryBuckets) {
    if (scores.length === 0) continue;

    // Apply decay: most recent (last in array) has highest weight
    const weightedSum = scores.reduce((sum, score, i) => {
      const decayFactor = Math.pow(AFFINITY_DECAY, scores.length - 1 - i);
      return sum + score * decayFactor;
    }, 0);

    const totalWeight = scores.reduce((sum, _, i) => {
      return sum + Math.pow(AFFINITY_DECAY, scores.length - 1 - i);
    }, 0);

    const affinityScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Clamp to [-1, 1]
    const clampedScore = Math.max(-1, Math.min(1, affinityScore));

    // Determine trend from last 3 swipes
    const recentScores = scores.slice(-3);
    const trend = determineTrend(recentScores);

    affinities.push({
      category,
      affinity_score: Math.round(clampedScore * 100) / 100,
      swipe_count: scores.length,
      trend,
      last_swipe_at: timestamps[timestamps.length - 1],
    });
  }

  return affinities.sort((a, b) => b.affinity_score - a.affinity_score);
}

/**
 * Determine trend direction from a sequence of scores.
 * Rising = most recent scores increasing, falling = decreasing, else stable.
 */
function determineTrend(scores: number[]): 'rising' | 'falling' | 'stable' {
  if (scores.length < 2) return 'stable';

  const recent = scores.slice(-2);
  if (recent[1] > recent[0]) return 'rising';
  if (recent[1] < recent[0]) return 'falling';
  return 'stable';
}

// ── PreferenceTrend calculation ──────────────────────────────────────

/**
 * Build preference trend data for a category over a specified period.
 *
 * Pure function: records + category + period → trend data.
 * Periods are bucketed into equal time slices.
 */
export function computePreferenceTrend(
  records: SwipeRecord[],
  category: string,
  period: PreferenceTrend['period'],
): PreferenceTrend {
  const now = Date.now();
  const periodMs = getPeriodMilliseconds(period);
  const cutoff = now - periodMs;

  // Filter records for the category and period
  const filtered = records.filter((r) => {
    const cat = inferCategoryFromIdea(r.idea_id);
    const ts = new Date(r.timestamp).getTime();
    return cat === category && ts >= cutoff;
  });

  // Sort by timestamp ascending
  filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // For 'all' period, use the actual record time range to avoid Infinity math
  const effectiveCutoff = isFinite(cutoff) ? cutoff : (filtered.length > 0 ? new Date(filtered[0].timestamp).getTime() : 0);
  const effectivePeriod = isFinite(periodMs) ? periodMs : Math.max(1, Date.now() - effectiveCutoff);

  // Bucket into time slices (e.g., 10 buckets)
  const bucketCount = 10;
  const bucketSize = effectivePeriod / bucketCount;
  const buckets: PreferenceTrend['data_points'] = [];
  let cumulativeSwipeCount = 0;
  let cumulativeRightCount = 0;
  let cumulativeAffinity = 0;

  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = effectiveCutoff + i * bucketSize;
    const bucketEnd = bucketStart + bucketSize;
    const date = new Date(bucketStart).toISOString();

    const bucketRecords = filtered.filter((r) => {
      const ts = new Date(r.timestamp).getTime();
      return ts >= bucketStart && ts < bucketEnd;
    });

    const rightCount = bucketRecords.filter((r) => r.direction === 'right').length;
    cumulativeSwipeCount += bucketRecords.length;
    cumulativeRightCount += rightCount;

    // Cumulative affinity: running average
    if (cumulativeSwipeCount > 0) {
      cumulativeAffinity = (cumulativeRightCount - (cumulativeSwipeCount - cumulativeRightCount)) / cumulativeSwipeCount;
    }

    buckets.push({
      date,
      like_ratio: bucketRecords.length > 0 ? rightCount / bucketRecords.length : 0,
      swipe_count: bucketRecords.length,
      cumulative_affinity: Math.round(cumulativeAffinity * 100) / 100,
    });
  }

  // Determine direction from first vs last bucket
  const first = buckets[0];
  const last = buckets[buckets.length - 1];
  const direction: PreferenceTrend['direction'] =
    last.like_ratio > first.like_ratio ? 'up' : last.like_ratio < first.like_ratio ? 'down' : 'stable';

  // Magnitude: absolute difference in like ratio between first and last 3 buckets
  const earlyAvg = buckets.slice(0, 3).reduce((s, b) => s + b.like_ratio, 0) / 3;
  const lateAvg = buckets.slice(-3).reduce((s, b) => s + b.like_ratio, 0) / 3;
  const magnitude = Math.min(1, Math.abs(lateAvg - earlyAvg));

  return {
    category,
    period,
    data_points: buckets,
    direction,
    magnitude: Math.round(magnitude * 100) / 100,
  };
}

/** Convert period name to milliseconds */
function getPeriodMilliseconds(period: PreferenceTrend['period']): number {
  const MS = {
    '24h': 86_400_000,
    '7d': 604_800_000,
    '30d': 2_592_000_000,
    'all': Infinity,
  };
  return MS[period];
}

// ── GeoPreference calculation ────────────────────────────────────────

/**
 * Compute geo distribution of liked ideas.
 * Pair with ideas data to enrich with country info.
 */
export function computeGeoPreferences(
  records: SwipeRecord[],
  ideaCountryMap: Map<number, string>,
): GeoPreference[] {
  const geoBuckets = new Map<string, { likes: number; total: number }>();

  for (const record of records) {
    const country = ideaCountryMap.get(record.idea_id) ?? 'Unknown';
    const bucket = geoBuckets.get(country) ?? { likes: 0, total: 0 };
    bucket.total++;
    if (record.direction === 'right') bucket.likes++;
    geoBuckets.set(country, bucket);
  }

  return Array.from(geoBuckets.entries())
    .map(([country, { likes, total }]) => ({
      country,
      like_count: likes,
      swipe_count: total,
      like_ratio: total > 0 ? Math.round((likes / total) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.like_ratio - a.like_ratio);
}

// ── PreferenceVector update ──────────────────────────────────────────

/**
 * Update the preference vector based on a single swipe record.
 *
 * This is the bridge between raw swipes and the continuous preference model.
 * Every swipe adjusts category weights, keyword weights, and exclusion lists.
 *
 * Pure function: old prefs + record → new prefs (no mutation).
 */
export function updatePreferenceVector(
  prefs: PreferenceVector,
  record: SwipeRecord,
): PreferenceVector {
  const updated = { ...prefs, category_weights: { ...prefs.category_weights }, keyword_weights: { ...prefs.keyword_weights } };

  // Infer category (stub — in production, look up from ideas table)
  const category = inferCategoryFromIdea(record.idea_id);

  if (category) {
    const currentWeight = updated.category_weights[category] ?? 0.5;
    const adjustment = record.direction === 'left' ? -0.1 : record.direction === 'up' ? 0.15 : 0.1;

    // Apply rating multiplier if rating is present
    const ratingMultiplier = record.rating ? record.rating / 5 : 1.0;

    // New weight, clamped to [0, 1]
    updated.category_weights[category] = Math.max(0, Math.min(1, currentWeight + adjustment * ratingMultiplier));

    // Auto-exclude if repeatedly disliked below threshold
    if (updated.category_weights[category] < 0.05 && !updated.excluded_categories.includes(category)) {
      updated.excluded_categories = [...updated.excluded_categories, category];
    }
  }

  const keywords = inferKeywordsFromIdea(record.idea_id);
  if (keywords.length > 0) {
    const adjustment = record.direction === 'left' ? -0.05 : record.direction === 'up' ? 0.075 : 0.05;
    const ratingMultiplier = record.rating ? record.rating / 5 : 1.0;
    for (const keyword of keywords) {
      const currentWeight = updated.keyword_weights[keyword] ?? 0;
      updated.keyword_weights[keyword] = Math.max(
        0,
        Math.min(1, currentWeight + adjustment * ratingMultiplier),
      );
    }
  }

  updated.last_updated = new Date().toISOString();
  return updated;
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Infer the category of an idea by its ID.
 * Stub — in production, this queries the ideas table.
 */
function inferCategoryFromIdea(ideaId: number): string | null {
  const categoryMap: Record<number, string> = {
    1: 'AI/ML',
    2: 'AI/ML',
    3: 'Data Science',
    4: 'Web Applications',
    5: 'AI/ML',
  };
  return categoryMap[ideaId] ?? null;
}

function inferKeywordsFromIdea(ideaId: number): string[] {
  const keywordMap: Record<number, string[]> = {
    1: ['python', 'pytorch', 'react', 'docker', 'postgresql'],
    2: ['python', 'transformers', 'fastapi', 'react_native', 'mongodb'],
    3: ['python', 'scikit_learn', 'react', 'docker', 'postgresql'],
    4: ['node.js', 'react', 'websocket', 'redis', 'docker'],
    5: ['python', 'tensorflow', 'fastapi', 'react', 'postgresql'],
  };
  return keywordMap[ideaId] ?? [];
}
