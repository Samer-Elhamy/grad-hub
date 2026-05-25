/**
 * SearchOptimizerService — Feedback Agent → Deep Search Crawler bridge
 *
 * This is the main orchestrator that converts Feedback Agent's analyzed
 * preference signals into structured search parameters for the crawler.
 *
 * Pipeline:
 *   feedbackEventBus  ──►  SearchOptimizerService
 *        │                       │
 *        ▼                       ▼
 *   PreferenceVector      FeedbackSignals builder
 *   AIResponse              │
 *   SwipeStats              ▼
 *                      ParameterGenerator
 *                           │
 *                           ▼
 *                      Query variants (narrow/broad/trending)
 *                           │
 *                           ▼
 *                      CrawlerService.onNewIdeasFound()
 *                           │
 *                           ▼
 *                      A/B Query Log (search_queries)
 *
 * Design:
 *   - Listens to PREFERENCE_CHANGED events from the feedback event bus
 *   - Builds FeedbackSignals from current preference state + AI analysis
 *   - Delegates param generation to parameter-generator.ts
 *   - Manages strategy cycling to prevent stale results
 *   - Logs each query execution for A/B ratio analysis
 *   - Exposes manual trigger for external callers (routes/controllers)
 *
 * A/B Analysis:
 *   After each query cycle, tracks which strategy produced results that
 *   received likes vs dislikes. Feedack ratio is calculated per strategy
 *   to auto-adjust future strategy proportions.
 */

import type {
  SearchParams,
  FeedbackSignals,
  StrategyType,
  OptimizerConfig,
  SearchQueryLog,
  GeneratedParams,
} from '../../types/search-params.types';
import { DEFAULT_OPTIMIZER_CONFIG } from '../../types/search-params.types';
import { generateQueryVariants } from './parameter-generator';
import { feedbackEventBus, FeedbackEventNames } from './events';
import type { PreferenceChangedPayload } from './events';
import type { PreferenceVector } from '../../types/api';
import type { SwipeStats } from '../../types/swipe.types';

// ── Constants ──────────────────────────────────────────────────────────

/** How many query variants to generate per cycle (default) */
const DEFAULT_VARIANT_COUNT = 3;

/** Maximum entries in the A/B query log before pruning */
const MAX_QUERY_LOG_SIZE = 1000;

/** Interval for auto-triggering optimizer cycles without new swipes (30 min) */
const IDLE_CYCLE_INTERVAL_MS = 30 * 60 * 1000;

// ── Service Logger ─────────────────────────────────────────────────────

function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, meta?: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    component: 'SearchOptimizer',
    message,
    ...meta,
  };
  if (level === 'ERROR') {
    console.error(JSON.stringify(entry));
  } else if (level === 'WARN') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// ── Service Class ──────────────────────────────────────────────────────

/**
 * SearchOptimizerService — Main orchestrator for parameter optimization.
 *
 * Singleton service that:
 *   - Subscribes to preference change events
 *   - Builds FeedbackSignals from current state
 *   - Generates query variants via strategy pattern
 *   - Propagates params to the Deep Search Crawler
 *   - Logs queries for A/B analysis
 *   - Maintains a strategy cycle to prevent stale results
 */
export class SearchOptimizerService {
  // ── State ──────────────────────────────────────────────────────────

  /** Current position in the strategy cycle (increments on each generate) */
  private cyclePosition: number = 0;

  /** Configuration */
  private config: OptimizerConfig;

  /** A/B query log — history of query executions and their like/dislike results */
  private queryLog: SearchQueryLog[] = [];

  /** A/B feedback ratios per strategy type */
  private strategyRatios: Record<StrategyType, { likes: number; total: number }> = {
    narrow: { likes: 0, total: 0 },
    broad: { likes: 0, total: 0 },
    trending: { likes: 0, total: 0 },
  };

  /** Callback for pushing params to the Deep Search Crawler */
  private onCrawlRequest: ((params: SearchParams[]) => Promise<void>) | null = null;

