/**
 * Search Parameter Types — Feedback Agent → Deep Search Crawler bridge
 *
 * These types define the structured search parameters produced by the
 * Search Parameter Optimizer and consumed by the Deep Search Crawler.
 *
 * The pipeline:
 *   FeedbackSignals (from AI analysis + preference vector)
 *   → QueryStrategy (narrow | broad | trending)
 *   → SearchParams (structured query for the crawler)
 *   → CrawlerService (executes the search)
 *
 * Each search execution is logged in search_queries for A/B analysis.
 */

// ── Strategy Types ─────────────────────────────────────────────────────

/** The three query strategy variants */
export type StrategyType = 'narrow' | 'broad' | 'trending';

/** Readable label for each strategy */
export const STRATEGY_LABELS: Record<StrategyType, string> = {
  narrow: 'Narrow — precise match',
  broad: 'Broad — exploratory',
  trending: 'Trending — recent high-signal',
} as const;

// ── Feedback Input ──────────────────────────────────────────────────────

/**
 * Analyzed preference signals consumed from the Feedback Agent.
 *
 * Built from:
 *   - AIResponse (from ai.service.ts) → categoryScores, keywords, recommendations
 *   - PreferenceVector (from vector.types.ts) → category_weights, excluded_categories, difficulty
 *   - SwipeStats (from swipe.types.ts) → per-category right_ratio, average_rating
 */
export interface FeedbackSignals {
  /** Top positively-liked categories sorted by affinity (highest first) */
  topLikedCategories: Array<{ category: string; affinity: number }>;

  /** Categories the user has consistently disliked (< 0.05 weight or left-swiped) */
  dislikedCategories: string[];

  /** All categories with positive affinity (right_ratio > 0.4) for broad exploration */
  positivelyRatedCategories: Array<{ category: string; rightRatio: number }>;

  /** Trending keywords extracted from recent liked swipes */
  trendingKeywords: string[];

  /** AI reasoning recommendations (if available) */
  aiRecommendations: string[];

  /** User's preferred difficulty level if detected */
  difficultyPreference: string | null;

  /** Numeric difficulty preference: 1=beginner, 2=intermediate, 3=advanced */
  difficultyNumeric: number | null;

  /** Total swipe count used to compute these signals */
  swipeCount: number;

  /** ISO-8601 timestamp of when these signals were computed */
  lastUpdated: string;
}

// ── Search Parameters ──────────────────────────────────────────────────

/**
 * Structured search parameters passed to the Deep Search Crawler.
 *
 * The crawler uses these to filter which projects to fetch:
 *   - tech_keywords: terms to match against project tech stacks and descriptions
 *   - categories: which project categories to include
 *   - exclude_categories: categories to always filter out (e.g. disliked, Embedded Systems)
 *   - min/max_difficulty: difficulty range filter
 *   - min_recency: only fetch projects newer than this date
 *   - source: which source type(s) to crawl
 */
export interface SearchParams {
  /** Tech stack keywords to match in projects */
  techKeywords: string[];

  /** Categories to include in the search */
  categories: string[];

  /** Categories to exclude (always includes embedded systems at filter level) */
  excludeCategories: string[];

  /** Minimum difficulty numeric value (1=beginner) */
  minDifficulty: number | null;

  /** Maximum difficulty numeric value (3=advanced) */
  maxDifficulty: number | null;

  /** Only include projects newer than this date */
  minRecency: Date | null;

  /** Which source(s) to crawl */
  source: 'university' | 'github' | 'both';

  /** Which strategy produced these params (for A/B logging) */
  strategy: StrategyType;
}

// ── Optimizer Configuration ────────────────────────────────────────────

/**
 * Configuration for the Search Parameter Optimizer.
 *
 * Controls how many query variants are generated, how strategies cycle,
 * and thresholds for category inclusion/exclusion.
 */
export interface OptimizerConfig {
  /** Number of query variants to generate per cycle (3-5) */
  queryVariantCount: number;

  /** Category affinity threshold below which a category is excluded */
  excludeThreshold: number;

  /** Right-ratio threshold for "positively rated" broad strategy (default: 0.4) */
  broadPositiveThreshold: number;

  /** Number of top liked categories to include in narrow strategy */
  narrowTopCategoryCount: number;

  /** Whether to always exclude embedded systems */
  excludeEmbeddedSystems: boolean;

  /** Strategy cycle order (default: narrow → broad → trending) */
  strategyCycle: StrategyType[];

  /** Categories that must always be excluded regardless of user prefs */
  hardExcludedCategories: string[];
}

/** Default optimizer configuration values */
export const DEFAULT_OPTIMIZER_CONFIG: OptimizerConfig = Object.freeze({
  queryVariantCount: 3,
  excludeThreshold: 0.05,
  broadPositiveThreshold: 0.4,
  narrowTopCategoryCount: 3,
  excludeEmbeddedSystems: true,
  strategyCycle: ['narrow', 'broad', 'trending'] as StrategyType[],
  hardExcludedCategories: ['Embedded Systems', 'IoT'],
});

// ── A/B Query Log ──────────────────────────────────────────────────────

/**
 * A query execution log entry for A/B analysis.
 *
 * Stored in the search_queries table to track which strategies
 * produce the most liked swipes.
 */
export interface SearchQueryLog {
  /** Unique query execution identifier */
  id: string;

  /** The strategy used */
  strategy: StrategyType;

  /** Full search parameters used */
  params: SearchParams;

  /** How many results this query returned */
  resultCount: number;

  /** How many of those results were later liked */
  likedCount: number;

  /** How many were disliked */
  dislikedCount: number;

  /** Like/total ratio (for auto-adjustment) */
  likeRatio: number;

  /** ISO-8601 timestamp of when the query was executed */
  executedAt: string;
}

// ── Parameter Generator Output ─────────────────────────────────────────

/**
 * Parameter generator output wraps a single SearchParams with its strategy.
 * The generator cycles through strategies and returns one at a time.
 */
export interface GeneratedParams {
  /** The strategy that produced these params */
  strategy: StrategyType;

  /** The structured search parameters */
  params: SearchParams;
}
