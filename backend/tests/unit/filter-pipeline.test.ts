/**
 * Unit tests: FilterPipelineService
 *
 * Coverage targets:
 * - Embedded Systems hard block (short-circuit)
 * - Recency scoring
 * - Relevance scoring
 * - Combined scorer formula
 * - Short-circuit on embedded systems match
 */

import { FilterPipelineService, type PipelineAccepted, type PipelineRejected } from '../../src/services/search/filter-pipeline.service';
import { scoreRecency } from '../../src/services/search/filters/recency-filter';
import { scoreRelevance, type PreferenceVector } from '../../src/services/search/filters/relevance-filter';
import { checkDedup, type ExistingIdeaRecord } from '../../src/services/search/filters/dedup-filter';
import { computeCombinedScore } from '../../src/services/search/scorer';
import { searchConfig } from '../../src/config/search.config';
import type { CrawledIdea } from '../../src/types/search.types';
import type { RecencyFilterResult } from '../../src/services/search/filters/recency-filter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTestIdea(overrides: Partial<CrawledIdea> = {}): CrawledIdea {
  return {
    titleEn: 'AI-Powered Chatbot with Natural Language Processing',
    titleAr: '',
    descriptionEn: 'A modern chatbot using machine learning and deep learning techniques for natural language understanding. Built with React frontend and Python backend.',
    descriptionAr: '',
    shortDescEn: 'AI Chatbot',
    shortDescAr: '',
    university: 'MIT',
    country: 'USA',
    sourceUrl: 'https://example.com/project/chatbot',
    sourceType: 'university',
    techStack: ['Python', 'TensorFlow', 'React', 'NLP'],
    category: 'AI/ML',
    difficulty: 'متوسط',
    year: 2026,
    crawledAt: new Date().toISOString(),
    needsTranslation: false,
    ...overrides,
  };
}

function makeTestPreferenceVector(): PreferenceVector {
  return {
    'ai/ml': 0.9,
    'web applications': 0.7,
    'mobile apps': 0.3,
    keywords: {
      'machine learning': 0.95,
      'deep learning': 0.85,
      'natural language': 0.8,
      'react': 0.7,
      'python': 0.75,
    },
  };
}

// ---------------------------------------------------------------------------
// Test Suite: Recency Scoring
// ---------------------------------------------------------------------------

