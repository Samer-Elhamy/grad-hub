/**
 * ParameterGenerator — Strategy composition and cycling engine
 *
 * Takes strategy output from narrow/broad/trending and produces
 * structured SearchParams. Cycles through strategies to prevent
 * predictable results and keep the feed diverse.
 *
 * Lifecycle:
 *   1. Input: FeedbackSignals (from Feedback Agent)
 *   2. Select: next strategy in the cycle
 *   3. Execute: strategy function → raw params
 *   4. Compose: apply global filters (embedded systems, etc.)
 *   5. Output: SearchParams ready for Deep Search Crawler
 */

import type {
  SearchParams,
  FeedbackSignals,
  StrategyType,
  OptimizerConfig,
  GeneratedParams,
} from '../../types/search-params.types';
import { DEFAULT_OPTIMIZER_CONFIG } from '../../types/search-params.types';
import { buildNarrowParams } from './query-strategies/narrow.strategy';
import { buildBroadParams } from './query-strategies/broad.strategy';
import { buildTrendingParams } from './query-strategies/trending.strategy';

// ── Constants ──────────────────────────────────────────────────────────

/**
 * Global hard-blocked keywords — always stripped regardless of strategy.
 * These prevent embedded systems from leaking through any strategy variant.
 */
const GLOBAL_BLOCKED_KEYWORDS: string[] = [
  'embedded', 'microcontroller', 'arduino', 'esp32', 'esp8266',
  'raspberry pi', 'fpga', 'vhdl', 'verilog', 'firmware', 'rtos',
  'circuit design', 'pcb', 'stm32', 'nrf52', 'keil', 'mplab',
];

// ── Parameter Generator ────────────────────────────────────────────────

/**
 * Generate a single batch of query parameters from feedback signals.
 *
 * Uses the current strategy cycle position to select which strategy runs.
 * Each call advances the cycle, ensuring no single strategy dominates.
 *
 * @param signals  - Analyzed feedback signals from the Feedback Agent
 * @param cyclePosition  - Current position in the strategy cycle (0-based)
 * @param config   - Optional overrides for optimizer config
 * @returns GeneratedParams with the selected strategy and composed params
 */
export function generateParams(
  signals: FeedbackSignals,
  cyclePosition: number,
  config?: Partial<OptimizerConfig>,
): GeneratedParams {
  const mergedConfig: OptimizerConfig = { ...DEFAULT_OPTIMIZER_CONFIG, ...config };
  const cycle = mergedConfig.strategyCycle;

  // 1. Select strategy from cycle (wrap around with modulo)
  const strategyIndex = cyclePosition % cycle.length;
  const strategy: StrategyType = cycle[strategyIndex];

  // 2. Build params using the selected strategy
  let rawParams: SearchParams;

  switch (strategy) {
    case 'narrow':
      rawParams = buildNarrowParams(signals, {
        narrowTopCategoryCount: mergedConfig.narrowTopCategoryCount,
        hardExcludedCategories: mergedConfig.hardExcludedCategories,
      });
      break;

    case 'broad':
      rawParams = buildBroadParams(signals, {
        broadPositiveThreshold: mergedConfig.broadPositiveThreshold,
        hardExcludedCategories: mergedConfig.hardExcludedCategories,
      });
      break;

    case 'trending':
      rawParams = buildTrendingParams(signals, {
        hardExcludedCategories: mergedConfig.hardExcludedCategories,
      });
      break;

    default:
      // Fallback to narrow for unknown strategies
      rawParams = buildNarrowParams(signals, {
        hardExcludedCategories: mergedConfig.hardExcludedCategories,
      });
  }

  // 3. Compose: apply global filters
  const composedParams = applyGlobalFilters(rawParams, mergedConfig);

  return {
    strategy,
    params: composedParams,
  };
}

/**
 * Generate multiple query variants for diverse search results.
 *
 * Each variant uses a different strategy (if enough variants),
 * ensuring parallel crawl operations explore different angles.
 *
 * @param signals  - Analyzed feedback signals
 * @param startPosition  - Starting cycle position
 * @param count    - Number of variants to generate (3-5 recommended)
 * @param config   - Optional config overrides
 * @returns Array of GeneratedParams for parallel execution
 */
export function generateQueryVariants(
  signals: FeedbackSignals,
  startPosition: number,
  count: number = DEFAULT_OPTIMIZER_CONFIG.queryVariantCount,
  config?: Partial<OptimizerConfig>,
): GeneratedParams[] {
  const mergedConfig: OptimizerConfig = { ...DEFAULT_OPTIMIZER_CONFIG, ...config };
  const clampedCount = Math.max(1, Math.min(5, count));
  const variants: GeneratedParams[] = [];

  for (let i = 0; i < clampedCount; i++) {
    variants.push(generateParams(signals, startPosition + i, mergedConfig));
  }

  return variants;
}

// ── Global Filters ─────────────────────────────────────────────────────

/**
 * Apply global filters to any search params.
 * This is the final safety net before passing params to the crawler.
 *
 * Filters applied:
 *   1. Strip global blocked keywords from techKeywords
 *   2. Ensure hard-excluded categories are always in excludeCategories
 *   3. Deduplicate category lists
 *   4. Clamp difficulty values to valid range
 */
function applyGlobalFilters(
  params: SearchParams,
  config: OptimizerConfig,
): SearchParams {
  // 1. Strip blocked keywords
  const filteredKeywords = params.techKeywords.filter(
    (kw) => !GLOBAL_BLOCKED_KEYWORDS.includes(kw.toLowerCase()),
  );

  // 2. Merge hard-excluded categories
  const mergedExclude = [
    ...new Set([
      ...params.excludeCategories,
      ...config.hardExcludedCategories,
    ]),
  ];

  // 3. Deduplicate category lists
  const dedupedCategories = [...new Set(params.categories)];

  // 4. Clamp difficulty to [1, 3] if set
  const clampedMin = params.minDifficulty !== null
    ? Math.max(1, Math.min(3, params.minDifficulty))
    : null;
  const clampedMax = params.maxDifficulty !== null
    ? Math.max(1, Math.min(3, params.maxDifficulty))
    : null;

  return {
    ...params,
    techKeywords: filteredKeywords,
    categories: dedupedCategories,
    excludeCategories: mergedExclude,
    minDifficulty: clampedMin,
    maxDifficulty: clampedMax,
  };
}

/**
 * Ensure no search params contain embedded systems categories.
 * Returns true if params are valid (embedded systems are filtered out).
 */
export function validateNoEmbeddedSystems(params: SearchParams): boolean {
  const embeddedLike = GLOBAL_BLOCKED_KEYWORDS.some((blocked) =>
    params.techKeywords.some((kw) => kw.toLowerCase().includes(blocked)),
  );
  const hasEmbeddedCategory = params.categories.some(
    (cat) => cat.toLowerCase().includes('embedded'),
  );

  // Embedded systems should be caught by excludeCategories, but this
  // validation catches if they accidentally appear in techKeywords or categories
  return !embeddedLike && !hasEmbeddedCategory;
}
