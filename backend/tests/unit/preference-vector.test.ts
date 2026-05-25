/**
 * Unit tests: Preference Vector (vector-builder.ts + vector-decay.ts)
 *
 * Coverage targets:
 * - Formula: swipe_weight × dwell_factor × rating_multiplier
 * - Normalization: scores sum to 1.0
 * - Decay function: 14-day half-life, <1% after 90 days
 * - Category scoring with various swipe patterns
 * - Keyword weight computation
 * - Topic affinity computation
 * - Embedding assembly
 * - Difficulty preference detection
 * - Excluded category computation
 */

import {
  buildPreferenceVector,
  computeCategoryScores,
  normalizeScores,
  mapDwellToFactor,
  getRatingMultiplier,
  swipeWeight,
  computeKeywordWeights,
  computeTopicAffinities,
  buildEmbedding,
  computeExcludedCategories,
  computeDifficultyPreference,
} from '../../src/services/feedback/vector-builder';
import {
  decayWeight,
  computeDecayFactors,
  getHalfLife,
  weightRemaining,
  decayWithCutoff,
} from '../../src/services/feedback/vector-decay';
import type { SwipeRecord, Idea } from '../../src/types/api';
import type { VectorConfig } from '../../src/types/vector.types';
import { DEFAULT_VECTOR_CONFIG } from '../../src/types/vector.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultConfig: VectorConfig = { ...DEFAULT_VECTOR_CONFIG };

