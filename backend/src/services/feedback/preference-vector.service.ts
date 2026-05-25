/**
 * PreferenceVectorService — Main preference vector orchestrator
 *
 * Lifecycle of a preference vector update:
 *   1. ACCUMULATE — Swipe events are collected into an in-memory buffer
 *   2. CHECK     — After every N swipes (configurable via VectorConfig.batchSize),
 *                  trigger a full vector recalculation
 *   3. COMPUTE   — Use VectorBuilder to rebuild the full PreferenceVector from
 *                  all swipe history with temporal decay
 *   4. STORE     — Persist the computed vector to the preference_vectors table
 *                  (structured fields as JSONB, embedding as pgvector)
 *   5. EMIT      — Notify subscribers via FeedbackEventBus and WebSocket
 *
 * Design principles:
 *   - Buffers swipes in memory, recalculates on batch boundary
 *   - Delegates computation to pure functions in vector-builder.ts
 *   - Delegates decay to pure functions in vector-decay.ts
 *   - Delegates persistence to an abstracted store interface
 *   - Thread-safe for single-user mode (no concurrent access needed)
 *
 * Usage:
 *   import { preferenceVectorService } from './preference-vector.service';
 *   await preferenceVectorService.onSwipeRecorded(swipeRecord);
 *   const vector = await preferenceVectorService.getCurrentVector();
 *   const similar = await preferenceVectorService.findSimilarIdeas(10);
 */

import type { SwipeRecord, Idea } from '../../types/api';
import type {
  PreferenceVector,
  VectorConfig,
  VectorQuery,
  VectorQueryResult,
  DecayConfig,
} from '../../types/vector.types';
import { DEFAULT_VECTOR_CONFIG, DIFFICULTY_MAP } from '../../types/vector.types';
import { buildPreferenceVector } from './vector-builder';
import { buildSimilaritySql, mapQueryResult, buildCountQuery } from './query-builder';
import { feedbackEventBus, FeedbackEventNames } from './events';
import type { PreferenceChangedPayload } from './events';
import { broadcastPreferenceUpdate } from '../../websocket/stream';

// ── Constants ────────────────────────────────────────────────────────

/** Maximum buffer size to prevent unbounded memory growth */
const MAX_BUFFER_SIZE = 10_000;

/** Maximum age of stored vectors before forced recalculation (24 hours) */
const MAX_VECTOR_AGE_MS = 24 * 60 * 60 * 1000;

// ── Service Class ─────────────────────────────────────────────────────

/**
 * PreferenceVectorService — manages the complete lifecycle of preference vectors.
 *
 * Singleton service that:
 *   - Receives swipe events and batches them for periodic recalculation
 *   - Orchestrates vector computation via pure-function engine
 *   - Manages persistence (in-memory stub for now, ready for pgvector)
 *   - Emits events and broadcasts WebSocket updates on vector changes
 */
class PreferenceVectorService {
  // ── State ──────────────────────────────────────────────────────────

  /** Current computed preference vector (cached for fast access) */
  private currentVector: PreferenceVector | null = null;

  /** In-memory idea store (stub — replace with DB repository) */
  private ideasMap: Map<number, Idea> = new Map();

  /** In-memory swipe buffer (accumulates swipes between recalculations) */
  private swipeBuffer: SwipeRecord[] = [];

  /** Total swipes processed since last full recalculation */
  private swipesSinceLastUpdate = 0;

  /** Full swipe history (for complete recalculation) */
  private swipeHistory: SwipeRecord[] = [];

  /** Configuration */
  private config: VectorConfig;

  /** Configured timer for periodic checks */
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  // ── Constructor ────────────────────────────────────────────────────

  constructor(config?: Partial<VectorConfig>) {
    this.config = { ...DEFAULT_VECTOR_CONFIG, ...config };
    this.setupPeriodicCheck();
  }

  // ── Public API ──────────────────────────────────────────────────────