  /** Callback for persisting query log entries */
  private onLogEntry: ((entry: SearchQueryLog) => Promise<void>) | null = null;

  /** Idle cycle timer (prevents stagnation when no new swipes) */
  private idleTimer: ReturnType<typeof setInterval> | null = null;

  /** Most recent preference vector snapshot */
  private lastPreferenceVector: PreferenceVector | null = null;

  /** Most recent swipe stats snapshot */
  private lastSwipeStats: SwipeStats | null = null;

  // ── Constructor ────────────────────────────────────────────────────

  constructor(config?: Partial<OptimizerConfig>) {
    this.config = { ...DEFAULT_OPTIMIZER_CONFIG, ...config };

    // Subscribe to preference changes
    feedbackEventBus.on(
      FeedbackEventNames.PREFERENCE_CHANGED,
      this.handlePreferenceChanged.bind(this),
    );

    // Set up idle cycle to prevent stagnation
    this.setupIdleCycle();

    log('INFO', 'SearchOptimizerService initialized', {
      strategyCycle: this.config.strategyCycle,
      variantCount: this.config.queryVariantCount,
    });
  }

  // ── Public API ─────────────────────────────────────────────────────

  /**
   * Set the callback that forwards generated params to the Deep Search Crawler.
   *
   * The crawler receives an array of SearchParams (one per query variant)
   * and executes them in parallel or sequence depending on crawler config.
   */
  setCrawlRequestHandler(
    handler: (params: SearchParams[]) => Promise<void>,
  ): void {
    this.onCrawlRequest = handler;
  }

  /**
   * Set the callback for persisting A/B query log entries.
   * In production, this writes to the search_queries table.
   */
  setLogPersistenceHandler(
    handler: (entry: SearchQueryLog) => Promise<void>,
  ): void {
    this.onLogEntry = handler;
  }

  /**
   * Manually trigger an optimizer cycle.
   *
   * Useful for:
   *   - Initial seed (no preferences yet → broad/trending only)
   *   - Direct API calls from routes/controllers
   *   - Integration testing
   *
   * @param swipeStats    - Optional swipe stats (uses cached if omitted)
   * @param preferenceVec - Optional preference vector (uses cached if omitted)
   * @returns Array of GeneratedParams produced this cycle
   */
  async triggerOptimize(
    swipeStats?: SwipeStats,
    preferenceVec?: PreferenceVector,
  ): Promise<GeneratedParams[]> {
    // Update cached state if provided
    if (swipeStats) this.lastSwipeStats = swipeStats;
    if (preferenceVec) this.lastPreferenceVector = preferenceVec;

    // Build feedback signals from current state
    const signals = this.buildFeedbackSignals(
      this.lastSwipeStats,
      this.lastPreferenceVector,
    );

    // Generate query variants
    const variants = generateQueryVariants(
      signals,
      this.cyclePosition,
      this.config.queryVariantCount,
      this.config,
    );

    // Advance the cycle position by the number of variants generated
    this.cyclePosition += variants.length;

    // Log the generated queries
    await this.logQueries(variants);

    // Forward to crawler (if handler is set)
    if (this.onCrawlRequest) {
      const paramsArray = variants.map((v) => v.params);
      await this.onCrawlRequest(paramsArray);
    }

    log('INFO', 'Optimizer cycle completed', {
      variantCount: variants.length,
      strategies: variants.map((v) => v.strategy),
      cyclePosition: this.cyclePosition,
    });

    return variants;
  }

  /**
   * Record a feedback result for a logged query.
   *
   * Called after a swipe is recorded to update the A/B ratio for
   * the strategy that produced that idea. This allows the optimizer
   * to prefer strategies that yield higher like ratios.
   *
   * @param queryId  - The ID of the query log entry
   * @param liked    - Whether the resulting idea was liked (right swipe)
   */
  recordFeedback(queryId: string, liked: boolean): void {
    const entry = this.queryLog.find((q) => q.id === queryId);
    if (!entry) {
      log('WARN', 'recordFeedback called for unknown query', { queryId });
      return;
    }

    // Update the log entry
    if (liked) {
      entry.likedCount++;
    } else {
      entry.dislikedCount++;
    }

    const total = entry.likedCount + entry.dislikedCount;
    entry.likeRatio = total > 0 ? entry.likedCount / total : 0;

    // Update strategy ratio
    const ratio = this.strategyRatios[entry.strategy];
    ratio.total++;
    if (liked) ratio.likes++;
  }