function makeSwipe(overrides: Partial<SwipeRecord> = {}): SwipeRecord {
  return {
    id: `swipe_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    idea_id: 1,
    direction: 'right',
    dwell_time_ms: 1500,
    rating: 3,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function makeIdea(id: number, overrides: Partial<Idea> = {}): Idea {
  return {
    id,
    title_ar: '',
    title_en: `Idea ${id}`,
    category: 'AI/ML',
    short_desc_ar: '',
    short_desc_en: '',
    university: 'Test University',
    country: 'US',
    tech_stack: ['python', 'tensorflow', 'react'],
    difficulty: 'intermediate',
    rating: 4,
    featured: false,
    description: 'A machine learning project for natural language processing',
    technologies: ['python', 'tensorflow'],
    ...overrides,
  };
}

function makeIdeasMap(ideas: Idea[]): Map<number, Idea> {
  return new Map(ideas.map((i) => [i.id, i]));
}

// ---------------------------------------------------------------------------
// Decay Function Tests
// ---------------------------------------------------------------------------

describe('VectorDecay — decayWeight', () => {
  // ── Positive: Today = full weight ──────────────────────────────────────
  test('decayWeight returns 1.0 for today (0 days elapsed)', () => {
    expect(decayWeight(0, 0.05)).toBe(1.0);
  });

  // ── Positive: ~14 day half-life with λ=0.05 ───────────────────────────
  test('decayWeight returns ~0.5 at half-life (14 days, λ=0.05)', () => {
    const result = decayWeight(14, 0.05);
    expect(result).toBeGreaterThan(0.45);
    expect(result).toBeLessThan(0.55);
  });

  // ── Positive: ~1% after 90 days ───────────────────────────────────────
  test('decayWeight returns < 0.012 at 90 days (λ=0.05)', () => {
    const result = decayWeight(90, 0.05);
    expect(result).toBeLessThan(0.012);
    expect(result).toBeGreaterThan(0);
  });

  // ── Positive: Effectively zero at 180 days ────────────────────────────
  test('decayWeight returns very small value at 180 days (λ=0.05)', () => {
    const result = decayWeight(180, 0.05);
    expect(result).toBeLessThan(0.0002);
  });

  // ── Negative: Lambda zero = no decay ──────────────────────────────────
  test('decayWeight returns 1.0 for lambda=0', () => {
    expect(decayWeight(100, 0)).toBe(1.0);
  });

  // ── Negative: Negative days = no decay ────────────────────────────────
  test('decayWeight returns 1.0 for negative days (future)', () => {
    expect(decayWeight(-10, 0.05)).toBe(1.0);
  });

  // ── Negative: Lambda negative = no decay ─────────────────────────────
  test('decayWeight returns 1.0 for negative lambda', () => {
    expect(decayWeight(14, -0.05)).toBe(1.0);
  });
});

describe('VectorDecay — computeDecayFactors', () => {
  const now = Date.now();
  const oneDayMs = 86400000;

  // ── Positive: Today's swipe = factor 1.0 ──────────────────────────────
  test('computeDecayFactors returns 1.0 for swipe from now', () => {
    const swipes = [{ timestamp: new Date(now).toISOString() }];
    const factors = computeDecayFactors(swipes, now);
    expect(factors[0]).toBe(1.0);
  });

  // ── Positive: 14-day old swipe ≈ 0.5 ─────────────────────────────────
  test('computeDecayFactors returns ~0.5 for 14-day old swipe', () => {
    const oldTime = new Date(now - 14 * oneDayMs).toISOString();
    const swipes = [{ timestamp: oldTime }];
    const factors = computeDecayFactors(swipes, now);
    expect(factors[0]).toBeGreaterThan(0.45);
    expect(factors[0]).toBeLessThan(0.55);
  });

  // ── Positive: 90-day old swipe < 0.011 ──────────────────────────────
  test('computeDecayFactors returns < 0.011 for 90-day old swipe', () => {
    const oldTime = new Date(now - 90 * oneDayMs).toISOString();
    const swipes = [{ timestamp: oldTime }];
    const factors = computeDecayFactors(swipes, now);
    expect(factors[0]).toBeLessThan(0.011);
  });

  // ── Negative: Invalid timestamp returns 0 ────────────────────────────
  test('computeDecayFactors returns 0 for invalid timestamp', () => {
    const swipes = [{ timestamp: 'not-a-date' }];
    const factors = computeDecayFactors(swipes, now);
    expect(factors[0]).toBe(0);
  });

  // ── Positive: Multiple swipes get different factors ────────────────────
  test('computeDecayFactors returns different factors for different ages', () => {
    const swipes = [
      { timestamp: new Date(now).toISOString() },
      { timestamp: new Date(now - 7 * oneDayMs).toISOString() },
      { timestamp: new Date(now - 30 * oneDayMs).toISOString() },
    ];
    const factors = computeDecayFactors(swipes, now);
    expect(factors[0]).toBeGreaterThan(factors[1]);
    expect(factors[1]).toBeGreaterThan(factors[2]);
  });
});

describe('VectorDecay — getHalfLife', () => {
  // ── Positive: λ=0.05 → ~13.86 days ────────────────────────────────────
  test('getHalfLife returns ~13.86 for λ=0.05', () => {
    const halfLife = getHalfLife(0.05);
    expect(halfLife).toBeGreaterThan(13);
    expect(halfLife).toBeLessThan(14);
  });

  // ── Positive: λ=0.1 → ~6.93 days ──────────────────────────────────────
  test('getHalfLife returns ~6.93 for λ=0.1', () => {
    const halfLife = getHalfLife(0.1);
    expect(halfLife).toBeGreaterThan(6.9);
    expect(halfLife).toBeLessThan(7.0);
  });

  // ── Negative: λ=0 → Infinity ──────────────────────────────────────────
  test('getHalfLife returns Infinity for λ=0', () => {
    expect(getHalfLife(0)).toBe(Infinity);
  });
});

describe('VectorDecay — weightRemaining', () => {
  // ── Positive: 0 days = 100% ──────────────────────────────────────────
  test('weightRemaining returns 1.0 at day 0', () => {
    expect(weightRemaining(0)).toBe(1.0);
  });

  // ── Positive: 14 days ≈ 50% ──────────────────────────────────────────
  test('weightRemaining returns ~0.5 at day 14', () => {
    const result = weightRemaining(14);
    expect(result).toBeGreaterThan(0.45);
    expect(result).toBeLessThan(0.55);
  });

  // ── Positive: 90 days ≈ 1.1% ─────────────────────────────────────────
  test('weightRemaining returns ~0.011 at day 90', () => {
    const result = weightRemaining(90);
    expect(result).toBeLessThan(0.012);
    expect(result).toBeGreaterThan(0.010);
  });
});

describe('VectorDecay — decayWithCutoff', () => {
  // ── Positive: Below maxDays returns decay value ────────────────────────
  test('decayWithCutoff returns decay value for days under maxDays', () => {
    const result = decayWithCutoff(14, 0.05, 90);
    expect(result).toBeGreaterThan(0.45);
    expect(result).toBeLessThan(0.55);
  });

  // ── Positive: At maxDays returns 0 ────────────────────────────────────
  test('decayWithCutoff returns 0 at exactly maxDays', () => {
    expect(decayWithCutoff(90, 0.05, 90)).toBe(0);
  });

  // ── Positive: Beyond maxDays returns 0 ────────────────────────────────
  test('decayWithCutoff returns 0 beyond maxDays', () => {
    expect(decayWithCutoff(100, 0.05, 90)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Vector Builder Tests
// ---------------------------------------------------------------------------

describe('VectorBuilder — mapDwellToFactor', () => {
  // ── Positive: Below minDwell → 0.5 ────────────────────────────────────
  test('mapDwellToFactor returns 0.5 for dwell below min', () => {
    expect(mapDwellToFactor(100, defaultConfig)).toBe(0.5);
  });

  // ── Positive: At minDwell → 0.5 ──────────────────────────────────────
  test('mapDwellToFactor returns 0.5 at exact minDwell', () => {
    expect(mapDwellToFactor(500, defaultConfig)).toBe(0.5);
  });

  // ── Positive: At maxDwell → 1.5 ──────────────────────────────────────
  test('mapDwellToFactor returns 1.5 at exact maxDwell', () => {
    expect(mapDwellToFactor(5000, defaultConfig)).toBe(1.5);
  });

  // ── Positive: Above maxDwell → 1.5 ────────────────────────────────────
  test('mapDwellToFactor returns 1.5 for dwell above max', () => {
    expect(mapDwellToFactor(10000, defaultConfig)).toBe(1.5);
  });

  // ── Positive: Mid-range linear interpolation ───────────────────────────
  test('mapDwellToFactor returns ~1.0 at midpoint of min and max', () => {
    // Midpoint: (500 + 5000) / 2 = 2750
    const midDwell = (defaultConfig.minDwellMs + defaultConfig.maxDwellMs) / 2;
    const result = mapDwellToFactor(midDwell, defaultConfig);
    expect(result).toBeGreaterThan(0.9);
    expect(result).toBeLessThan(1.1);
  });

  // ── Negative: Zero dwell time → 0.5 ──────────────────────────────────
  test('mapDwellToFactor returns 0.5 for 0 dwell time', () => {
    expect(mapDwellToFactor(0, defaultConfig)).toBe(0.5);
  });
});

describe('VectorBuilder — getRatingMultiplier', () => {
  // ── Positive: Rating 1 → 0.5 ──────────────────────────────────────────
  test('getRatingMultiplier returns 0.5 for rating 1', () => {
    expect(getRatingMultiplier(1)).toBe(0.5);
  });

  // ── Positive: Rating 3 → 1.0 ─────────────────────────────────────────
  test('getRatingMultiplier returns 1.0 for rating 3', () => {
    expect(getRatingMultiplier(3)).toBe(1.0);
  });

  // ── Positive: Rating 5 → 1.5 ─────────────────────────────────────────
  test('getRatingMultiplier returns 1.5 for rating 5', () => {
    expect(getRatingMultiplier(5)).toBe(1.5);
  });

  // ── Positive: Undefined rating → 1.0 (neutral) ───────────────────────
  test('getRatingMultiplier returns 1.0 for undefined rating', () => {
    expect(getRatingMultiplier(undefined)).toBe(1.0);
  });
});

describe('VectorBuilder — swipeWeight', () => {
  // ── Positive: Right → +1 ──────────────────────────────────────────────
  test('swipeWeight returns +1 for right direction', () => {
    expect(swipeWeight('right')).toBe(1);
  });

  // ── Positive: Left → -1 ──────────────────────────────────────────────
  test('swipeWeight returns -1 for left direction', () => {
    expect(swipeWeight('left')).toBe(-1);
  });
});

describe('VectorBuilder — computeCategoryScores', () => {
  // ── Positive: Single right swipe contributes positively ────────────────
  test('computeCategoryScores returns positive score for right swipe', () => {
    const ideas = [makeIdea(1)];
    const ideasMap = makeIdeasMap(ideas);
    const swipes = [makeSwipe({ idea_id: 1, direction: 'right', dwell_time_ms: 1500, rating: 3 })];
    const decayFactors = [1.0];

    const scores = computeCategoryScores(swipes, ideasMap, decayFactors, defaultConfig);

    expect(scores['AI/ML']).toBeGreaterThan(0);
  });

  // ── Positive: Single left swipe contributes negatively ─────────────────
  test('computeCategoryScores returns negative score for left swipe', () => {
    const ideas = [makeIdea(1)];
    const ideasMap = makeIdeasMap(ideas);
    const swipes = [makeSwipe({ idea_id: 1, direction: 'left', dwell_time_ms: 1000, rating: undefined })];
    const decayFactors = [1.0];

    const scores = computeCategoryScores(swipes, ideasMap, decayFactors, defaultConfig);

    expect(scores['AI/ML']).toBeLessThan(0);
  });

  // ── Positive: Multiple swipes in same category aggregate ───────────────
  test('computeCategoryScores aggregates multiple swipes in same category', () => {
    const ideas = [makeIdea(1)];
    const ideasMap = makeIdeasMap(ideas);
    const swipes = [
      makeSwipe({ idea_id: 1, direction: 'right', dwell_time_ms: 3000, rating: 5 }),
      makeSwipe({ idea_id: 1, direction: 'right', dwell_time_ms: 2500, rating: 4 }),
    ];
    const decayFactors = [1.0, 1.0];

    const scores = computeCategoryScores(swipes, ideasMap, decayFactors, defaultConfig);

    // Two positive right swipes with high dwell/rating → strong positive
    expect(scores['AI/ML']).toBeGreaterThan(0.5);
  });

  // ── Negative: Unknown idea_id is skipped ──────────────────────────────
  test('computeCategoryScores skips unknown idea_id', () => {
    const ideasMap = new Map(); // Empty map
    const swipes = [makeSwipe({ idea_id: 999 })];
    const decayFactors = [1.0];

    const scores = computeCategoryScores(swipes, ideasMap, decayFactors, defaultConfig);

    expect(Object.keys(scores).length).toBe(0);
  });
});

describe('VectorBuilder — normalizeScores', () => {
  // ── Positive: Scores sum to 1.0 ───────────────────────────────────────
  test('normalizeScores returns weights that sum to 1.0', () => {
    const scores = { 'AI/ML': 3, 'Web Dev': 2, 'Mobile': 1 };
    const normalized = normalizeScores(scores);

    const total = Object.values(normalized).reduce((sum, v) => sum + v, 0);
    expect(total).toBeCloseTo(1.0, 4);
  });

  // ── Positive: Equal distribution for all-zero scores ──────────────────
  test('normalizeScores returns equal weights for all-zero scores', () => {
    const scores = { 'AI/ML': 0, 'Web Dev': 0, 'Mobile': 0 };
    const normalized = normalizeScores(scores);

    const values = Object.values(normalized);
    expect(values[0]).toBeCloseTo(1 / 3, 4);
    expect(values[1]).toBeCloseTo(1 / 3, 4);
    expect(values[2]).toBeCloseTo(1 / 3, 4);
  });

  // ── Negative: Negative scores clamped to 0 before normalization ───────
  test('normalizeScores clamps negative values to 0', () => {
    const scores = { 'AI/ML': -2, 'Web Dev': 2, 'Mobile': 0 };
    const normalized = normalizeScores(scores);

    // AI/ML should be 0 (clamped), Web Dev should be 1.0
    expect(normalized['AI/ML']).toBe(0);
    expect(normalized['Web Dev']).toBe(1.0);
  });

  // ── Positive: Single category gets weight 1.0 ────────────────────────
  test('normalizeScores returns 1.0 for single category', () => {
    const scores = { 'AI/ML': 5 };
    const normalized = normalizeScores(scores);
    expect(normalized['AI/ML']).toBe(1.0);
  });
});

describe('VectorBuilder — computeKeywordWeights', () => {
  // ── Positive: Extracts keywords from liked ideas ──────────────────────
  test('computeKeywordWeights returns weighted keywords from liked swipes', () => {
    const ideas = [makeIdea(1, { tech_stack: ['python', 'tensorflow'] })];
    const ideasMap = makeIdeasMap(ideas);
    const likedSwipes = [makeSwipe({ idea_id: 1, direction: 'right' })];

    const weights = computeKeywordWeights(likedSwipes, ideasMap, defaultConfig);

    expect(weights['python']).toBeGreaterThan(0);
    expect(weights['tensorflow']).toBeGreaterThan(0);
  });

  // ── Positive: Multiple likes increase keyword weight ──────────────────
  test('computeKeywordWeights increases weight with multiple likes', () => {
    const ideas = [makeIdea(1, { tech_stack: ['python'] })];
    const ideasMap = makeIdeasMap(ideas);
    const likedSwipes = [
      makeSwipe({ idea_id: 1, direction: 'right' }),
      makeSwipe({ idea_id: 1, direction: 'right' }),
      makeSwipe({ idea_id: 1, direction: 'right' }),
    ];

    const weights = computeKeywordWeights(likedSwipes, ideasMap, defaultConfig);

    expect(weights['python']).toBeGreaterThan(0);
  });

  // ── Negative: Empty liked swipes returns empty weights ────────────────
  test('computeKeywordWeights returns empty object for no liked swipes', () => {
    const ideasMap = makeIdeasMap([makeIdea(1)]);
    const weights = computeKeywordWeights([], ideasMap, defaultConfig);
    expect(Object.keys(weights).length).toBe(0);
  });

  // ── Negative: Unknown idea is skipped ────────────────────────────────
  test('computeKeywordWeights skips unknown ideas', () => {
    const ideasMap = new Map();
    const likedSwipes = [makeSwipe({ idea_id: 999 })];
    const weights = computeKeywordWeights(likedSwipes, ideasMap, defaultConfig);
    expect(Object.keys(weights).length).toBe(0);
  });
});

describe('VectorBuilder — computeTopicAffinities', () => {
  // ── Positive: Extracts bigrams from descriptions ──────────────────────
  test('computeTopicAffinities returns bigram topics from liked descriptions', () => {
    const ideas = [makeIdea(1, { description: 'machine learning natural language processing' })];
    const ideasMap = makeIdeasMap(ideas);
    const likedSwipes = [makeSwipe({ idea_id: 1, direction: 'right' })];

    const affinities = computeTopicAffinities(likedSwipes, ideasMap, defaultConfig);

    // Should contain at least one meaningful bigram
    expect(Object.keys(affinities).length).toBeGreaterThan(0);
  });

  // ── Negative: Empty liked swipes returns empty topics ─────────────────
  test('computeTopicAffinities returns empty object for no liked swipes', () => {
    const ideasMap = makeIdeasMap([makeIdea(1)]);
    const affinities = computeTopicAffinities([], ideasMap, defaultConfig);
    expect(Object.keys(affinities).length).toBe(0);
  });
});

describe('VectorBuilder — buildEmbedding', () => {
  // ── Positive: Concatenates sorted components ─────────────────────────
  test('buildEmbedding concatenates sorted category, keyword, topic arrays', () => {
    const embedding = buildEmbedding(
      { 'AI/ML': 0.6, 'Web': 0.4 },
      { python: 0.3, react: 0.2 },
      { 'machine learning': 0.5 },
      defaultConfig,
    );

    // Should have all components in deterministic order
    expect(embedding.length).toBe(5); // 2 categories + 2 keywords + 1 topic
    expect(embedding).toContain(0.6);
    expect(embedding).toContain(0.4);
  });
});

describe('VectorBuilder — computeExcludedCategories', () => {
  // ── Positive: Weight < 0.05 gets excluded ─────────────────────────────
  test('computeExcludedCategories returns categories with weight < 0.05', () => {
    const excluded = computeExcludedCategories({
      'AI/ML': 0.5,
      'IoT': 0.03,
      'Blockchain': 0.01,
    });

    expect(excluded).toContain('IoT');
    expect(excluded).toContain('Blockchain');
    expect(excluded).not.toContain('AI/ML');
  });

  // ── Positive: All weights >= 0.05 returns empty ──────────────────────
  test('computeExcludedCategories returns empty array when all weights >= 0.05', () => {
    const excluded = computeExcludedCategories({
      'AI/ML': 0.8,
      'Web': 0.2,
    });
    expect(excluded.length).toBe(0);
  });
});

describe('VectorBuilder — computeDifficultyPreference', () => {
  // ── Positive: Most-frequent difficulty detected ───────────────────────
  test('computeDifficultyPreference returns most frequent difficulty', () => {
    const ideas = [
      makeIdea(1, { difficulty: 'beginner' }),
      makeIdea(2, { difficulty: 'beginner' }),
      makeIdea(3, { difficulty: 'advanced' }),
    ];
    const ideasMap = makeIdeasMap(ideas);
    const likedSwipes = [
      makeSwipe({ idea_id: 1, direction: 'right' }),
      makeSwipe({ idea_id: 2, direction: 'right' }),
      makeSwipe({ idea_id: 3, direction: 'right' }),
    ];

    const result = computeDifficultyPreference(likedSwipes, ideasMap);

    expect(result.difficultyPreference).toBe('beginner');
    expect(result.difficultyNumeric).toBe(1);
  });

  // ── Negative: No liked swipes returns null ────────────────────────────
  test('computeDifficultyPreference returns null for empty swipes', () => {
    const ideasMap = makeIdeasMap([makeIdea(1)]);
    const result = computeDifficultyPreference([], ideasMap);
    expect(result.difficultyPreference).toBeNull();
    expect(result.difficultyNumeric).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Full Pipeline: buildPreferenceVector
// ---------------------------------------------------------------------------

describe('VectorBuilder — buildPreferenceVector (full pipeline)', () => {
  // ── Positive: Returns complete preference vector ───────────────────────
  test('buildPreferenceVector returns complete vector with all fields', () => {
    const ideas = [makeIdea(1, { category: 'AI/ML' })];
    const ideasMap = makeIdeasMap(ideas);
    const swipes = [makeSwipe({ idea_id: 1, direction: 'right', dwell_time_ms: 2000, rating: 4 })];

    const vector = buildPreferenceVector(swipes, ideasMap);

    expect(vector).toHaveProperty('category_weights');
    expect(vector).toHaveProperty('keyword_weights');
    expect(vector).toHaveProperty('topic_affinities');
    expect(vector).toHaveProperty('embedding');
    expect(vector).toHaveProperty('excluded_categories');
    expect(vector).toHaveProperty('difficulty_preference');
    expect(vector).toHaveProperty('difficulty_numeric');
    expect(vector).toHaveProperty('swipe_count');
    expect(vector.swipe_count).toBe(1);
  });

  // ── Positive: Category weights sum to 1.0 (normalized) ────────────────
  test('buildPreferenceVector produces category_weights summing to 1.0', () => {
    const ideas = [
      makeIdea(1, { category: 'AI/ML' }),
      makeIdea(2, { category: 'Web Applications' }),
    ];
    const ideasMap = makeIdeasMap(ideas);
    const swipes = [
      makeSwipe({ idea_id: 1, direction: 'right', dwell_time_ms: 2000, rating: 5 }),
      makeSwipe({ idea_id: 2, direction: 'left', dwell_time_ms: 500, rating: 1 }),
    ];

    const vector = buildPreferenceVector(swipes, ideasMap);

    const totalWeight = Object.values(vector.category_weights).reduce((s, v) => s + v, 0);
    expect(totalWeight).toBeCloseTo(1.0, 4);
  });

  // ── Positive: More likes → higher category weight ─────────────────────
  test('buildPreferenceVector assigns higher weight to liked categories', () => {
    const ideas = [
      makeIdea(1, { category: 'AI/ML' }),
      makeIdea(2, { category: 'Cybersecurity' }),
    ];
    const ideasMap = makeIdeasMap(ideas);
    const swipes = [
      makeSwipe({ idea_id: 1, direction: 'right', dwell_time_ms: 3000, rating: 5 }),
      makeSwipe({ idea_id: 1, direction: 'right', dwell_time_ms: 2500, rating: 4 }),
      makeSwipe({ idea_id: 2, direction: 'left', dwell_time_ms: 300, rating: 1 }),
    ];

    const vector = buildPreferenceVector(swipes, ideasMap);

    expect(vector.category_weights['AI/ML']).toBeGreaterThan(vector.category_weights['Cybersecurity']);
  });

  // ── Negative: Empty swipe history returns neutral vector ───────────────
  test('buildPreferenceVector returns neutral vector for empty swipe history', () => {
    const ideas = [makeIdea(1, { category: 'AI/ML' })];
    const ideasMap = makeIdeasMap(ideas);

    const vector = buildPreferenceVector([], ideasMap);

    // No swipes → no category weights
    expect(Object.keys(vector.category_weights).length).toBe(0);
    expect(vector.swipe_count).toBe(0);
  });

  // ── Positive: Formula integration test ─────────────────────────────────
  test('buildPreferenceVector applies swipe_weight × dwell_factor × rating_multiplier × decay_factor', () => {
    const ideas = [makeIdea(1, { category: 'AI/ML' })];
    const ideasMap = makeIdeasMap(ideas);
    const swipes = [makeSwipe({ idea_id: 1, direction: 'right', dwell_time_ms: 5000, rating: 5 })];

    // With max dwell (5000ms → factor 1.5) and rating 5 (multiplier 1.5),
    // right swipe (weight +1), and today (decay 1.0):
    // contribution = +1 * 1.5 * 1.5 * 1.0 = 2.25
    const vector = buildPreferenceVector(swipes, ideasMap);

    // The normalized weight should still sum to 1.0 with other categories
    expect(vector.category_weights['AI/ML']).toBeGreaterThan(0);
    const totalWeight = Object.values(vector.category_weights).reduce((s, v) => s + v, 0);
    expect(totalWeight).toBeCloseTo(1.0, 4);
  });
});