  /**
   * Initialize the service with ideas data.
   * Call this once on startup with the full ideas catalog.
   */
  initialize(ideas: Idea[]): void {
    this.ideasMap = new Map(ideas.map((idea) => [idea.id, idea]));
  }

  /**
   * Register a single swipe event and trigger vector update if threshold reached.
   *
   * Steps:
   *   1. Append to swipe history and buffer
   *   2. Check if batch threshold is reached
   *   3. If threshold met, recalculate vector
   *
   * Returns the current vector (updated or cached).
   */
  async onSwipeRecorded(record: SwipeRecord): Promise<PreferenceVector> {
    // Guard against null/undefined records
    if (!record || !record.idea_id) {
      return this.getCurrentVector();
    }

    // Add to history and buffer
    this.swipeHistory.push(record);
    this.swipeBuffer.push(record);
    this.swipesSinceLastUpdate++;

    // Trim buffer if it exceeds max size
    if (this.swipeBuffer.length > MAX_BUFFER_SIZE) {
      this.swipeBuffer = this.swipeBuffer.slice(-MAX_BUFFER_SIZE);
    }

    // Check if we should recalculate
    if (this.swipesSinceLastUpdate >= this.config.batchSize) {
      return this.recalculateVector(record.id);
    }

    return this.getCurrentVector();
  }

  /**
   * Recalculate the preference vector from all available swipe history.
   *
   * This is the main computation orchestration method:
   *   1. Reads full swipe history (stub: from in-memory buffer)
   *   2. Delegates to buildPreferenceVector() (pure functions)
   *   3. Stores the result
   *   4. Emits events and broadcasts
   *
   * @param sourceSwipeId - The swipe ID that triggered this recalculation
   * @returns The newly computed PreferenceVector
   */
  async recalculateVector(sourceSwipeId?: string): Promise<PreferenceVector> {
    // 1. Build vector from all history
    const newVector = buildPreferenceVector(
      this.swipeHistory,
      this.ideasMap,
      this.config,
      { lambda: this.config.decayLambda, maxDays: this.config.maxAgeDays },
    );

    // 2. Store the result
    this.currentVector = newVector;
    this.swipesSinceLastUpdate = 0;

    // 3. Persist to preference_vectors store
    await this.persistVector(newVector);

    // 4. Emit event for internal subscribers
    const payload: PreferenceChangedPayload = {
      preferenceVector: { ...newVector },
      sourceSwipeId: sourceSwipeId ?? 'unknown',
    };
    feedbackEventBus.emit(FeedbackEventNames.PREFERENCE_CHANGED, payload);

    // 5. Broadcast via WebSocket for connected clients
    broadcastPreferenceUpdate({
      category_weights: { ...newVector.category_weights },
      keyword_weights: { ...newVector.keyword_weights },
      excluded_categories: [...newVector.excluded_categories],
      difficulty_preference: newVector.difficulty_preference,
      last_updated: newVector.last_updated,
    });

    return newVector;
  }

  /**
   * Get the current preference vector.
   * If no vector exists yet, computes one from available history.
   * If history is empty, returns a neutral default vector.
   */
  async getCurrentVector(): Promise<PreferenceVector> {
    if (this.currentVector) {
      // Check if vector is stale (older than 24 hours) and force recalculate
      const age = Date.now() - new Date(this.currentVector.last_updated).getTime();
      if (age > MAX_VECTOR_AGE_MS && this.swipeHistory.length > 0) {
        return this.recalculateVector();
      }
      return { ...this.currentVector };
    }

    // No vector yet — compute from existing history or return neutral
    if (this.swipeHistory.length === 0) {
      return this.getNeutralVector();
    }

    return this.recalculateVector();
  }

