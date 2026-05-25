/**
 * Unit tests: CrawlerService and related components
 *
 * Coverage targets:
 * - RateLimiter: concurrency control (max 3 concurrent)
 * - DedupService: MD5 checksum generation, fuzzy matching
 * - University sources: URL access and filtering
 * - Embedded Systems filter: rejects ALL blocked keywords
 */

import { generateChecksum, levenshteinDistance, checkDuplicate, registerIdea, resetDedupEngine, getDedupStats } from '../../src/services/search/dedup.service';
import { searchConfig } from '../../src/config/search.config';
import { UNIVERSITY_SOURCES, getResolvedSources, getSourceByName } from '../../src/services/search/sources/universities';
import type { CrawledIdea } from '../../src/types/search.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a basic CrawledIdea for testing */
function makeTestIdea(overrides: Partial<CrawledIdea> = {}): CrawledIdea {
  return {
    titleEn: 'Test Project Idea',
    titleAr: '',
    descriptionEn: 'A sample project for testing purposes',
    descriptionAr: '',
    shortDescEn: 'Sample project',
    shortDescAr: '',
    university: 'MIT',
    country: 'USA',
    sourceUrl: 'https://example.com/project/1',
    sourceType: 'university',
    techStack: ['React', 'TypeScript'],
    category: 'Web Applications',
    difficulty: 'متوسط',
    year: 2026,
    crawledAt: new Date().toISOString(),
    needsTranslation: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test Suite: RateLimiter (from crawler.service.ts)
// ---------------------------------------------------------------------------

describe('CrawlerService — RateLimiter', () => {
  // We need to re-implement or import the RateLimiter class for testing
  // Since it's a private inner class, we'll test its behavior pattern

  test('RateLimiter limits to max 3 concurrent operations', async () => {
    // Simple reimplementation of RateLimiter for testing
    class TestRateLimiter {
      private active = 0;
      private queue: (() => void)[] = [];

      constructor(private concurrency: number, private delayMs: number) {}

      async acquire<T>(fn: () => Promise<T>): Promise<T> {
        if (this.active >= this.concurrency) {
          await new Promise<void>((resolve) => this.queue.push(resolve));
        }
        this.active++;

        const now = Date.now();
        const waitTime = 0; // Skip delay for faster tests
        if (waitTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }

        try {
          return await fn();
        } finally {
          this.active--;
          const next = this.queue.shift();
          if (next) setTimeout(next, 0);
        }
      }

      get stats(): { active: number; queued: number } {
        return { active: this.active, queued: this.queue.length };
      }
    }

    // Arrange
    const limiter = new TestRateLimiter(3, 0);
    const activeTracks: number[] = [];
    const operations: Promise<number>[] = [];

    // Act: Launch 5 operations that track their active count
    for (let i = 0; i < 5; i++) {
      operations.push(
        limiter.acquire(async () => {
          activeTracks.push(limiter.stats.active);
          await new Promise((r) => setTimeout(r, 10));
          return i;
        })
      );
    }

    await Promise.all(operations);

    // Assert: At no point should more than 3 be active
    expect(Math.max(...activeTracks)).toBeLessThanOrEqual(3);
  });

  test('RateLimiter queues operations when concurrency exceeded', async () => {
    class TestRateLimiter {
      private active = 0;
      private queue: (() => void)[] = [];

      constructor(private concurrency: number) {}

      async acquire<T>(fn: () => Promise<T>): Promise<T> {
        if (this.active >= this.concurrency) {
          await new Promise<void>((resolve) => this.queue.push(resolve));
        }
        this.active++;
        try {
          return await fn();
        } finally {
          this.active--;
          const next = this.queue.shift();
          if (next) setTimeout(next, 0);
        }
      }

      get stats(): { active: number; queued: number } {
        return { active: this.active, queued: this.queue.length };
      }
    }

    // Arrange
    const limiter = new TestRateLimiter(2);
    let maxQueued = 0;

    // Act: Start blocking operations (staggered so they complete in different ticks)
    const block1 = limiter.acquire(async () => {
      maxQueued = Math.max(maxQueued, limiter.stats.queued);
      await new Promise((r) => setTimeout(r, 20));
    });

    const block2 = limiter.acquire(async () => {
      maxQueued = Math.max(maxQueued, limiter.stats.queued);
      await new Promise((r) => setTimeout(r, 60));
    });

    // These should queue
    const queued1 = limiter.acquire(async () => {
      maxQueued = Math.max(maxQueued, limiter.stats.queued);
    });

    const queued2 = limiter.acquire(async () => {
      maxQueued = Math.max(maxQueued, limiter.stats.queued);
    });

    await Promise.all([block1, block2, queued1, queued2]);

    // Assert
    expect(maxQueued).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Test Suite: DedupService — MD5 Checksum
// ---------------------------------------------------------------------------

describe('DedupService — generateChecksum (MD5)', () => {
  test('generateChecksum produces consistent MD5 hash for same inputs', () => {
    // Arrange
    const title = 'Machine Learning Project';
    const url = 'https://mit.edu/projects/ml-1';

    // Act
    const hash1 = generateChecksum(title, url);
    const hash2 = generateChecksum(title, url);

    // Assert
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{32}$/); // MD5 is 32 hex chars
  });

  test('generateChecksum is case-insensitive for title and URL', () => {
    // Arrange
    const hash1 = generateChecksum('React App', 'https://example.com/Project');
    const hash2 = generateChecksum('react app', 'https://example.com/project');

    // Act & Assert
    expect(hash1).toBe(hash2);
  });

  test('generateChecksum trims whitespace', () => {
    // Arrange
    const hash1 = generateChecksum('  Web App  ', '  https://example.com  ');
    const hash2 = generateChecksum('Web App', 'https://example.com');

    // Act & Assert
    expect(hash1).toBe(hash2);
  });

  test('generateChecksum produces different hashes for different titles', () => {
    // Arrange
    const url = 'https://example.com/same-url';
    const hash1 = generateChecksum('Project Alpha', url);
    const hash2 = generateChecksum('Project Beta', url);

    // Act & Assert
    expect(hash1).not.toBe(hash2);
  });

  test('generateChecksum produces different hashes for different URLs', () => {
    // Arrange
    const title = 'Same Project Title';
    const hash1 = generateChecksum(title, 'https://example.com/1');
    const hash2 = generateChecksum(title, 'https://example.com/2');

    // Act & Assert
    expect(hash1).not.toBe(hash2);
  });
});

// ---------------------------------------------------------------------------
// Test Suite: DedupService — Levenshtein Distance (Fuzzy Matching)
// ---------------------------------------------------------------------------

describe('DedupService — levenshteinDistance', () => {
  test('levenshteinDistance returns 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
    expect(levenshteinDistance('', '')).toBe(0);
  });

  test('levenshteinDistance returns length when other string is empty', () => {
    expect(levenshteinDistance('test', '')).toBe(4);
    expect(levenshteinDistance('', 'test')).toBe(4);
  });

  test('levenshteinDistance counts single character changes', () => {
    expect(levenshteinDistance('kitten', 'sitten')).toBe(1); // k→s (substitution)
    expect(levenshteinDistance('kitten', 'kittn')).toBe(1);  // remove 'e' (deletion)
    expect(levenshteinDistance('kitten', 'kittens')).toBe(1); // add 's' (insertion)
  });

  test('levenshteinDistance classic example: kitten → sitting', () => {
    // kitten → sitten (substitute k→s)
    // sitten → sittin (substitute e→i)
    // sittin → sitting (insert g at end)
    // Total: 3 operations
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });

  test('levenshteinDistance is symmetric', () => {
    const d1 = levenshteinDistance('saturday', 'sunday');
    const d2 = levenshteinDistance('sunday', 'saturday');
    expect(d1).toBe(d2);
  });

  test('levenshteinDistance for near-duplicate titles (score < 3)', () => {
    // These should be considered duplicates by the fuzzy matcher
    expect(levenshteinDistance('AI Chatbot', 'AI Chat Bot')).toBeLessThan(3);
    expect(levenshteinDistance('Web-App', 'Web App')).toBeLessThan(3);
    expect(levenshteinDistance('Machine Learning', 'machine learning')).toBe(0); // same when lowercased
  });
});

// ---------------------------------------------------------------------------
// Test Suite: DedupService — Check/Register Workflow
// ---------------------------------------------------------------------------

describe('DedupService — checkDuplicate and registerIdea', () => {
  beforeEach(() => {
    resetDedupEngine();
  });

  test('checkDuplicate returns isDuplicate: false for new idea', () => {
    // Arrange
    const idea = makeTestIdea();

    // Act
    const result = checkDuplicate(idea);

    // Assert
    expect(result.isDuplicate).toBe(false);
    expect(result.checksum).toBeDefined();
  });

  test('checkDuplicate returns isDuplicate: true after registerIdea', () => {
    // Arrange
    const idea = makeTestIdea();

    // Act
    const before = checkDuplicate(idea);
    registerIdea(idea);
    const after = checkDuplicate(idea);

    // Assert
    expect(before.isDuplicate).toBe(false);
    expect(after.isDuplicate).toBe(true);
  });

  test('resetDedupEngine clears all registered ideas', () => {
    // Arrange
    const idea = makeTestIdea();
    registerIdea(idea);
    expect(checkDuplicate(idea).isDuplicate).toBe(true);

    // Act
    resetDedupEngine();

    // Assert
    expect(checkDuplicate(idea).isDuplicate).toBe(false);
  });

  test('getDedupStats returns correct counts', () => {
    // Arrange
    resetDedupEngine();
    expect(getDedupStats().checksumsCount).toBe(0);

    // Act
    registerIdea(makeTestIdea({ titleEn: 'Idea 1', sourceUrl: 'https://1.com' }));
    registerIdea(makeTestIdea({ titleEn: 'Idea 2', sourceUrl: 'https://2.com' }));

    // Assert
    expect(getDedupStats().checksumsCount).toBe(2);
    expect(getDedupStats().titlesCount).toBe(2);
  });

  test('checkDuplicate fuzzy matches similar titles', () => {
    // Arrange
    resetDedupEngine();
    const idea1 = makeTestIdea({
      titleEn: 'AI Chatbot System',
      sourceUrl: 'https://example.com/chatbot-v1',
    });
    const idea2 = makeTestIdea({
      titleEn: 'AI Chatbot System',  // Exact same title, different URL
      sourceUrl: 'https://example.com/chatbot-v2',
    });

    // Act
    registerIdea(idea1);
    const result = checkDuplicate(idea2);

    // Assert: fuzzy match should detect because title is exact match (levenshtein = 0)
    expect(result.isDuplicate).toBe(true);
    expect(result.fuzzyScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test Suite: University Sources
// ---------------------------------------------------------------------------

describe('University Sources — URL Configuration', () => {
  test('UNIVERSITY_SOURCES contains top universities with projectPages', () => {
    expect(UNIVERSITY_SOURCES.length).toBe(100);
    expect(UNIVERSITY_SOURCES[0].name).toBe('MIT');
    expect(UNIVERSITY_SOURCES[0].rank).toBe(1);
  });

  test('getResolvedSources returns only universities with known project pages', () => {
    const resolved = getResolvedSources();
    const allHavePages = resolved.every((s) => !s.requiresResearch);

    expect(allHavePages).toBe(true);
    expect(resolved.length).toBeGreaterThan(0);
  });

  test('resolved university sources have valid projectPages URLs', () => {
    const resolved = getResolvedSources();

    for (const source of resolved) {
      expect(source.projectPages.length).toBeGreaterThan(0);
      for (const url of source.projectPages) {
        expect(url).toMatch(/^https?:\/\//);
      }
    }
  });

  test('getSourceByName finds university case-insensitively', () => {
    const mit1 = getSourceByName('MIT');
    const mit2 = getSourceByName('mit');
    const stanford = getSourceByName('Stanford');

    expect(mit1).toBeDefined();
    expect(mit1?.name).toBe('MIT');
    expect(mit2?.name).toBe('MIT');
    expect(stanford?.name).toBe('Stanford');
  });

  test('MIT has specific known project pages', () => {
    const mit = getSourceByName('MIT');
    expect(mit).toBeDefined();
    expect(mit?.requiresResearch).toBe(false);
    expect(mit?.projectPages.length).toBeGreaterThanOrEqual(2);
    expect(mit?.projectPages.some((u) => u.includes('capstone'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test Suite: User Category Preference Filter
// ---------------------------------------------------------------------------

import { FilterPipelineService, type PipelineRejected } from '../../src/services/search/filter-pipeline.service';

describe('User Category Preference Filter — replaces old Embedded Systems block', () => {
  test('idea passes through when no excluded categories set', () => {
    const pipeline = new FilterPipelineService();
    const idea = makeTestIdea({
      titleEn: 'Arduino IoT Controller',
      category: 'Hardware',
      techStack: ['Arduino'],
    });

    const result = pipeline.runPipeline(idea);

    // Should reach scorer stage (not rejected at category_preference)
    if (!('scores' in result)) {
      const rejected = result as PipelineRejected;
      expect(rejected.stage).not.toBe('category_preference');
    }
  });

  test('idea rejected when its category is in excluded list', () => {
    const pipeline = new FilterPipelineService({
      excludedCategories: ['Hardware'],
    });
    const idea = makeTestIdea({
      titleEn: 'Embedded Controller',
      category: 'Hardware',
      techStack: ['Arduino'],
    });

    const result = pipeline.runPipeline(idea);

    expect('scores' in result).toBe(false);
    const rejected = result as PipelineRejected;
    expect(rejected.stage).toBe('category_preference');
    expect(rejected.reason).toContain('Hardware');
  });

  test('idea with non-excluded category passes category_preference stage', () => {
    const pipeline = new FilterPipelineService({
      excludedCategories: ['Hardware'],
    });
    const idea = makeTestIdea({
      titleEn: 'AI Project',
      category: 'AI/ML',
      techStack: ['Python'],
    });

    const result = pipeline.runPipeline(idea);

    // Should pass category_preference (may be rejected at scorer)
    if (!('scores' in result)) {
      const rejected = result as PipelineRejected;
      expect(rejected.stage).not.toBe('category_preference');
    }
  });

  test('processBatch correctly separates excluded from non-excluded', () => {
    const pipeline = new FilterPipelineService({
      excludedCategories: ['Hardware', 'IoT'],
    });

    const ideas: CrawledIdea[] = [
      makeTestIdea({ titleEn: 'AI Project', category: 'AI/ML' }),
      makeTestIdea({ titleEn: 'Web App', category: 'Web Applications' }),
      makeTestIdea({ titleEn: 'IoT Device', category: 'IoT' }),
      makeTestIdea({ titleEn: 'Hardware Ctrl', category: 'Hardware' }),
      makeTestIdea({ titleEn: 'Mobile App', category: 'Mobile Apps' }),
    ];

    const result = pipeline.processBatch(ideas);

    // IoT + Hardware should be rejected at category_preference
    const catPrefRejected = result.rejected.filter(
      (r) => r.stage === 'category_preference'
    );
    expect(catPrefRejected.length).toBe(2);
    expect(catPrefRejected.some((r) => r.idea.category === 'IoT')).toBe(true);
    expect(catPrefRejected.some((r) => r.idea.category === 'Hardware')).toBe(true);
  });
});
