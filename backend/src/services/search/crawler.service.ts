/**
 * CrawlerService — main orchestrator for the deep search background worker.
 *
 * Coordinates the full crawl pipeline:
 *   1. Crawl university project pages → scrape ideas
 *   2. Crawl GitHub trending repos → extract ideas
 *   3. Normalize all raw data → CrawledIdea schema
 *   4. Dedup against existing database entries
 *   5. Store new unique ideas
 *   6. Emit event when new ideas are found
 *
 * Configurable interval (default: 1 hour), concurrency (max 3), and delay (2s).
 * All per-page status, errors, rate-limit info are logged.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type {
  CrawledIdea,
  CrawlResult,
  NewIdeasFoundEvent,
  SearchConfig,
  UniversitySource,
} from '../../types/search.types';
import { DEFAULT_SEARCH_CONFIG } from '../../types/search.types';
import { UNIVERSITY_SOURCES } from './sources/universities';
import { scrapeAllLanguages, trendingRepoToIdea } from './sources/github-trending';
import {
  parseGenericProjectPage,
  parseTablePage,
  parseListPage,
} from './scraper/html-parser';
import { normalizeBatch } from './normalizer';
import { checkDuplicate, registerIdea, getDedupStats } from './dedup.service';

// ---------------------------------------------------------------------------
// Logger helper
// ---------------------------------------------------------------------------

function log(
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG',
  message: string,
  meta?: Record<string, unknown>,
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    component: 'CrawlerService',
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

// ---------------------------------------------------------------------------
// Rate limiter helper
// ---------------------------------------------------------------------------

/**
 * Simple rate limiter: ensures at most `concurrency` async operations
 * run simultaneously, with a minimum `delayMs` gap between starts.
 */
class RateLimiter {
  private active = 0;
  private queue: (() => void)[] = [];
  private lastRun = 0;

  constructor(
    private concurrency: number,
    private delayMs: number,
  ) {}

  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    // Wait for a slot
    if (this.active >= this.concurrency) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active++;

    // Enforce minimum delay
    const now = Date.now();
    const waitTime = Math.max(0, this.delayMs - (now - this.lastRun));
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.lastRun = Date.now();

    try {
      return await fn();
    } finally {
      this.active--;
      // Schedule next queued item
      const next = this.queue.shift();
      if (next) setTimeout(next, 0);
    }
  }

  get stats(): { active: number; queued: number } {
    return { active: this.active, queued: this.queue.length };
  }
}

// ---------------------------------------------------------------------------
// Crawler service
// ---------------------------------------------------------------------------

export class CrawlerService {
  private config: SearchConfig;
  private rateLimiter: RateLimiter;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private onNewIdeas: ((event: NewIdeasFoundEvent) => void) | null = null;

  constructor(config?: Partial<SearchConfig>) {
    this.config = { ...DEFAULT_SEARCH_CONFIG, ...config };
    this.rateLimiter = new RateLimiter(
      this.config.maxConcurrency,
      this.config.requestDelayMs,
    );
  }

  /** Register a callback that fires when new ideas flow through the pipeline */
  onNewIdeasFound(callback: (event: NewIdeasFoundEvent) => void): void {
    this.onNewIdeas = callback;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  /** Start the crawler loop. Runs immediately, then repeats at the configured interval. */
  start(): void {
    if (this.intervalId) {
      log('WARN', 'Crawler already running — ignoring start()');
      return;
    }

    log('INFO', 'Crawler service starting', {
      intervalMs: this.config.crawlIntervalMs,
      maxConcurrency: this.config.maxConcurrency,
      requestDelayMs: this.config.requestDelayMs,
    });

    // Run immediately, then on interval
    this.runFullCycle();
    this.intervalId = setInterval(() => {
      this.runFullCycle();
    }, this.config.crawlIntervalMs);

    log('INFO', 'Crawler interval scheduled', {
      intervalMs: this.config.crawlIntervalMs,
    });
  }

  /** Graceful stop */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    log('INFO', 'Crawler service stopped');
  }

  /** Trigger a single manual crawl cycle */
  async runOnce(): Promise<NewIdeasFoundEvent> {
    return this.runFullCycle();
  }

  // ── Full crawl cycle ───────────────────────────────────────────────────