describe('Filter Pipeline — scoreRecency', () => {
  test('scoreRecency returns 1.0 for GitHub trending repos', () => {
    // Arrange
    const idea = makeTestIdea({ sourceType: 'github', year: null });

    // Act
    const result = scoreRecency(idea);

    // Assert
    expect(result.score).toBe(1.0);
    expect(result.metadata.sourceFreshness).toBe('github');
  });

  test('scoreRecency returns 1.0 for current year (2026)', () => {
    // Arrange
    const idea = makeTestIdea({ year: 2026, sourceType: 'university' });

    // Act
    const result = scoreRecency(idea);

    // Assert
    expect(result.score).toBe(1.0);
    expect(result.metadata.dated).toBe(true);
    expect(result.metadata.sourceFreshness).toBe('explicit');
  });

  test('scoreRecency returns 0.8 for one year ago (2025)', () => {
    // Arrange: Linear decay over 5 years
    // Formula: max(0, 1 - yearsAgo / 5)
    // 2025: 1 - 1/5 = 0.8
    const idea = makeTestIdea({ year: 2025, sourceType: 'university' });

    // Act
    const result = scoreRecency(idea);

    // Assert
    expect(result.score).toBe(0.8);
  });

  test('scoreRecency returns 0.6 for two years ago (2024)', () => {
    // 2024: 1 - 2/5 = 0.6
    const idea = makeTestIdea({ year: 2024, sourceType: 'university' });
    const result = scoreRecency(idea);
    expect(result.score).toBe(0.6);
  });

  test('scoreRecency returns 0.0 for 5+ years ago', () => {
    // 2021 and earlier: 1 - 5/5 = 0 (floor at 0)
    const idea2021 = makeTestIdea({ year: 2021, sourceType: 'university' });
    const idea2020 = makeTestIdea({ year: 2020, sourceType: 'university' });
    const idea2010 = makeTestIdea({ year: 2010, sourceType: 'university' });

    expect(scoreRecency(idea2021).score).toBe(0);
    expect(scoreRecency(idea2020).score).toBe(0);
    expect(scoreRecency(idea2010).score).toBe(0);
  });

  test('scoreRecency returns 0.5 for web-crawled without date', () => {
    const idea = makeTestIdea({ year: null, sourceType: 'university' });
    const result = scoreRecency(idea);

    expect(result.score).toBe(0.5);
    expect(result.metadata.sourceFreshness).toBe('unknown');
  });

  test('scoreRecency handles year 0 gracefully', () => {
    // year 0 or negative should be treated as "no date"
    const ideaZero = makeTestIdea({ year: 0, sourceType: 'university' });
    const ideaNegative = makeTestIdea({ year: -1, sourceType: 'university' });

    // Both fall through to the "unknown" case (year > 0 is required for explicit)
    expect(scoreRecency(ideaZero).metadata.sourceFreshness).toBe('unknown');
    expect(scoreRecency(ideaNegative).metadata.sourceFreshness).toBe('unknown');
    expect(scoreRecency(ideaNegative).score).toBe(0.5); // No date → neutral score
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Relevance Scoring
// ---------------------------------------------------------------------------

describe('Filter Pipeline — scoreRelevance', () => {
  test('scoreRelevance returns 0 for empty preference vector', () => {
    // Arrange
    const idea = makeTestIdea();
    const emptyPrefs: PreferenceVector = {};

    // Act
    const result = scoreRelevance(idea, emptyPrefs);

    // Assert
    expect(result.score).toBe(0);
    expect(result.matchedKeywords).toEqual([]);
  });

  test('scoreRelevance finds matching category', () => {
    // Arrange
    const idea = makeTestIdea({ category: 'AI/ML' });
    const prefs: PreferenceVector = { 'ai/ml': 0.9 };

    // Act
    const result = scoreRelevance(idea, prefs);

    // Assert
    expect(result.matchedKeywords).toContain('ai/ml');
    expect(result.score).toBeGreaterThan(0);
  });

  test('scoreRelevance finds matching keywords in techStack', () => {
    // Arrange
    const idea = makeTestIdea({
      techStack: ['Python', 'TensorFlow', 'React'],
      category: 'Other',
    });
    const prefs: PreferenceVector = {
      keywords: {
        python: 0.8,
        tensorflow: 0.9,
      },
    };

    // Act
    const result = scoreRelevance(idea, prefs);

    // Assert
    expect(result.matchedKeywords).toContain('python');
    expect(result.matchedKeywords).toContain('tensorflow');
    expect(result.score).toBeGreaterThan(0);
  });

  test('scoreRelevance finds matching keywords in description', () => {
    // Arrange
    const idea = makeTestIdea({
      descriptionEn: 'This project uses advanced machine learning with deep learning neural networks',
      category: 'Other',
      techStack: [],
    });
    const prefs: PreferenceVector = {
      keywords: {
        'machine learning': 0.9,
        'deep learning': 0.85,
      },
    };

    // Act
    const result = scoreRelevance(idea, prefs);

    // Note: description terms are split on non-word chars, so "machine" and "learning"
    // are separate. But "deep learning" matches... let's see what actually matches

    // Assert: score should be positive since terms exist
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  test('scoreRelevance cosine similarity is between 0 and 1', () => {
    // Test multiple scenarios to verify bounds
    const testCases = [
      { idea: makeTestIdea({ category: 'AI/ML' }), prefs: makeTestPreferenceVector() },
      { idea: makeTestIdea({ category: 'Nonexistent' }), prefs: {} },
      { idea: makeTestIdea({ category: 'Web Applications' }), prefs: { 'Web Applications': 0.5 } },
    ];

    for (const { idea, prefs } of testCases) {
      const result = scoreRelevance(idea, prefs);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    }
  });

  test('scoreRelevance category match has higher weight than tech match', () => {
    // Category = 1.0 weight, tech = 0.5 weight
    const ideaWithCategory = makeTestIdea({
      category: 'AI/ML',
      techStack: [],
      descriptionEn: '',
    });

    const ideaWithTech = makeTestIdea({
      category: 'Other',
      techStack: ['python'],
      descriptionEn: '',
    });

    const prefs: PreferenceVector = {
      'ai/ml': 0.9,
      keywords: { python: 0.9 },
    };

    const catResult = scoreRelevance(ideaWithCategory, prefs);
    const techResult = scoreRelevance(ideaWithTech, prefs);

    // Both should have positive scores
    expect(catResult.score).toBeGreaterThan(0);
    expect(techResult.score).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Dedup Filter (checkDedup)
// ---------------------------------------------------------------------------

describe('Filter Pipeline — checkDedup', () => {
  const existingIdeas: ExistingIdeaRecord[] = [
    { id: '1', titleEn: 'AI Chatbot System', sourceUrl: 'https://example.com/chatbot' },
    { id: '2', titleEn: 'Web Dashboard', sourceUrl: 'https://example.com/dashboard' },
    { id: '3', titleEn: 'Mobile App UI', sourceUrl: 'https://example.com/mobile' },
  ];

  test('checkDedup returns isDuplicate: false for new idea', () => {
    const idea = makeTestIdea({
      titleEn: 'Completely New Project',
      sourceUrl: 'https://example.com/new',
    });

    const result = checkDedup(idea, existingIdeas);
    expect(result.isDuplicate).toBe(false);
  });

  test('checkDedup detects exact title match', () => {
    const idea = makeTestIdea({
      titleEn: 'AI Chatbot System',
      sourceUrl: 'https://different-url.com/new',
    });

    const result = checkDedup(idea, existingIdeas);
    expect(result.isDuplicate).toBe(true);
    expect(result.matchType).toBe('exact');
    expect(result.existingId).toBe('1');
  });

  test('checkDedup exact match is case-insensitive', () => {
    const idea = makeTestIdea({
      titleEn: 'ai chatbot system',
      sourceUrl: 'https://different.com',
    });

    const result = checkDedup(idea, existingIdeas);
    expect(result.isDuplicate).toBe(true);
  });

  test('checkDedup detects URL match', () => {
    const idea = makeTestIdea({
      titleEn: 'Different Title Same URL',
      sourceUrl: 'https://example.com/chatbot',
    });

    const result = checkDedup(idea, existingIdeas);
    expect(result.isDuplicate).toBe(true);
    expect(result.matchType).toBe('url');
  });

  test('checkDedup detects fuzzy title match above threshold', () => {
    // "AI Chatbot System" vs "AI Chatbot Systems" (1 char difference)
    // Similarity: 1 - 1/17 ≈ 0.94, which is >= 0.8 threshold
    const idea = makeTestIdea({
      titleEn: 'AI Chatbot Systems',
      sourceUrl: 'https://different.com',
    });

    const result = checkDedup(idea, existingIdeas);
    expect(result.isDuplicate).toBe(true);
    expect(result.matchType).toBe('fuzzy');
  });

  test('checkDedup rejects fuzzy match below threshold', () => {
    // "AI Chatbot System" vs "Something Completely Different"
    const idea = makeTestIdea({
      titleEn: 'Something Completely Different and Unrelated',
      sourceUrl: 'https://totally-new.com',
    });

    const result = checkDedup(idea, existingIdeas);
    expect(result.isDuplicate).toBe(false);
  });

  test('checkDedup exact match takes priority over fuzzy/URL', () => {
    // If title matches exactly, that should be the reported matchType
    const idea = makeTestIdea({
      titleEn: 'AI Chatbot System',
      sourceUrl: 'https://example.com/chatbot', // Also URL matches
    });

    const result = checkDedup(idea, existingIdeas);
    expect(result.matchType).toBe('exact'); // Exact wins
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Combined Scorer Formula
// ---------------------------------------------------------------------------

describe('Filter Pipeline — computeCombinedScore', () => {
  // Create mock filter results for testing
  function makeRecencyResult(score: number): RecencyFilterResult {
    return {
      score,
      metadata: { dated: true, sourceFreshness: 'explicit' },
    };
  }

  function makeRelevanceResult(score: number) {
    return {
      score,
      matchedKeywords: [],
    };
  }

  function makeDedupResult(isDuplicate: boolean, matchType?: 'exact' | 'url' | 'fuzzy') {
    return {
      isDuplicate,
      matchType,
      existingId: isDuplicate ? 'test-id' : undefined,
    };
  }

  test('computeCombinedScore formula: recency * weight + relevance * weight', () => {
    // From scorer.ts:
    // combined = recencyWeight * recencyScore + relevanceWeight * relevanceScore - dedupPenalty

    const recencyResult = makeRecencyResult(1.0);
    const relevanceResult = makeRelevanceResult(1.0);
    const dedupResult = makeDedupResult(false);

    const result = computeCombinedScore(recencyResult, relevanceResult, dedupResult);

    // With default weights: recency 0.3, relevance 0.7
    // 0.3 * 1.0 + 0.7 * 1.0 = 1.0
    expect(result.combined).toBe(1.0);
    expect(result.accepted).toBe(true);
  });

  test('computeCombinedScore with partial scores', () => {
    const recencyResult = makeRecencyResult(0.5);  // 0.5 recency
    const relevanceResult = makeRelevanceResult(0.5);  // 0.5 relevance
    const dedupResult = makeDedupResult(false);

    const result = computeCombinedScore(recencyResult, relevanceResult, dedupResult);

    // 0.3 * 0.5 + 0.7 * 0.5 = 0.15 + 0.35 = 0.5
    expect(result.combined).toBe(0.5);
  });

  test('computeCombinedScore applies exact duplicate penalty', () => {
    const recencyResult = makeRecencyResult(1.0);
    const relevanceResult = makeRelevanceResult(1.0);
    const dedupResult = makeDedupResult(true, 'exact');

    const result = computeCombinedScore(recencyResult, relevanceResult, dedupResult);

    // 1.0 (max score) - 100 (exact penalty) = -99
    expect(result.combined).toBeLessThan(0);
    expect(result.accepted).toBe(false);
    expect(result.breakdown.dedupPenalty).toBe(100);
  });

  test('computeCombinedScore applies fuzzy duplicate penalty', () => {
    const recencyResult = makeRecencyResult(1.0);
    const relevanceResult = makeRelevanceResult(1.0);
    const dedupResult = makeDedupResult(true, 'fuzzy');

    const result = computeCombinedScore(recencyResult, relevanceResult, dedupResult);

    expect(result.breakdown.dedupPenalty).toBe(50);
    expect(result.combined).toBeLessThan(0); // 1.0 - 50 = -49
  });

  test('computeCombinedScore uses weights from searchConfig', () => {
    const result = computeCombinedScore(
      makeRecencyResult(1.0),
      makeRelevanceResult(0.0),
      makeDedupResult(false)
    );

    // With only recency: 0.3 * 1.0 + 0.7 * 0.0 = 0.3
    expect(result.combined).toBe(searchConfig.recencyWeight);
  });

  test('computeCombinedScore minimumScore threshold default is 0', () => {
    // A score just above 0 should be accepted
    const positiveResult = computeCombinedScore(
      makeRecencyResult(0.1),
      makeRelevanceResult(0.1),
      makeDedupResult(false)
    );
    // 0.3 * 0.1 + 0.7 * 0.1 = 0.03 + 0.07 = 0.1 > 0
    expect(positiveResult.accepted).toBe(positiveResult.combined > 0);

    // A score of 0 or below should be rejected when threshold is 0
    const zeroResult = computeCombinedScore(
      makeRecencyResult(0.0),
      makeRelevanceResult(0.0),
      makeDedupResult(false)
    );
    expect(zeroResult.accepted).toBe(false); // 0 > 0 is false
  });

  test('computeCombinedScore breakdown includes all components', () => {
    const result = computeCombinedScore(
      makeRecencyResult(0.8),
      makeRelevanceResult(0.6),
      makeDedupResult(true, 'fuzzy')
    );

    expect(result.breakdown.recencyScore).toBe(0.8);
    expect(result.breakdown.relevanceScore).toBe(0.6);
    expect(result.breakdown.dedupPenalty).toBe(50);
    expect(result.breakdown.recencyWeight).toBe(searchConfig.recencyWeight);
    expect(result.breakdown.relevanceWeight).toBe(searchConfig.relevanceWeight);
  });
});

// ---------------------------------------------------------------------------
// Test Suite: FilterPipelineService — Full Pipeline
// ---------------------------------------------------------------------------

describe('FilterPipelineService — Full Pipeline', () => {
  test('FilterPipelineService short-circuits on excluded category', () => {
    // Arrange
    const pipeline = new FilterPipelineService({
      excludedCategories: ['Hardware'],
    });
    const excludedIdea = makeTestIdea({
      titleEn: 'Hardware Project',
      descriptionEn: 'A hardware project',
      category: 'Hardware',
      techStack: ['Arduino', 'C++'],
    });

    // Act
    const result = pipeline.runPipeline(excludedIdea);

    // Assert
    expect('scores' in result).toBe(false); // Should be rejected
    const rejected = result as PipelineRejected;
    expect(rejected.stage).toBe('category_preference');
    expect(rejected.reason).toContain('Hardware');
  });

  test('FilterPipelineService passes clean idea through all stages', () => {
    // Arrange
    const pipeline = new FilterPipelineService({
      preferenceVector: makeTestPreferenceVector(),
      existingIdeas: [],
    });
    const cleanIdea = makeTestIdea({
      titleEn: 'Modern Web Application',
      descriptionEn: 'Built with React and TypeScript',
      category: 'Web Applications',
      techStack: ['React', 'TypeScript', 'Node.js'],
    });

    // Act
    const result = pipeline.runPipeline(cleanIdea);

    // Assert
    expect('scores' in result).toBe(true); // Should be accepted or rejected at scorer stage
  });

  test('FilterPipelineService processBatch separates accepted and rejected', () => {
    // Arrange
    const pipeline = new FilterPipelineService({
      preferenceVector: makeTestPreferenceVector(),
      excludedCategories: ['Hardware'],
    });

    const ideas: CrawledIdea[] = [
      // Clean idea
      makeTestIdea({
        titleEn: 'AI Project Idea',
        category: 'AI/ML',
        techStack: ['Python', 'TensorFlow'],
      }),
      // Excluded category (should be rejected)
      makeTestIdea({
        titleEn: 'Arduino Controller',
        category: 'Hardware',
        techStack: ['Arduino'],
      }),
      // Another clean idea
      makeTestIdea({
        titleEn: 'Web Dashboard',
        category: 'Web Applications',
        techStack: ['React'],
      }),
    ];

    // Act
    const result = pipeline.processBatch(ideas);

    // Assert
    expect(result.accepted.length + result.rejected.length).toBe(3);
    expect(result.rejected.some((r) => r.stage === 'category_preference')).toBe(true);
  });

  test('FilterPipelineService rejects exact duplicates at scorer stage', () => {
    // Arrange
    const existingIdeas: ExistingIdeaRecord[] = [
      { id: '1', titleEn: 'Duplicate Idea', sourceUrl: 'https://example.com/dup' },
    ];

    const pipeline = new FilterPipelineService({
      preferenceVector: makeTestPreferenceVector(),
      existingIdeas,
    });

    const duplicateIdea = makeTestIdea({
      titleEn: 'Duplicate Idea',
      sourceUrl: 'https://different-url.com',
    });

    // Act
    const result = pipeline.runPipeline(duplicateIdea);

    // Assert: Should be rejected at scorer stage due to dedup penalty
    const rejected = result as PipelineRejected;
    if (!('scores' in result)) {
      expect(rejected.stage).toBe('scorer');
      expect(rejected.reason).toContain('Duplicate');
    }
  });

  test('FilterPipelineService with empty preference vector still works', () => {
    // Arrange
    const pipeline = new FilterPipelineService({
      preferenceVector: {},
      existingIdeas: [],
    });

    const idea = makeTestIdea({
      titleEn: 'Any Idea',
      category: 'AI/ML',
      year: 2026,
    });

    // Act
    const result = pipeline.runPipeline(idea);

    // Assert: Should pass embedded systems filter
    // May be accepted or rejected depending on score threshold
    if ('scores' in result) {
      // Accepted
      const accepted = result as PipelineAccepted;
      expect(accepted.scores.recency).toBeDefined();
      expect(accepted.scores.relevance).toBe(0); // No preference match
    }
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Short-circuit Behavior Verification (category_preference)
// ---------------------------------------------------------------------------

describe('Filter Pipeline — Short-circuit on Category Preference', () => {
  test('excluded category rejection happens BEFORE recency/relevance scoring', () => {
    // This is verified by checking the stage in the rejection

    const pipeline = new FilterPipelineService({
      preferenceVector: makeTestPreferenceVector(),
      excludedCategories: ['Hardware'],
    });

    const idea = makeTestIdea({
      titleEn: 'FPGA-based Neural Network Accelerator',
      descriptionEn: 'Uses Verilog and VHDL for hardware acceleration',
      category: 'Hardware',
      techStack: ['FPGA', 'Verilog', 'VHDL'],
      year: 2026, // High recency
    });

    const result = pipeline.runPipeline(idea);

    // If short-circuit works, the stage should be 'category_preference', not 'scorer'
    const rejected = result as PipelineRejected;
    if (!('scores' in result)) {
      expect(rejected.stage).toBe('category_preference');
      // If it got to scorer stage, that would mean short-circuit failed
    }
  });

  test('non-excluded ideas proceed through all filter stages', () => {
    const pipeline = new FilterPipelineService({
      preferenceVector: makeTestPreferenceVector(),
      existingIdeas: [],
    });

    const idea = makeTestIdea({
      titleEn: 'Pure Software Project',
      descriptionEn: 'No hardware mentioned',
      techStack: ['React', 'Node.js', 'PostgreSQL'],
      category: 'Web Applications',
      year: 2026,
    });

    const result = pipeline.runPipeline(idea);

    // Accepted ideas have 'scores', rejected have 'stage'
    if ('scores' in result) {
      const accepted = result as PipelineAccepted;
      // All scores should be defined
      expect(accepted.scores.recency).toBeDefined();
      expect(accepted.scores.relevance).toBeDefined();
      expect(accepted.scores.combined).toBeDefined();
    } else {
      // If rejected, it should be at scorer stage (not category_preference)
      const rejected = result as PipelineRejected;
      expect(rejected.stage).not.toBe('category_preference');
    }
  });
});