  /**
   * Get current A/B ratios per strategy.
   * Returns a snapshot of likes/total per strategy type.
   */
  getStrategyRatios(): Record<StrategyType, { likes: number; total: number; ratio: number }> {
    const result = {} as Record<StrategyType, { likes: number; total: number; ratio: number }>;
    for (const [strategy, { likes, total }] of Object.entries(this.strategyRatios)) {
      result[strategy as StrategyType] = {
        likes,
        total,
        ratio: total > 0 ? likes / total : 0,
      };
    }
    return result;
  }

  /**
   * Get the full A/B query log.
   * Returns a defensive copy.
   */
  getQueryLog(): ReadonlyArray<SearchQueryLog> {
    return this.queryLog.map((entry) => ({ ...entry }));
  }

  /**
   * Get the current cycle position (for external status monitoring).
   */
  getCyclePosition(): number {
    return this.cyclePosition;
  }

  /**
   * Get the current configuration (read-only snapshot).
   */
  getConfig(): Readonly<OptimizerConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration at runtime.
   */
  updateConfig(partial: Partial<OptimizerConfig>): void {
    this.config = { ...this.config, ...partial };
    log('INFO', 'Optimizer config updated', { changes: partial });
  }

  /**
   * Reset all state (for testing or user data reset).
   */
  reset(): void {
    this.cyclePosition = 0;
    this.queryLog = [];
    this.strategyRatios = {
      narrow: { likes: 0, total: 0 },
      broad: { likes: 0, total: 0 },
      trending: { likes: 0, total: 0 },
    };
    this.lastPreferenceVector = null;
    this.lastSwipeStats = null;
    log('INFO', 'SearchOptimizer state reset');
  }

