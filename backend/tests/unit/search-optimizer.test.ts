/**
 * Unit tests: SearchOptimizerService and Parameter Generator
 *
 * Coverage targets:
 * - Narrow/Broad/Trending strategies
 * - Strategy cycling
 * - Preference-to-parameter conversion
 * - Global filters (embedded systems keyword stripping)
 */

import { generateParams, generateQueryVariants, validateNoEmbeddedSystems } from '../../src/services/feedback/parameter-generator';
import { buildNarrowParams, validateNarrowParams } from '../../src/services/feedback/query-strategies/narrow.strategy';
import { buildBroadParams, validateBroadParams } from '../../src/services/feedback/query-strategies/broad.strategy';
import { buildTrendingParams, validateTrendingParams } from '../../src/services/feedback/query-strategies/trending.strategy';
import { SearchOptimizerService } from '../../src/services/feedback/search-optimizer.service';
import type { FeedbackSignals, StrategyType } from '../../src/types/search-params.types';
import { DEFAULT_OPTIMIZER_CONFIG } from '../../src/types/search-params.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTestSignals(overrides: Partial<FeedbackSignals> = {}): FeedbackSignals {
  return {
    topLikedCategories: [
      { category: 'AI/ML', affinity: 0.9 },
      { category: 'Web Applications', affinity: 0.75 },
      { category: 'Mobile Apps', affinity: 0.6 },
    ],
    dislikedCategories: ['Embedded Systems', 'IoT Hardware'],
    positivelyRatedCategories: [
      { category: 'AI/ML', rightRatio: 0.85 },
      { category: 'Web Applications', rightRatio: 0.7 },
      { category: 'Mobile Apps', rightRatio: 0.55 },
      { category: 'Cloud/DevOps', rightRatio: 0.45 },
    ],
    trendingKeywords: ['machine learning', 'react', 'python', 'tensorflow', 'typescript'],
    aiRecommendations: ['neural network', 'deep learning'],
    difficultyPreference: 'intermediate',
    difficultyNumeric: 2,
    swipeCount: 25,
    lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test Suite: Narrow Strategy
// ---------------------------------------------------------------------------

describe('Search Optimizer — Narrow Strategy', () => {
  test('buildNarrowParams takes top N liked categories', () => {
    // Arrange
    const signals = makeTestSignals();

    // Act
    const params = buildNarrowParams(signals, { narrowTopCategoryCount: 2 });

    // Assert
    expect(params.categories).toContain('AI/ML');
    expect(params.categories).toContain('Web Applications');
    expect(params.categories).not.toContain('Mobile Apps'); // 3rd, outside top 2
    expect(params.strategy).toBe('narrow');
  });

  test('buildNarrowParams uses default narrowTopCategoryCount from config', () => {
    const signals = makeTestSignals();
    const params = buildNarrowParams(signals);

    // Default is 3, so should include top 3
    expect(params.categories.length).toBeLessThanOrEqual(3);
  });

  test('buildNarrowParams includes trending keywords', () => {
    const signals = makeTestSignals();
    const params = buildNarrowParams(signals);

    expect(params.techKeywords.length).toBeGreaterThan(0);
    for (const kw of signals.trendingKeywords.slice(0, 3)) {
      expect(params.techKeywords).toContain(kw);
    }
  });

  test('buildNarrowParams excludes disliked categories + hard excluded', () => {
    const signals = makeTestSignals();
    const params = buildNarrowParams(signals, {
      hardExcludedCategories: ['Embedded Systems', 'Hardware'],
    });

    expect(params.excludeCategories).toContain('Embedded Systems');
    expect(params.excludeCategories).toContain('Hardware');
  });

  test('buildNarrowParams maps difficulty preference to numeric range', () => {
    const signals = makeTestSignals({ difficultyNumeric: 2 });
    const params = buildNarrowParams(signals);

    expect(params.minDifficulty).toBe(2);
    expect(params.maxDifficulty).toBe(2);
  });

  test('validateNarrowParams returns true when categories present', () => {
    const validParams = buildNarrowParams(makeTestSignals());
    expect(validateNarrowParams(validParams)).toBe(true);
  });

  test('validateNarrowParams returns false when no categories', () => {
    const emptySignals = makeTestSignals({ topLikedCategories: [] });
    const params = buildNarrowParams(emptySignals);
    expect(validateNarrowParams(params)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Broad Strategy
// ---------------------------------------------------------------------------

describe('Search Optimizer — Broad Strategy', () => {
  test('buildBroadParams includes all positively rated categories above threshold', () => {
    // Arrange
    const signals = makeTestSignals();
    // positivelyRatedCategories have rightRatio: 0.85, 0.7, 0.55, 0.45
    // Default threshold is 0.4

    // Act
    const params = buildBroadParams(signals);

    // Assert
    expect(params.categories).toContain('AI/ML');
    expect(params.categories).toContain('Web Applications');
    expect(params.categories).toContain('Mobile Apps');
    expect(params.categories).toContain('Cloud/DevOps'); // 0.45 > 0.4
    expect(params.strategy).toBe('broad');
  });

  test('buildBroadParams respects broadPositiveThreshold override', () => {
    const signals = makeTestSignals();

    // With higher threshold (0.6), only categories >= 0.6 should be included
    // 0.85, 0.7 pass; 0.55, 0.45 fail
    const params = buildBroadParams(signals, { broadPositiveThreshold: 0.6 });

    expect(params.categories).toContain('AI/ML');
    expect(params.categories).toContain('Web Applications');
    expect(params.categories).not.toContain('Cloud/DevOps'); // 0.45 < 0.6
  });

  test('buildBroadParams expands keywords with expansion terms', () => {
    const signals = makeTestSignals();
    const params = buildBroadParams(signals);

    // Should include trending + AI recommendations + expansion terms
    expect(params.techKeywords.length).toBeGreaterThan(signals.trendingKeywords.length);
  });

  test('buildBroadParams only excludes hard-excluded categories (not disliked)', () => {
    // Broad strategy is exploratory — it doesn't exclude user-disliked categories
    const signals = makeTestSignals({
      dislikedCategories: ['Category X', 'Category Y'],
    });

    const params = buildBroadParams(signals, {
      hardExcludedCategories: ['Embedded Systems'],
    });

    // Only hard-excluded should be in excludeCategories
    expect(params.excludeCategories).toContain('Embedded Systems');
    expect(params.excludeCategories).not.toContain('Category X');
  });

  test('buildBroadParams removes difficulty filter for broadest results', () => {
    const signals = makeTestSignals({ difficultyNumeric: 2 });
    const params = buildBroadParams(signals);

    // Broad strategy should NOT have difficulty constraints
    expect(params.minDifficulty).toBeNull();
    expect(params.maxDifficulty).toBeNull();
  });

  test('validateBroadParams returns true with categories or keywords', () => {
    const signals = makeTestSignals();
    const params = buildBroadParams(signals);
    expect(validateBroadParams(params)).toBe(true);
  });

  test('validateBroadParams returns true with keywords only', () => {
    const signals = makeTestSignals({
      positivelyRatedCategories: [],
      trendingKeywords: ['react', 'python'],
    });
    const params = buildBroadParams(signals);
    expect(validateBroadParams(params)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Trending Strategy
// ---------------------------------------------------------------------------

describe('Search Optimizer — Trending Strategy', () => {
  test('buildTrendingParams focuses on keywords over categories', () => {
    const signals = makeTestSignals();
    const params = buildTrendingParams(signals);

    expect(params.techKeywords.length).toBeGreaterThan(0);
    expect(params.strategy).toBe('trending');
  });

  test('buildTrendingParams sets minRecency to 7 days ago', () => {
    const signals = makeTestSignals();
    const params = buildTrendingParams(signals);

    expect(params.minRecency).toBeInstanceOf(Date);

    // Should be roughly 7 days ago
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const diffMs = Math.abs(params.minRecency!.getTime() - sevenDaysAgo.getTime());
    expect(diffMs).toBeLessThan(1000); // Within 1 second
  });

  test('buildTrendingParams applies difficulty preference if available', () => {
    const signalsWithDiff = makeTestSignals({ difficultyNumeric: 2 });
    const paramsWithDiff = buildTrendingParams(signalsWithDiff);
    expect(paramsWithDiff.minDifficulty).toBe(2);
    expect(paramsWithDiff.maxDifficulty).toBe(2);

    const signalsNoDiff = makeTestSignals({
      difficultyNumeric: null,
      difficultyPreference: null,
    });
    const paramsNoDiff = buildTrendingParams(signalsNoDiff);
    expect(paramsNoDiff.minDifficulty).toBeNull();
  });

  test('validateTrendingParams returns true with keywords', () => {
    const signals = makeTestSignals();
    const params = buildTrendingParams(signals);
    expect(validateTrendingParams(params)).toBe(true);
  });

  test('validateTrendingParams returns false without keywords', () => {
    const signals = makeTestSignals({
      trendingKeywords: [],
      aiRecommendations: [],
    });
    const params = buildTrendingParams(signals);
    expect(validateTrendingParams(params)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Strategy Comparison
// ---------------------------------------------------------------------------

describe('Search Optimizer — Strategy Differences', () => {
  test('Narrow vs Broad: Narrow excludes disliked categories, Broad does not', () => {
    const signals = makeTestSignals({
      dislikedCategories: ['Category A', 'Category B'],
    });

    const narrowParams = buildNarrowParams(signals);
    const broadParams = buildBroadParams(signals);

    // Narrow includes disliked in exclude
    const narrowExcludes = narrowParams.excludeCategories;
    const broadExcludes = broadParams.excludeCategories;

    // Narrow should have more exclusions (user-disliked)
    expect(narrowExcludes.length).toBeGreaterThanOrEqual(broadExcludes.length);
  });

  test('Narrow vs Broad: Narrow has difficulty constraints, Broad does not', () => {
    const signals = makeTestSignals({ difficultyNumeric: 2 });

    const narrowParams = buildNarrowParams(signals);
    const broadParams = buildBroadParams(signals);

    expect(narrowParams.minDifficulty).toBe(2);
    expect(broadParams.minDifficulty).toBeNull();
  });

  test('Trending vs others: only Trending has minRecency set', () => {
    const signals = makeTestSignals();

    const narrowParams = buildNarrowParams(signals);
    const broadParams = buildBroadParams(signals);
    const trendingParams = buildTrendingParams(signals);

    expect(narrowParams.minRecency).toBeNull();
    expect(broadParams.minRecency).toBeNull();
    expect(trendingParams.minRecency).toBeInstanceOf(Date);
  });

  test('All strategies have correct strategy field', () => {
    const signals = makeTestSignals();

    expect(buildNarrowParams(signals).strategy).toBe('narrow');
    expect(buildBroadParams(signals).strategy).toBe('broad');
    expect(buildTrendingParams(signals).strategy).toBe('trending');
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Strategy Cycling (Parameter Generator)
// ---------------------------------------------------------------------------

describe('Search Optimizer — Strategy Cycling', () => {
  test('generateParams cycles through strategyCycle', () => {
    const signals = makeTestSignals();
    const cycle = DEFAULT_OPTIMIZER_CONFIG.strategyCycle; // ['narrow', 'broad', 'trending']

    // Position 0 → narrow
    const p0 = generateParams(signals, 0);
    expect(p0.strategy).toBe('narrow');

    // Position 1 → broad
    const p1 = generateParams(signals, 1);
    expect(p1.strategy).toBe('broad');

    // Position 2 → trending
    const p2 = generateParams(signals, 2);
    expect(p2.strategy).toBe('trending');

    // Position 3 → wraps to narrow (3 % 3 = 0)
    const p3 = generateParams(signals, 3);
    expect(p3.strategy).toBe('narrow');
  });

  test('generateQueryVariants produces multiple variants with different strategies', () => {
    const signals = makeTestSignals();

    // Generate 3 variants starting at position 0
    const variants = generateQueryVariants(signals, 0, 3);

    expect(variants.length).toBe(3);
    expect(variants[0].strategy).toBe('narrow');
    expect(variants[1].strategy).toBe('broad');
    expect(variants[2].strategy).toBe('trending');
  });

  test('generateQueryVariants respects startPosition offset', () => {
    const signals = makeTestSignals();

    // Start at position 1 (broad)
    const variants = generateQueryVariants(signals, 1, 3);

    expect(variants[0].strategy).toBe('broad');
    expect(variants[1].strategy).toBe('trending');
    expect(variants[2].strategy).toBe('narrow'); // wraps around
  });

  test('generateQueryVariants clamps count between 1 and 5', () => {
    const signals = makeTestSignals();

    const tooMany = generateQueryVariants(signals, 0, 10);
    expect(tooMany.length).toBe(5); // Clamped to max 5

    const tooFew = generateQueryVariants(signals, 0, 0);
    expect(tooFew.length).toBe(1); // Clamped to min 1
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Global Filters (Embedded Systems Keyword Stripping)
// ---------------------------------------------------------------------------

describe('Search Optimizer — Global Filters', () => {
  test('generateParams strips embedded systems keywords from techKeywords', () => {
    const signals = makeTestSignals({
      trendingKeywords: ['react', 'embedded', 'python', 'arduino', 'typescript'],
    });

    const result = generateParams(signals, 0);

    // Embedded and arduino should be filtered out
    expect(result.params.techKeywords).not.toContain('embedded');
    expect(result.params.techKeywords).not.toContain('arduino');
    // But others should remain
    expect(result.params.techKeywords).toContain('react');
    expect(result.params.techKeywords).toContain('python');
  });

  test('validateNoEmbeddedSystems returns false when params contain embedded keywords', () => {
    // Need to bypass the generator's filtering to test the validator
    // We'll call it directly

    // Create params that WOULD contain embedded keywords (if not filtered)
    const badParams = {
      techKeywords: ['react', 'embedded systems', 'python'],
      categories: ['Web Applications'],
      excludeCategories: [],
      minDifficulty: null,
      maxDifficulty: null,
      minRecency: null,
      source: 'both' as const,
      strategy: 'narrow' as StrategyType,
    };

    expect(validateNoEmbeddedSystems(badParams)).toBe(false);
  });

  test('validateNoEmbeddedSystems returns true for clean params', () => {
    const cleanParams = {
      techKeywords: ['react', 'python', 'typescript'],
      categories: ['Web Applications'],
      excludeCategories: [],
      minDifficulty: null,
      maxDifficulty: null,
      minRecency: null,
      source: 'both' as const,
      strategy: 'narrow' as StrategyType,
    };

    expect(validateNoEmbeddedSystems(cleanParams)).toBe(true);
  });

  test('global blocked keywords in parameter-generator match config intent', () => {
    // The GLOBAL_BLOCKED_KEYWORDS in parameter-generator are:
    // 'embedded', 'microcontroller', 'arduino', 'esp32', 'esp8266',
    // 'raspberry pi', 'fpga', 'vhdl', 'verilog', 'firmware', 'rtos',
    // 'circuit design', 'pcb', 'stm32', 'nrf52', 'keil', 'mplab'

    // Verify that generated params never contain these
    const signals = makeTestSignals({
      trendingKeywords: [
        'javascript', 'embedded', 'react', 'arduino',
        'node.js', 'esp32', 'python', 'firmware',
      ],
    });

    const result = generateParams(signals, 0);

    const blockedSubstrings = [
      'embedded', 'microcontroller', 'arduino', 'esp32', 'esp8266',
      'raspberry', 'fpga', 'vhdl', 'verilog', 'firmware', 'rtos',
      'pcb', 'stm32', 'nrf52', 'keil', 'mplab',
    ];

    for (const kw of result.params.techKeywords) {
      for (const blocked of blockedSubstrings) {
        expect(kw.toLowerCase()).not.toContain(blocked);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Test Suite: SearchOptimizerService Class
// ---------------------------------------------------------------------------

describe('SearchOptimizerService — Class Behavior', () => {
  let optimizer: SearchOptimizerService;

  beforeEach(() => {
    optimizer = new SearchOptimizerService();
  });

  afterEach(() => {
    optimizer.dispose();
  });

  test('getConfig returns current configuration', () => {
    const config = optimizer.getConfig();
    expect(config.queryVariantCount).toBeDefined();
    expect(config.strategyCycle).toBeDefined();
  });

  test('getCyclePosition starts at 0', () => {
    expect(optimizer.getCyclePosition()).toBe(0);
  });

  test('getStrategyRatios starts with zero counts', () => {
    const ratios = optimizer.getStrategyRatios();
    expect(ratios.narrow.likes).toBe(0);
    expect(ratios.narrow.total).toBe(0);
    expect(ratios.broad.likes).toBe(0);
    expect(ratios.trending.likes).toBe(0);
  });

  test('reset clears all state', async () => {
    // First generate some queries to change state
    await optimizer.triggerOptimize();
    const posBefore = optimizer.getCyclePosition();
    expect(posBefore).toBeGreaterThan(0);

    // Reset
    optimizer.reset();

    // Verify reset
    expect(optimizer.getCyclePosition()).toBe(0);
    expect(optimizer.getQueryLog().length).toBe(0);
    expect(optimizer.getStrategyRatios().narrow.total).toBe(0);
  });

  test('updateConfig modifies configuration', () => {
    const originalConfig = optimizer.getConfig();

    optimizer.updateConfig({ queryVariantCount: 5 });

    const newConfig = optimizer.getConfig();
    expect(newConfig.queryVariantCount).toBe(5);
    expect(originalConfig.queryVariantCount).not.toBe(5);
  });

  test('triggerOptimize generates query variants', async () => {
    const variants = await optimizer.triggerOptimize();

    expect(variants.length).toBeGreaterThan(0);
    expect(variants[0].strategy).toBeDefined();
    expect(variants[0].params).toBeDefined();
  });

  test('triggerOptimize advances cycle position', async () => {
    const before = optimizer.getCyclePosition();

    await optimizer.triggerOptimize();

    const after = optimizer.getCyclePosition();
    expect(after).toBeGreaterThan(before);
  });

  test('setCrawlRequestHandler registers handler called on optimize', async () => {
    let handlerCalled = false;
    let receivedParams: unknown = null;

    optimizer.setCrawlRequestHandler(async (params) => {
      handlerCalled = true;
      receivedParams = params;
    });

    await optimizer.triggerOptimize();

    expect(handlerCalled).toBe(true);
    expect(Array.isArray(receivedParams)).toBe(true);
  });

  test('recordFeedback updates strategy ratios', async () => {
    // First generate some queries to get query IDs
    await optimizer.triggerOptimize();
    const log = optimizer.getQueryLog();
    expect(log.length).toBeGreaterThan(0);

    const queryId = log[0].id;
    const strategy = log[0].strategy;

    const ratiosBefore = optimizer.getStrategyRatios();
    const beforeTotal = ratiosBefore[strategy].total;

    // Record a like
    optimizer.recordFeedback(queryId, true);

    const ratiosAfter = optimizer.getStrategyRatios();
    expect(ratiosAfter[strategy].total).toBe(beforeTotal + 1);
    expect(ratiosAfter[strategy].likes).toBe(1);
    expect(ratiosAfter[strategy].ratio).toBe(1.0);
  });

  test('recordFeedback handles unknown queryId gracefully', () => {
    // This should not throw
    optimizer.recordFeedback('non_existent_id', true);

    // Ratios should remain unchanged
    const ratios = optimizer.getStrategyRatios();
    expect(ratios.narrow.total).toBe(0);
    expect(ratios.broad.total).toBe(0);
    expect(ratios.trending.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Preference-to-Parameter Conversion
// ---------------------------------------------------------------------------

describe('Search Optimizer — Preference to Parameter Conversion', () => {
  test('topLikedCategories maps to categories in narrow strategy', () => {
    const signals = makeTestSignals({
      topLikedCategories: [
        { category: 'Custom Category A', affinity: 0.9 },
        { category: 'Custom Category B', affinity: 0.8 },
      ],
    });

    const params = buildNarrowParams(signals, { narrowTopCategoryCount: 2 });

    expect(params.categories).toContain('Custom Category A');
    expect(params.categories).toContain('Custom Category B');
  });

  test('difficultyNumeric maps to minDifficulty/maxDifficulty', () => {
    for (const difficulty of [1, 2, 3]) {
      const signals = makeTestSignals({ difficultyNumeric: difficulty });
      const params = buildNarrowParams(signals);

      expect(params.minDifficulty).toBe(difficulty);
      expect(params.maxDifficulty).toBe(difficulty);
    }
  });

  test('null difficultyNumeric results in null difficulty params', () => {
    const signals = makeTestSignals({
      difficultyNumeric: null,
      difficultyPreference: null,
    });
    const params = buildNarrowParams(signals);

    expect(params.minDifficulty).toBeNull();
    expect(params.maxDifficulty).toBeNull();
  });

  test('trendingKeywords maps to techKeywords in all strategies', () => {
    const testKeywords = ['unique_keyword_123', 'another_unique_456'];
    const signals = makeTestSignals({
      trendingKeywords: testKeywords,
    });

    const narrow = buildNarrowParams(signals);
    const broad = buildBroadParams(signals);
    const trending = buildTrendingParams(signals);

    for (const kw of testKeywords) {
      expect(narrow.techKeywords).toContain(kw);
      expect(broad.techKeywords).toContain(kw);
      expect(trending.techKeywords).toContain(kw);
    }
  });

  test('aiRecommendations are included in techKeywords', () => {
    const signals = makeTestSignals({
      aiRecommendations: ['special_ai_term', 'neural_advanced'],
      trendingKeywords: [],
    });

    const params = buildNarrowParams(signals);

    // AI recommendations should appear in the tech keywords
    const hasSpecialTerm = params.techKeywords.some(
      (kw) => kw.includes('special') || kw.includes('neural')
    );
    expect(hasSpecialTerm).toBe(true);
  });
});
