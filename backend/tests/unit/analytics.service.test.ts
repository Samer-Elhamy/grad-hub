/**
 * Unit tests: AnalyticsService (analytics.service.ts)
 *
 * Pure-function aggregation engine for swipe data.
 * All functions are pure — same input → same output, no side effects.
 *
 * Coverage targets:
 * - computeSwipeStats: aggregation by category, dwell, ratio, ratings
 * - computeCategoryAffinities: weighted affinity scoring with decay
 * - computePreferenceTrend: time-series bucket analysis
 * - computeGeoPreferences: country-level distribution
 * - updatePreferenceVector: preference vector mutation with clamping
 */

import {
  computeSwipeStats,
  computeCategoryAffinities,
  computePreferenceTrend,
  computeGeoPreferences,
  updatePreferenceVector,
} from '../../src/services/feedback/analytics.service';
import type { SwipeRecord, PreferenceVector } from '../../src/types/api';
import type { GeoPreference } from '../../src/types/swipe.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<SwipeRecord> = {}): SwipeRecord {
  return {
    id: `swipe_${Math.random().toString(36).substr(2, 9)}`,
    idea_id: 1,
    direction: 'right',
    dwell_time_ms: 1500,
    rating: 4,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/** Create a base PreferenceVector for update tests */
function makePreferenceVector(overrides: Partial<PreferenceVector> = {}): PreferenceVector {
  return {
    category_weights: { 'AI/ML': 0.5, 'Data Science': 0.5 },
    keyword_weights: { ai: 0.5, data: 0.5 },
    excluded_categories: [],
    difficulty_preference: null,
    last_updated: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeSwipeStats
// ---------------------------------------------------------------------------

describe('computeSwipeStats', () => {
  test('returns correct total_swipes, total_likes, total_dislikes', () => {
    const records = [
      makeRecord({ direction: 'right' }),
      makeRecord({ direction: 'left' }),
      makeRecord({ direction: 'right' }),
    ];

    const stats = computeSwipeStats(records);

    expect(stats.total_swipes).toBe(3);
    expect(stats.total_likes).toBe(2);
    expect(stats.total_dislikes).toBe(1);
  });

  test('calculates like_ratio correctly (50% for 1 right, 1 left)', () => {
    const records = [
      makeRecord({ direction: 'right' }),
      makeRecord({ direction: 'left' }),
    ];

    const stats = computeSwipeStats(records);

    expect(stats.like_ratio).toBe(0.5);
  });

  test('groups records by category correctly', () => {
    // idea_id 1 → AI/ML, idea_id 3 → Data Science
    const records = [
      makeRecord({ idea_id: 1, direction: 'right' }),
      makeRecord({ idea_id: 1, direction: 'right' }),
      makeRecord({ idea_id: 3, direction: 'left' }),
    ];

    const stats = computeSwipeStats(records);

    expect(stats.categories).toBeDefined();
    expect(Object.keys(stats.categories)).toContain('AI/ML');
    expect(Object.keys(stats.categories)).toContain('Data Science');
  });

  test('returns average_dwell_time_ms correctly', () => {
    const records = [
      makeRecord({ dwell_time_ms: 1000 }),
      makeRecord({ dwell_time_ms: 2000 }),
      makeRecord({ dwell_time_ms: 3000 }),
    ];

    const stats = computeSwipeStats(records);

    expect(stats.average_dwell_time_ms).toBe(2000);
  });

  test('handles empty records array (all zeros/empty)', () => {
    const stats = computeSwipeStats([]);

    expect(stats.total_swipes).toBe(0);
    expect(stats.total_likes).toBe(0);
    expect(stats.total_dislikes).toBe(0);
    expect(stats.like_ratio).toBe(0);
    expect(stats.average_dwell_time_ms).toBe(0);
    expect(stats.categories).toEqual({});
    expect(stats.last_updated).toBeDefined();
  });

  test('calculates average_rating per category', () => {
    // idea_id 1 → AI/ML, ratings 4 and 2 → average (4+2)/2 = 3
    const records = [
      makeRecord({ idea_id: 1, rating: 4 }),
      makeRecord({ idea_id: 1, rating: 2 }),
    ];

    const stats = computeSwipeStats(records);

    expect(stats.categories['AI/ML'].average_rating).toBe(3);
  });

  test('average_rating is null when no ratings in category', () => {
    const records = [
      makeRecord({ idea_id: 1, rating: undefined }),
    ];

    const stats = computeSwipeStats(records);

    expect(stats.categories['AI/ML'].average_rating).toBeNull();
  });

  test('per-category right_ratio is correct', () => {
    // idea_id 1 → AI/ML: 3 right, 1 left → right_ratio = 0.75
    const records = [
      makeRecord({ idea_id: 1, direction: 'right' }),
      makeRecord({ idea_id: 1, direction: 'right' }),
      makeRecord({ idea_id: 1, direction: 'right' }),
      makeRecord({ idea_id: 1, direction: 'left' }),
    ];

    const stats = computeSwipeStats(records);

    expect(stats.categories['AI/ML'].right_swipes).toBe(3);
    expect(stats.categories['AI/ML'].right_ratio).toBe(0.75);
    expect(stats.categories['AI/ML'].total_swipes).toBe(4);
  });

  test('per-category average_dwell_time_ms is correct', () => {
    // idea_id 1 → AI/ML: dwell 1000 + 3000 = 4000 / 2 = 2000
    const records = [
      makeRecord({ idea_id: 1, dwell_time_ms: 1000 }),
      makeRecord({ idea_id: 1, dwell_time_ms: 3000 }),
    ];

    const stats = computeSwipeStats(records);

    expect(stats.categories['AI/ML'].average_dwell_time_ms).toBe(2000);
  });
});

// ---------------------------------------------------------------------------
// computeCategoryAffinities
// ---------------------------------------------------------------------------

describe('computeCategoryAffinities', () => {
  test('returns positive affinity for right swipes', () => {
    const records = [
      makeRecord({ idea_id: 1, direction: 'right', rating: 5 }),
      makeRecord({ idea_id: 1, direction: 'right', rating: 4 }),
    ];

    const affinities = computeCategoryAffinities(records);

    const aiMl = affinities.find((a) => a.category === 'AI/ML');
    expect(aiMl).toBeDefined();
    expect(aiMl!.affinity_score).toBeGreaterThan(0);
  });

  test('returns negative affinity for left swipes', () => {
    const records = [
      makeRecord({ idea_id: 1, direction: 'left', rating: 5 }),
      makeRecord({ idea_id: 1, direction: 'left', rating: 4 }),
    ];

    const affinities = computeCategoryAffinities(records);

    const aiMl = affinities.find((a) => a.category === 'AI/ML');
    expect(aiMl).toBeDefined();
    expect(aiMl!.affinity_score).toBeLessThan(0);
  });

  test('returns empty array for empty records', () => {
    const affinities = computeCategoryAffinities([]);

    expect(affinities).toEqual([]);
  });

  test('scores sorted descending (highest affinity first)', () => {
    // idea_id 1 → AI/ML, idea_id 3 → Data Science
    // All right swipes: AI/ML gets 3, Data Science gets 1
    const records = [
      makeRecord({ idea_id: 1, direction: 'right', rating: 5 }),
      makeRecord({ idea_id: 1, direction: 'right', rating: 5 }),
      makeRecord({ idea_id: 1, direction: 'right', rating: 5 }),
      makeRecord({ idea_id: 3, direction: 'right', rating: 3 }),
    ];

    const affinities = computeCategoryAffinities(records);

    expect(affinities.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < affinities.length; i++) {
      expect(affinities[i - 1].affinity_score).toBeGreaterThanOrEqual(affinities[i].affinity_score);
    }
  });

  test('trend: rising when recent score > earlier score', () => {
    // Three swipes: first two negative-ish, last strongly positive → rising
    const base = Date.now();
    const records = [
      makeRecord({ idea_id: 1, direction: 'left', rating: 2, timestamp: new Date(base - 3000).toISOString() }),
      makeRecord({ idea_id: 1, direction: 'left', rating: 2, timestamp: new Date(base - 2000).toISOString() }),
      makeRecord({ idea_id: 1, direction: 'right', rating: 5, timestamp: new Date(base - 1000).toISOString() }),
    ];

    const affinities = computeCategoryAffinities(records);

    const aiMl = affinities.find((a) => a.category === 'AI/ML');
    expect(aiMl).toBeDefined();
    expect(aiMl!.trend).toBe('rising');
  });

  test('affinity clamped to [-1, 1]', () => {
    // Very strong positive swipes
    const records = Array.from({ length: 100 }, () =>
      makeRecord({ idea_id: 1, direction: 'right', rating: 5 }),
    );

    const affinities = computeCategoryAffinities(records);

    const aiMl = affinities.find((a) => a.category === 'AI/ML');
    expect(aiMl).toBeDefined();
    expect(aiMl!.affinity_score).toBeLessThanOrEqual(1);
    expect(aiMl!.affinity_score).toBeGreaterThanOrEqual(-1);
  });

  test('last_swipe_at timestamp is from the most recent record', () => {
    const recentTs = new Date().toISOString();
    const records = [
      makeRecord({ idea_id: 1, timestamp: new Date(Date.now() - 60000).toISOString() }),
      makeRecord({ idea_id: 1, timestamp: recentTs }),
    ];

    const affinities = computeCategoryAffinities(records);

    const aiMl = affinities.find((a) => a.category === 'AI/ML');
    expect(aiMl).toBeDefined();
    expect(aiMl!.last_swipe_at).toBe(recentTs);
  });

  test('affinity_score is 0 for equal right and left swipes with same rating', () => {
    const records = [
      makeRecord({ idea_id: 1, direction: 'right', rating: 3 }),
      makeRecord({ idea_id: 1, direction: 'left', rating: 3 }),
    ];

    const affinities = computeCategoryAffinities(records);

    const aiMl = affinities.find((a) => a.category === 'AI/ML');
    expect(aiMl).toBeDefined();
    // direction 1 * 3/5 = 0.6 and -1 * 3/5 = -0.6 → weighted sum ~0 (decay makes it slightly negative)
    expect(aiMl!.affinity_score).toBeCloseTo(0, 1);
  });
});

// ---------------------------------------------------------------------------
// computePreferenceTrend
// ---------------------------------------------------------------------------

describe('computePreferenceTrend', () => {
  /** Create a record with a specific timestamp offset from now */
  function recordAtOffset(ideaId: number, direction: 'left' | 'right', offsetMs: number, overrides: Partial<SwipeRecord> = {}): SwipeRecord {
    return makeRecord({
      idea_id: ideaId,
      direction,
      timestamp: new Date(Date.now() - offsetMs).toISOString(),
      ...overrides,
    });
  }

  test('returns correct number of data_points (10)', () => {
    // Create records spanning last 24h for AI/ML (idea_id 1)
    const records = Array.from({ length: 10 }, (_, i) =>
      recordAtOffset(1, 'right', i * 1000000),
    );

    const trend = computePreferenceTrend(records, 'AI/ML', '24h');

    expect(trend.data_points.length).toBe(10);
    expect(trend.category).toBe('AI/ML');
    expect(trend.period).toBe('24h');
  });

  test('direction is "up" when like ratio increases over time', () => {
    // First half left (dislike), second half right (like)
    const records = [
      // Left swipes (early)
      ...Array.from({ length: 5 }, (_, i) =>
        recordAtOffset(1, 'left', (10 - i) * 1000000),
      ),
      // Right swipes (late)
      ...Array.from({ length: 5 }, (_, i) =>
        recordAtOffset(1, 'right', (4 - i) * 1000000),
      ),
    ];

    const trend = computePreferenceTrend(records, 'AI/ML', '24h');

    expect(trend.direction).toBe('up');
  });

  test('handle "all" period (no time cutoff)', () => {
    const veryOld = new Date(0).toISOString();
    const records = [
      makeRecord({ idea_id: 1, timestamp: veryOld }),
      makeRecord({ idea_id: 1, direction: 'right' }),
    ];

    const trend = computePreferenceTrend(records, 'AI/ML', 'all');

    expect(trend.period).toBe('all');
    expect(trend.data_points.length).toBe(10);
  });

  test('empty filtered records for unknown category', () => {
    const records = [
      makeRecord({ idea_id: 1, direction: 'right' }),
    ];

    // idea_id 1 → AI/ML, so requesting 'Blockchain' returns nothing
    const trend = computePreferenceTrend(records, 'Blockchain', '30d');

    expect(trend.category).toBe('Blockchain');
    expect(trend.data_points.length).toBe(10);
    // All buckets should have 0 swipes and 0 like_ratio
    trend.data_points.forEach((dp) => {
      expect(dp.swipe_count).toBe(0);
      expect(dp.like_ratio).toBe(0);
    });
  });

  test('magnitude is a number between 0 and 1', () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      recordAtOffset(1, 'right', i * 1000000),
    );

    const trend = computePreferenceTrend(records, 'AI/ML', '24h');

    expect(trend.magnitude).toBeGreaterThanOrEqual(0);
    expect(trend.magnitude).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// computeGeoPreferences
// ---------------------------------------------------------------------------

describe('computeGeoPreferences', () => {
  function makeGeoRecord(overrides: Partial<SwipeRecord> & { idea_id: number }): SwipeRecord {
    return makeRecord(overrides);
  }

  test('returns correct like counts and ratios', () => {
    const ideaCountryMap = new Map<number, string>([
      [1, 'Egypt'],
      [2, 'UAE'],
    ]);

    const records = [
      makeGeoRecord({ idea_id: 1, direction: 'right' }),
      makeGeoRecord({ idea_id: 1, direction: 'right' }),
      makeGeoRecord({ idea_id: 1, direction: 'left' }),
      makeGeoRecord({ idea_id: 2, direction: 'right' }),
    ];

    const geo = computeGeoPreferences(records, ideaCountryMap);

    const egypt = geo.find((g) => g.country === 'Egypt');
    const uae = geo.find((g) => g.country === 'UAE');

    expect(egypt).toBeDefined();
    expect(egypt!.like_count).toBe(2);
    expect(egypt!.swipe_count).toBe(3);
    expect(egypt!.like_ratio).toBeCloseTo(0.67, 1);

    expect(uae).toBeDefined();
    expect(uae!.like_count).toBe(1);
    expect(uae!.swipe_count).toBe(1);
    expect(uae!.like_ratio).toBe(1);
  });

  test('handles unknown country mapping', () => {
    const ideaCountryMap = new Map<number, string>([
      [1, 'Egypt'],
    ]);

    // idea_id 99 has no mapping → 'Unknown'
    const records = [
      makeGeoRecord({ idea_id: 99, direction: 'right' }),
    ];

    const geo = computeGeoPreferences(records, ideaCountryMap);

    expect(geo.length).toBe(1);
    expect(geo[0].country).toBe('Unknown');
    expect(geo[0].like_count).toBe(1);
    expect(geo[0].swipe_count).toBe(1);
    expect(geo[0].like_ratio).toBe(1);
  });

  test('returns empty array for empty records', () => {
    const ideaCountryMap = new Map<number, string>();
    const geo = computeGeoPreferences([], ideaCountryMap);

    expect(geo).toEqual([]);
  });

  test('results sorted by like_ratio descending', () => {
    const ideaCountryMap = new Map<number, string>([
      [1, 'Egypt'],
      [2, 'UAE'],
      [3, 'KSA'],
    ]);

    const records = [
      makeGeoRecord({ idea_id: 1, direction: 'left' }),   // Egypt: 0/1 = 0
      makeGeoRecord({ idea_id: 2, direction: 'right' }),  // UAE: 1/1 = 1
      makeGeoRecord({ idea_id: 3, direction: 'right' }),  // KSA: 1/1 = 1
    ];

    const geo = computeGeoPreferences(records, ideaCountryMap);

    expect(geo.length).toBe(3);
    // UAE and KSA both have 1.0, Egypt has 0 → Egypt last
    expect(geo[geo.length - 1].country).toBe('Egypt');
    expect(geo[geo.length - 1].like_ratio).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// updatePreferenceVector
// ---------------------------------------------------------------------------

describe('updatePreferenceVector', () => {
  test('right swipe increases category weight by 0.1', () => {
    const prefs = makePreferenceVector({ category_weights: { 'AI/ML': 0.5 } });
    const record = makeRecord({ idea_id: 1, direction: 'right', rating: 5 });

    const updated = updatePreferenceVector(prefs, record);

    // 0.5 + (0.1 * 5/5) = 0.6
    expect(updated.category_weights['AI/ML']).toBeCloseTo(0.6, 5);
  });

  test('left swipe decreases category weight by 0.1', () => {
    const prefs = makePreferenceVector({ category_weights: { 'AI/ML': 0.5 } });
    const record = makeRecord({ idea_id: 1, direction: 'left', rating: 5 });

    const updated = updatePreferenceVector(prefs, record);

    // 0.5 + (-0.1 * 5/5) = 0.4
    expect(updated.category_weights['AI/ML']).toBeCloseTo(0.4, 5);
  });

  test('weight clamped to [0, 1] — does not go below 0', () => {
    const prefs = makePreferenceVector({ category_weights: { 'AI/ML': 0.05 } });
    const record = makeRecord({ idea_id: 1, direction: 'left', rating: 5 });

    const updated = updatePreferenceVector(prefs, record);

    // 0.05 + (-0.1 * 1.0) = -0.05 → clamped to 0
    expect(updated.category_weights['AI/ML']).toBe(0);
  });

  test('weight clamped to [0, 1] — does not go above 1', () => {
    const prefs = makePreferenceVector({ category_weights: { 'AI/ML': 0.95 } });
    const record = makeRecord({ idea_id: 1, direction: 'right', rating: 5 });

    const updated = updatePreferenceVector(prefs, record);

    // 0.95 + (0.1 * 1.0) = 1.05 → clamped to 1
    expect(updated.category_weights['AI/ML']).toBe(1);
  });

  test('category auto-excluded when weight < 0.05', () => {
    const prefs = makePreferenceVector({
      category_weights: { 'AI/ML': 0.1 },
      excluded_categories: [],
    });

    // 0.1 + (-0.1 * 1.0) = 0.0 → below 0.05 → auto-excluded
    const record = makeRecord({ idea_id: 1, direction: 'left', rating: 5 });

    const updated = updatePreferenceVector(prefs, record);

    expect(updated.excluded_categories).toContain('AI/ML');
  });

  test('does NOT mutate original preference object (pure function)', () => {
    const prefs = makePreferenceVector({
      category_weights: { 'AI/ML': 0.5 },
      keyword_weights: { ai: 0.5 },
    });
    const record = makeRecord({ idea_id: 1, direction: 'right', rating: 5 });

    const originalWeights = { ...prefs.category_weights };
    const originalExcluded = [...prefs.excluded_categories];
    const originalUpdated = prefs.last_updated;

    const updated = updatePreferenceVector(prefs, record);

    // Original should be unchanged
    expect(prefs.category_weights['AI/ML']).toBe(0.5);
    expect(prefs.excluded_categories).toEqual([]);
    expect(prefs.last_updated).toBe(originalUpdated);

    // Updated should have new values
    expect(updated.category_weights['AI/ML']).toBeCloseTo(0.6, 5);
    expect(updated.last_updated).not.toBe(originalUpdated);
  });

  test('returns new last_updated timestamp', () => {
    const prefs = makePreferenceVector();
    const record = makeRecord({ idea_id: 1, direction: 'right' });

    const updated = updatePreferenceVector(prefs, record);

    expect(updated.last_updated).toBeDefined();
    expect(typeof updated.last_updated).toBe('string');
    expect(updated.last_updated).not.toBe(prefs.last_updated);
    // Should be a valid ISO timestamp
    expect(() => new Date(updated.last_updated)).not.toThrow();
  });

  test('right swipe increases idea keyword weights', () => {
    const prefs = makePreferenceVector({
      keyword_weights: { python: 0.5, react: 0.4 },
    });
    const record = makeRecord({ idea_id: 1, direction: 'right', rating: 5 });

    const updated = updatePreferenceVector(prefs, record);

    expect(updated.keyword_weights.python).toBeGreaterThan(0.5);
    expect(updated.keyword_weights.pytorch).toBeGreaterThan(0);
    expect(updated.keyword_weights.react).toBeGreaterThan(0.4);
    expect(updated.keyword_weights.docker).toBeGreaterThan(0);
  });

  test('left swipe decreases idea keyword weights', () => {
    const prefs = makePreferenceVector({
      keyword_weights: { python: 0.5, react: 0.4, docker: 0.3 },
    });
    const record = makeRecord({ idea_id: 1, direction: 'left', rating: 5 });

    const updated = updatePreferenceVector(prefs, record);

    expect(updated.keyword_weights.python).toBeLessThan(0.5);
    expect(updated.keyword_weights.react).toBeLessThan(0.4);
    expect(updated.keyword_weights.docker).toBeLessThan(0.3);
  });

  test('rating multiplier scales the adjustment', () => {
    const prefs = makePreferenceVector({ category_weights: { 'AI/ML': 0.5 } });
    // rating 2 → multiplier 2/5 = 0.4 → adjustment = 0.1 * 0.4 = 0.04
    const record = makeRecord({ idea_id: 1, direction: 'right', rating: 2 });

    const updated = updatePreferenceVector(prefs, record);

    // 0.5 + 0.04 = 0.54
    expect(updated.category_weights['AI/ML']).toBeCloseTo(0.54, 5);
  });

  test('category mapping that returns null does not modify weights', () => {
    const prefs = makePreferenceVector({ category_weights: { 'AI/ML': 0.5 } });
    // idea_id 999 is not in the inferCategoryFromIdea map → null
    const record = makeRecord({ idea_id: 999, direction: 'right', rating: 5 });

    const updated = updatePreferenceVector(prefs, record);

    expect(updated.category_weights).toEqual(prefs.category_weights);
  });

  test('does not duplicate category in excluded_categories if already excluded', () => {
    const prefs = makePreferenceVector({
      category_weights: { 'AI/ML': 0.1 },
      excluded_categories: ['AI/ML'],
    });
    const record = makeRecord({ idea_id: 1, direction: 'left', rating: 5 });

    const updated = updatePreferenceVector(prefs, record);

    expect(updated.excluded_categories).toEqual(['AI/ML']);
    expect(updated.excluded_categories.length).toBe(1);
  });
});