  private async runFullCycle(): Promise<NewIdeasFoundEvent> {
    if (this.isRunning) {
      log('WARN', 'Previous crawl cycle still running — skipping');
      return {
        totalCrawled: 0,
        totalAccepted: 0,
        totalDeduplicated: 0,
        ideas: [],
        sources: [],
      };
    }

    this.isRunning = true;
    const cycleStart = Date.now();
    log('INFO', '=== Crawl cycle started ===', {
      dedupStats: getDedupStats(),
    });

    const allResults: CrawlResult[] = [];
    const allNormalized: CrawledIdea[] = [];

    try {
      // 1. Crawl university sources
      if (this.config.enableUniversityCrawl) {
        const uniResults = await this.crawlUniversities();
        allResults.push(...uniResults.results);
        allNormalized.push(...uniResults.normalized);
      }

      // 2. Crawl GitHub trending
      if (this.config.enableGithubTrending) {
        const ghResults = await this.crawlGitHubTrending();
        allResults.push(...ghResults.results);
        allNormalized.push(...ghResults.normalized);
      }

      // 3. Dedup
      const { accepted, deduplicated } = await this.dedupPipeline(allNormalized);

      // 4. Emit event
      const event: NewIdeasFoundEvent = {
        totalCrawled: allNormalized.length,
        totalAccepted: accepted.length,
        totalDeduplicated: deduplicated,
        ideas: accepted,
        sources: [
          ...new Set(allResults.map((r) => r.source)),
        ],
      };

      if (this.onNewIdeas) {
        this.onNewIdeas(event);
      }

      const cycleDuration = Date.now() - cycleStart;
      log('INFO', `=== Crawl cycle completed in ${cycleDuration}ms ===`, {
        totalCrawled: event.totalCrawled,
        totalAccepted: event.totalAccepted,
        totalDeduplicated: event.totalDeduplicated,
        sources: event.sources,
        durationMs: cycleDuration,
      });

      return event;
    } catch (error) {
      log('ERROR', 'Crawl cycle failed', {
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - cycleStart,
      });
      return {
        totalCrawled: allNormalized.length,
        totalAccepted: 0,
        totalDeduplicated: 0,
        ideas: [],
        sources: [],
      };
    } finally {
      this.isRunning = false;
    }
  }

  // ── University crawler ─────────────────────────────────────────────────

