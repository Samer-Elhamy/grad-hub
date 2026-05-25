/**
 * Filter Pipeline Service — orchestrates all filter stages in sequence.
 *
 * Pipeline order:
 *   1. category_preference → filter by user's excluded categories (short-circuits)
 *   2. recency             → score freshness
 *   3. relevance           → score against preference vector
 *   4. dedup               → check duplicates against existing DB records
 *   5. scorer              → compute combined score and decide acceptance
 *
 * The category_preference filter checks the user's excluded_categories from
 * their PreferenceVector. If an idea's category is in the user's exclusion list,
 * it is immediately rejected. This puts full control in the user's hands.
 *
 * Every stage logs its result for debugging/tracing purposes. Rejected ideas
 * are NEVER silently dropped — each rejection includes a reason and stage name.
 */

import type { CrawledIdea } from '../../types/search.types';
import { scoreRecency } from './filters/recency-filter';
import {
  scoreRelevance,
  type PreferenceVector,
} from './filters/relevance-filter';
import {
  checkDedup,
  type ExistingIdeaRecord,
} from './filters/dedup-filter';
import { computeCombinedScore } from './scorer';
import { searchConfig } from '../../config/search.config';

// ---------------------------------------------------------------------------
// Pipeline result types
// ---------------------------------------------------------------------------

export interface PipelineAccepted {
  idea: CrawledIdea;
  scores: {
    recency: number;
    relevance: number;
    combined: number;
    matchedKeywords: string[];
  };
}

export interface PipelineRejected {
  idea: CrawledIdea;
  reason: string;
  /** The pipeline stage that rejected the idea */
  stage: string;
}

export interface PipelineResult {
  accepted: PipelineAccepted[];
  rejected: PipelineRejected[];
}

// ---------------------------------------------------------------------------
// Pipeline Service
// ---------------------------------------------------------------------------

/**
 * Filter Pipeline — runs a batch of crawled ideas through all filter stages.
 *
 * Usage:
 *   const pipeline = new FilterPipelineService({
 *     preferenceVector: { 'AI/ML': 0.8, keywords: { 'deep learning': 0.9 } },
 *     existingIdeas: [{ id: '1', titleEn: '...', sourceUrl: '...' }],
 *   });
 *   const result = pipeline.processBatch(newlyCrawledIdeas);
 */
export class FilterPipelineService {
  private readonly preferenceVector: PreferenceVector;
  private readonly existingIdeas: ExistingIdeaRecord[];
  private readonly fuzzyThreshold: number;
  /** Categories the user has excluded from their feed */
  private readonly excludedCategories: string[];

  constructor(
    options: {
      /** Current learned preference vector from the Feedback Agent */
      preferenceVector?: PreferenceVector;
      /** Ideas already stored in the database (for dedup) */
      existingIdeas?: ExistingIdeaRecord[];
      /** Similarity threshold (0-1) for fuzzy title dedup */
      fuzzyThreshold?: number;
      /** Categories the user has excluded from their feed */
      excludedCategories?: string[];
    } = {},
  ) {
    this.preferenceVector = options.preferenceVector ?? {};
    this.existingIdeas = options.existingIdeas ?? [];
    this.fuzzyThreshold =
      options.fuzzyThreshold ?? searchConfig.dedupFuzzyThreshold;
    this.excludedCategories = options.excludedCategories ?? [];
  }

  /**
   * Run a single idea through the full filter pipeline.
   *
   * @param idea - The crawled idea to process
   * @returns Accepted (with scores) or Rejected (with reason and stage)
   */
  runPipeline(idea: CrawledIdea): PipelineAccepted | PipelineRejected {
    // ── Stage 1: User Category Preference Filter ──────────────────────
    // Check if the idea's category is in the user's excluded list
    const excludedCats = this.excludedCategories;
    if (idea.category && excludedCats.includes(idea.category)) {
      const rejected: PipelineRejected = {
        idea,
        reason: `Category "${idea.category}" is excluded by user preference`,
        stage: 'category_preference',
      };
      console.info(
        `[FilterPipeline] REJECTED (category_preference): "${idea.titleEn}" — ${rejected.reason}`,
      );
      return rejected;
    }
    if (idea.category) {
      console.info(`[FilterPipeline] PASSED (category_preference): "${idea.titleEn}" [${idea.category}]`);
    }

    // ── Stage 2: Recency Filter ────────────────────────────────────────
    const recencyResult = scoreRecency(idea);
    console.info(
      `[FilterPipeline] SCORE (recency): "${idea.titleEn}" → ${recencyResult.score.toFixed(3)} ` +
        `[${recencyResult.metadata.sourceFreshness}]`,
    );

    // ── Stage 3: Relevance Filter ──────────────────────────────────────
    const relevanceResult = scoreRelevance(idea, this.preferenceVector);
    console.info(
      `[FilterPipeline] SCORE (relevance): "${idea.titleEn}" → ${relevanceResult.score.toFixed(3)} ` +
        `[${relevanceResult.matchedKeywords.length} keywords matched]`,
    );

    // ── Stage 4: Dedup Filter ──────────────────────────────────────────
    const dedupResult = checkDedup(idea, this.existingIdeas, this.fuzzyThreshold);
    if (dedupResult.isDuplicate) {
      console.info(
        `[FilterPipeline] DUPLICATE (${dedupResult.matchType}): "${idea.titleEn}" ` +
          `→ existingId=${dedupResult.existingId}`,
      );
    } else {
      console.info(`[FilterPipeline] UNIQUE: "${idea.titleEn}"`);
    }

    // ── Stage 5: Combined Scorer ───────────────────────────────────────
    const scoreResult = computeCombinedScore(
      recencyResult,
      relevanceResult,
      dedupResult,
    );

    if (!scoreResult.accepted) {
      const reason = dedupResult.isDuplicate
        ? `Duplicate (${dedupResult.matchType}) — penalty ${scoreResult.breakdown.dedupPenalty}`
        : `Combined score ${scoreResult.combined.toFixed(3)} below minimum ${searchConfig.minimumScore}`;

      const rejected: PipelineRejected = {
        idea,
        reason,
        stage: 'scorer',
      };
      console.info(
        `[FilterPipeline] REJECTED (scorer): "${idea.titleEn}" — ${reason}`,
      );
      return rejected;
    }

    console.info(
      `[FilterPipeline] ACCEPTED: "${idea.titleEn}" — combined score: ${scoreResult.combined.toFixed(3)}`,
    );

    return {
      idea,
      scores: {
        recency: recencyResult.score,
        relevance: relevanceResult.score,
        combined: scoreResult.combined,
        matchedKeywords: relevanceResult.matchedKeywords,
      },
    };
  }

  /**
   * Run all ideas through the filter pipeline, collecting accepted and
   * rejected items separately.
   *
   * @param ideas - Array of crawled ideas to process
   * @returns Separated accepted and rejected results
   */
  processBatch(ideas: CrawledIdea[]): PipelineResult {
    const accepted: PipelineAccepted[] = [];
    const rejected: PipelineRejected[] = [];

    for (const idea of ideas) {
      const result = this.runPipeline(idea);
      if ('scores' in result) {
        accepted.push(result);
      } else {
        rejected.push(result);
      }
    }

    console.info(
      `[FilterPipeline] Batch complete: ${accepted.length} accepted, ` +
        `${rejected.length} rejected (out of ${ideas.length} total)`,
    );

    return { accepted, rejected };
  }
}