  /**
   * Find ideas similar to the current preference vector using pgvector.
   *
   * Builds a parameterized SQL query and returns structured results.
   * In production, executes against PostgreSQL with pgvector extension.
   * Currently returns a stub with idea IDs sorted by preference match.
   *
   * @param options - Query options (limit, filters)
   * @returns Structured VectorQueryResult with idea IDs and similarity scores
   */
  async findSimilarIdeas(options: Partial<VectorQuery>): Promise<VectorQueryResult> {
    const vector = await this.getCurrentVector();
    const queryOptions: VectorQuery = {
      limit: options.limit ?? 10,
      offset: options.offset,
      excludedCategories: options.excludedCategories ?? vector.excluded_categories,
      minDifficulty: options.minDifficulty,
      maxDifficulty: options.maxDifficulty,
      threshold: options.threshold,
    };

    // Build the parameterized query
    const { text, values } = buildSimilaritySql(vector.embedding, queryOptions);

    // TODO: In production, execute via database pool:
    //   const result = await pool.query(text, values);
    //   return mapQueryResult(result.rows, queryOptions);
    //
    // For now, return a stub that simulates pgvector results
    // by scoring ideas based on category weight match
    const results = this.stubSimilaritySearch(vector, queryOptions);
    return results;
  }

  /**
   * Get ideas for the user, sorted by preference similarity.
   * Convenience wrapper around findSimilarIdeas with defaults.
   */
  async getRecommendedIdeas(limit: number = 10): Promise<Array<{ idea: Idea; score: number }>> {
    const result = await this.findSimilarIdeas({ limit });

    // Map IDs back to full Idea objects
    return result.ideaIds
      .map((id, index) => {
        const idea = this.ideasMap.get(id);
        if (!idea) return null;
        return { idea, score: result.scores[index] };
      })
      .filter((item): item is { idea: Idea; score: number } => item !== null);
  }

  /**
   * Get the current configuration (read-only snapshot).
   */
  getConfig(): Readonly<VectorConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration at runtime.
   * Triggers a recalculation if batchSize changes.
   */
  updateConfig(partial: Partial<VectorConfig>): void {
    const oldBatchSize = this.config.batchSize;
    this.config = { ...this.config, ...partial };

    // Recalculate if batchSize decreased (we may have passed the new threshold)
    if (this.config.batchSize < oldBatchSize) {
      if (this.swipesSinceLastUpdate >= this.config.batchSize) {
        this.recalculateVector().catch((err) => {
          console.error('[preference-vector] Recalc on config change failed:', err);
        });
      }
    }
  }

  /**
   * Reset all state (for testing or user data reset).
   */
  reset(): void {
    this.currentVector = null;
    this.swipeBuffer = [];
    this.swipeHistory = [];
    this.swipesSinceLastUpdate = 0;
    this.ideasMap = new Map();
  }