  private async crawlUniversities(): Promise<{
    results: CrawlResult[];
    normalized: CrawledIdea[];
  }> {
    const results: CrawlResult[] = [];
    const rawEntries: Record<string, unknown>[] = [];

    // Only crawl universities with resolved URLs (requiresResearch = false)
    const sources = UNIVERSITY_SOURCES.filter((s) => !s.requiresResearch);

    log('INFO', `Crawling ${sources.length} university sources`, {
      totalInConfig: UNIVERSITY_SOURCES.length,
      resolvedSources: sources.length,
    });

    for (const source of sources) {
      for (const pageUrl of source.projectPages) {
        const startTime = Date.now();
        let statusCode: number | null = null;
        let errors: string[] = [];

        try {
          const result = await this.rateLimiter.acquire(async () => {
            const response = await axios.get(pageUrl, {
              timeout: this.config.requestTimeoutMs,
              headers: {
                'User-Agent': this.config.userAgent,
                Accept: 'text/html,application/xhtml+xml',
              },
              validateStatus: () => true, // Don't throw on non-2xx
            });

            statusCode = response.status;

            if (response.status !== 200) {
              const errMsg = `HTTP ${response.status} for ${pageUrl}`;
              errors.push(errMsg);
              log('WARN', errMsg, { source: source.name, url: pageUrl });
              return null;
            }

            const html: string = response.data;

            // Try each parser strategy
            let parsed = parseGenericProjectPage(html, pageUrl, source.name);
            if (parsed.length === 0) {
              parsed = parseTablePage(html, pageUrl, source.name);
            }
            if (parsed.length === 0) {
              parsed = parseListPage(html, pageUrl, source.name);
            }

            rawEntries.push(...parsed);
            return parsed.length;
          });

          const durationMs = Date.now() - startTime;

          if (result !== null) {
            results.push({
              source: source.name,
              sourceType: 'university',
              url: pageUrl,
              success: true,
              ideasFound: result,
              ideasAccepted: 0, // will be filled after normalization
              errors: [],
              statusCode,
              durationMs,
              rateLimitRemaining: null,
              crawledAt: new Date().toISOString(),
            });
            log('INFO', `Crawled ${source.name}`, {
              url: pageUrl,
              ideasFound: result,
              durationMs,
            });
          } else {
            results.push({
              source: source.name,
              sourceType: 'university',
              url: pageUrl,
              success: false,
              ideasFound: 0,
              ideasAccepted: 0,
              errors,
              statusCode,
              durationMs,
              rateLimitRemaining: null,
              crawledAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          const durationMs = Date.now() - startTime;
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          errors.push(errorMsg);

          log('WARN', `Failed to crawl ${source.name}`, {
            url: pageUrl,
            error: errorMsg,
            durationMs,
          });

          results.push({
            source: source.name,
            sourceType: 'university',
            url: pageUrl,
            success: false,
            ideasFound: 0,
            ideasAccepted: 0,
            errors,
            statusCode,
            durationMs,
            rateLimitRemaining: null,
            crawledAt: new Date().toISOString(),
          });
        }
      }
    }

    // Normalize all raw entries
    const normalized = normalizeBatch(rawEntries);
    log('INFO', 'University crawl normalization complete', {
      rawEntries: rawEntries.length,
      normalized: normalized.length,
    });

    // Update ideasAccepted counts
    for (const result of results) {
      result.ideasAccepted = result.ideasFound;
      // In a more precise implementation, we'd track per-page acceptance
    }

    return { results, normalized };
  }

  // ── GitHub trending crawler ────────────────────────────────────────────

  private async crawlGitHubTrending(): Promise<{
    results: CrawlResult[];
    normalized: CrawledIdea[];
  }> {
    const results: CrawlResult[] = [];
    const startTime = Date.now();

    try {
      const repos = await scrapeAllLanguages(this.config.githubLanguages);
      const rawEntries = repos.map((repo) => ({
        ...repo,
        title: repo.name,
        description: repo.description,
      }));

      // Convert to ideas directly (the normalizer handles the rest)
      const ideas = repos.map(trendingRepoToIdea);

      const durationMs = Date.now() - startTime;

      results.push({
        source: 'GitHub Trending',
        sourceType: 'github',
        url: 'https://github.com/trending',
        success: true,
        ideasFound: repos.length,
        ideasAccepted: ideas.length,
        errors: [],
        statusCode: 200,
        durationMs,
        rateLimitRemaining: null,
        crawledAt: new Date().toISOString(),
      });

      log('INFO', 'GitHub trending crawl complete', {
        reposFound: repos.length,
        languages: this.config.githubLanguages,
        durationMs,
      });

      return { results, normalized: ideas };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMsg =
        error instanceof Error ? error.message : String(error);

      log('ERROR', 'GitHub trending crawl failed', {
        error: errorMsg,
        durationMs,
      });

      results.push({
        source: 'GitHub Trending',
        sourceType: 'github',
        url: 'https://github.com/trending',
        success: false,
        ideasFound: 0,
        ideasAccepted: 0,
        errors: [errorMsg],
        statusCode: null,
        durationMs,
        rateLimitRemaining: null,
        crawledAt: new Date().toISOString(),
      });

      return { results, normalized: [] };
    }
  }

  // ── Dedup pipeline ─────────────────────────────────────────────────────

  private async dedupPipeline(
    ideas: CrawledIdea[],
  ): Promise<{ accepted: CrawledIdea[]; deduplicated: number }> {
    const accepted: CrawledIdea[] = [];
    let deduplicated = 0;

    for (const idea of ideas) {
      const dedupResult = checkDuplicate(idea);
      if (dedupResult.isDuplicate) {
        deduplicated++;
      } else {
        registerIdea(idea);
        accepted.push(idea);
      }
    }

    log('INFO', 'Dedup pipeline complete', {
      input: ideas.length,
      accepted: accepted.length,
      deduplicated,
      dedupStats: getDedupStats(),
    });

    return { accepted, deduplicated };
  }
}

/** Factory function for cleaner instantiation */
export function createCrawlerService(
  config?: Partial<SearchConfig>,
): CrawlerService {
  return new CrawlerService(config);
}