  /**
   * Clean up resources (intervals, event listeners).
   */
  dispose(): void {
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }
    feedbackEventBus.off(
      FeedbackEventNames.PREFERENCE_CHANGED,
      this.handlePreferenceChanged.bind(this),
    );
    log('INFO', 'SearchOptimizerService disposed');
  }

  // ── Event Handlers ─────────────────────────────────────────────────

  /**
   * Handle PREFERENCE_CHANGED events from the feedback event bus.
   * Triggers an optimizer cycle whenever preferences are recalculated.
   */
  private async handlePreferenceChanged(payload: PreferenceChangedPayload): Promise<void> {
    log('DEBUG', 'Preference changed event received', {
      sourceSwipeId: payload.sourceSwipeId,
      categories: Object.keys(payload.preferenceVector.category_weights).length,
    });

    this.lastPreferenceVector = payload.preferenceVector as unknown as PreferenceVector;

    // Trigger optimization (non-blocking, fire-and-forget)
    try {
      await this.triggerOptimize();
    } catch (err) {
      log('ERROR', 'Optimize on preference change failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Signal Builder ─────────────────────────────────────────────────

  /**
   * Build FeedbackSignals from current swipe stats and preference vector.
   *
   * Pure-ish: uses cached state to compute the signal payload.
   * This is the bridge between the Feedback Agent's data model and
   * the parameter generator's input format.
   *
   * @param stats  - Current swipe statistics or null (no data)
   * @param vector - Current preference vector or null (no data)
   * @returns Structured FeedbackSignals ready for the parameter generator
   */
  private buildFeedbackSignals(
    stats: SwipeStats | null,
    vector: PreferenceVector | null,
  ): FeedbackSignals {
    // ── Top liked categories ────────────────────────────────────────
    const topLikedCategories = stats
      ? Object.entries(stats.categories)
          .filter(([, cat]) => cat.right_ratio > 0.5)
          .sort(([, a], [, b]) => b.right_ratio - a.right_ratio)
          .map(([category, cat]) => ({
            category,
            affinity: cat.right_ratio,
          }))
      : [];

    // ── Disliked categories ─────────────────────────────────────────
    const dislikedCategories: string[] = [
      ...(vector?.excluded_categories ?? []),
      ...(stats
        ? Object.entries(stats.categories)
            .filter(([, cat]) => cat.right_ratio <= 0.2)
            .map(([category]) => category)
        : []),
    ];

    // ── Positively rated categories (right_ratio > 0.4) ─────────────
    const positivelyRatedCategories = stats
      ? Object.entries(stats.categories)
          .filter(([, cat]) => cat.right_ratio > 0.4)
          .map(([category, cat]) => ({
            category,
            rightRatio: cat.right_ratio,
          }))
      : [];

    // ── Trending keywords ───────────────────────────────────────────
    const trendingKeywords = vector?.keyword_weights
      ? Object.entries(vector.keyword_weights)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 15)
          .map(([keyword]) => keyword)
      : [];

    return {
      topLikedCategories,
      dislikedCategories: [...new Set(dislikedCategories)],
      positivelyRatedCategories,
      trendingKeywords,
      aiRecommendations: [], // Populated when AI analysis is available
      difficultyPreference: vector?.difficulty_preference ?? null,
      difficultyNumeric: this.parseDifficultyNumeric(vector?.difficulty_preference ?? null),
      swipeCount: stats?.total_swipes ?? 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Parse difficulty string to numeric value.
   */
  private parseDifficultyNumeric(pref: string | null): number | null {
    if (!pref) return null;
    const map: Record<string, number> = {
      مبتدئ: 1, beginner: 1,
      متوسط: 2, intermediate: 2,
      متقدم: 3, advanced: 3,
    };
    return map[pref] ?? null;
  }

  // ── Query Logging ──────────────────────────────────────────────────

  /**
   * Log generated queries for A/B analysis.
   * Writes entries to the in-memory log and persists via callback.
   */
  private async logQueries(variants: GeneratedParams[]): Promise<void> {
    const now = new Date().toISOString();

    for (const variant of variants) {
      const entry: SearchQueryLog = {
        id: `qry_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        strategy: variant.strategy,
        params: { ...variant.params },
        resultCount: 0,
        likedCount: 0,
        dislikedCount: 0,
        likeRatio: 0,
        executedAt: now,
      };

      this.queryLog.push(entry);

      // Persist via callback if set
      if (this.onLogEntry) {
        try {
          await this.onLogEntry(entry);
        } catch (err) {
          log('WARN', 'Failed to persist query log entry', {
            queryId: entry.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    // Prune log if it exceeds max size
    if (this.queryLog.length > MAX_QUERY_LOG_SIZE) {
      this.queryLog = this.queryLog.slice(-MAX_QUERY_LOG_SIZE);
    }
  }

  // ── Idle Cycle ─────────────────────────────────────────────────────

  /**
   * Set up a periodic timer that triggers optimizer cycles even without
   * new swipe activity. This ensures the search parameters are periodically
   * refreshed to prevent feed stagnation.
   */
  private setupIdleCycle(): void {
    this.idleTimer = setInterval(() => {
      log('DEBUG', 'Idle cycle triggered — refreshing search parameters');

      if (this.lastPreferenceVector || this.lastSwipeStats) {
        this.triggerOptimize().catch((err) => {
          log('ERROR', 'Idle cycle optimize failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
    }, IDLE_CYCLE_INTERVAL_MS);

    // Allow process to exit even if this timer is still active
    if (this.idleTimer && typeof this.idleTimer === 'object') {
      this.idleTimer.unref?.();
    }
  }
}

// ── Singleton ───────────────────────────────────────────────────────────

/**
 * Singleton instance — import this everywhere.
 * Used by routes, controllers, and the integration agent startup.
 */
export const searchOptimizerService = new SearchOptimizerService();