  /**
   * Clean up resources (intervals, etc.).
   */
  dispose(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // ── Private Methods ─────────────────────────────────────────────────

  /**
   * Persist the preference vector to storage.
   *
   * In production, this writes to the preference_vectors table:
   *   INSERT INTO preference_vectors (user_id, category_weights, keyword_weights,
   *     topic_affinities, embedding, excluded_categories, difficulty_preference,
   *     swipe_count, last_updated)
   *   VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::vector, $6, $7, $8, $9)
   *   ON CONFLICT (user_id) DO UPDATE SET ...;
   *
   * Currently a stub that logs to console in development.
   */
  private async persistVector(_vector: PreferenceVector): Promise<void> {
    // Stub — in production, write to preference_vectors table
    // const { text, values } = buildUpsertSql(vector, userId);
    // await pool.query(text, values);

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[preference-vector] Vector persisted: ${Object.keys(_vector.category_weights).length} categories, ` +
        `${Object.keys(_vector.keyword_weights).length} keywords, ` +
        `${_vector.embedding.length} embedding dims`,
      );
    }
  }

  /**
   * Generate a neutral/default preference vector for new users with no history.
   * All categories get equal weight, no exclusions.
   */
  private getNeutralVector(): PreferenceVector {
    const categories = this.getKnownCategories();
    const equalWeight = 1 / categories.length;
    const categoryWeights: Record<string, number> = {};
    for (const cat of categories) {
      categoryWeights[cat] = equalWeight;
    }

    return {
      category_weights: categoryWeights,
      keyword_weights: {},
      topic_affinities: {},
      embedding: [],
      excluded_categories: [],
      difficulty_preference: null,
      difficulty_numeric: null,
      swipe_count: 0,
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * Get list of known categories from the ideas map.
   */
  private getKnownCategories(): string[] {
    const cats = new Set<string>();
    for (const idea of this.ideasMap.values()) {
      if (idea.category) cats.add(idea.category);
    }
    return Array.from(cats).sort();
  }

  /**
   * Periodic check: ensures vector stays fresh even without new swipe activity.
   * Checks if the cached vector is stale and recycles if needed.
   */
  private setupPeriodicCheck(): void {
    // Check every 30 minutes
    this.checkInterval = setInterval(() => {
      if (!this.currentVector) return;

      const age = Date.now() - new Date(this.currentVector.last_updated).getTime();
      if (age > MAX_VECTOR_AGE_MS && this.swipeHistory.length > 0) {
        this.recalculateVector().catch((err) => {
          console.error('[preference-vector] Periodic recalc failed:', err);
        });
      }
    }, 30 * 60 * 1000); // 30 minutes

    // Allow process to exit even if this timer is still active
    if (this.checkInterval && typeof this.checkInterval === 'object') {
      this.checkInterval.unref?.();
    }
  }

  /**
   * Stub similarity search for development/testing without pgvector.
   *
   * Scores ideas by:
   *   - Category weight match (primary factor)
   *   - Difficulty preference match (secondary factor)
   *   - Keyword overlap with liked tech (tertiary factor)
   *
   * In production, this is replaced by the real pgvector query.
   */
  private stubSimilaritySearch(
    vector: PreferenceVector,
    options: VectorQuery,
  ): VectorQueryResult {
    const limit = options.limit;
    const excluded = new Set(options.excludedCategories ?? []);

    // Score each idea
    const scored: Array<{ id: number; score: number }> = [];

    for (const [id, idea] of this.ideasMap) {
      // Skip excluded categories
      if (excluded.has(idea.category)) continue;

      // Skip ideas with excluded difficulty
      if (options.minDifficulty !== undefined) {
        const diff = DIFFICULTY_MAP[idea.difficulty] ?? 2;
        if (diff < options.minDifficulty) continue;
      }
      if (options.maxDifficulty !== undefined) {
        const diff = DIFFICULTY_MAP[idea.difficulty] ?? 2;
        if (diff > options.maxDifficulty) continue;
      }

      // Category score: weight of the idea's category (0-1)
      const categoryScore = vector.category_weights[idea.category] ?? 0;

      // Difficulty score: 1.0 if matches preference, 0.5 otherwise
      const prefDiff = vector.difficulty_numeric;
      const ideaDiff = DIFFICULTY_MAP[idea.difficulty] ?? 2;
      const difficultyScore = prefDiff !== null && prefDiff === ideaDiff ? 1.0 : 0.5;

      // Keyword overlap score: fraction of idea's tech_stack found in keyword_weights
      const techStack = idea.tech_stack ?? [];
      const matchedKeywords = techStack.filter(
        (tech) => vector.keyword_weights[tech.toLowerCase()] !== undefined,
      );
      const keywordScore = techStack.length > 0
        ? matchedKeywords.length / techStack.length
        : 0;

      // Combined score (weighted)
      const score = categoryScore * 0.5 + difficultyScore * 0.3 + keywordScore * 0.2;

      scored.push({ id: idea.id, score });
    }

    // Sort by score descending, take top-N
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit);

    return {
      ideaIds: top.map((s) => s.id),
      scores: top.map((s) => Math.round(s.score * 10000) / 10000),
      total: scored.length,
    };
  }
}

// ── Singleton ─────────────────────────────────────────────────────────

/**
 * Singleton instance — import this everywhere.
 * Used by routes, controllers, and the swipe service event handler.
 */
export const preferenceVectorService = new PreferenceVectorService();


