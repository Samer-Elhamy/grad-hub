#!/usr/bin/env node
/**
 * Crawler Worker — background process entry point for the deep search crawler.
 *
 * Can be invoked in three modes:
 *   1. **Standalone process**   — `npx ts-node crawler-worker.ts`
 *   2. **Cron job**             — Scheduled via system cron / Windows Task Scheduler
 *   3. **Inline/interval**      — Imported programmatically and started in-process
 *
 * Graceful shutdown on SIGTERM / SIGINT.
 * Reports status via stdout JSON lines (one per line, newline-delimited JSON).
 */

import { CrawlerService } from './crawler.service';
import type { NewIdeasFoundEvent, SearchConfig } from '../../types/search.types';
import { DEFAULT_SEARCH_CONFIG } from '../../types/search.types';

// ---------------------------------------------------------------------------
// Mode detection
// ---------------------------------------------------------------------------

type WorkerMode = 'standalone' | 'cron' | 'inline';

function detectMode(): WorkerMode {
  // If started via CLI with --cron flag
  if (process.argv.includes('--cron')) return 'cron';
  // If imported programmatically (require.main check)
  if (require.main !== module) return 'inline';
  // Default: standalone
  return 'standalone';
}

// ---------------------------------------------------------------------------
// JSON-line status reporter
// ---------------------------------------------------------------------------

interface StatusReport {
  type: 'status' | 'error' | 'cycle_complete' | 'shutdown';
  timestamp: string;
  mode: WorkerMode;
  message: string;
  data?: Record<string, unknown>;
}

function report(report: StatusReport): void {
  process.stdout.write(JSON.stringify(report) + '\n');
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

let isShuttingDown = false;
let crawlerService: CrawlerService | null = null;

function handleShutdown(signal: string): void {
  if (isShuttingDown) return;
  isShuttingDown = true;

  report({
    type: 'shutdown',
    timestamp: new Date().toISOString(),
    mode: currentMode,
    message: `Received ${signal}, shutting down gracefully...`,
  });

  if (crawlerService) {
    crawlerService.stop();
  }

  report({
    type: 'shutdown',
    timestamp: new Date().toISOString(),
    mode: currentMode,
    message: 'Shutdown complete',
  });

  process.exit(0);
}

// ---------------------------------------------------------------------------
// Run modes
// ---------------------------------------------------------------------------

let currentMode: WorkerMode = 'standalone';

/**
 * Start the crawler as a long-running standalone process.
 * Runs cycles at the configured interval (default: 1 hour) indefinitely.
 */
async function runStandalone(config?: Partial<SearchConfig>): Promise<void> {
  currentMode = 'standalone';
  report({
    type: 'status',
    timestamp: new Date().toISOString(),
    mode: currentMode,
    message: 'Starting standalone crawler worker',
    data: { config: { ...DEFAULT_SEARCH_CONFIG, ...config } },
  });

  crawlerService = new CrawlerService(config);

  crawlerService.onNewIdeasFound((event: NewIdeasFoundEvent) => {
    report({
      type: 'cycle_complete',
      timestamp: new Date().toISOString(),
      mode: currentMode,
      message: `Crawl cycle completed: ${event.totalAccepted} new ideas found`,
      data: {
        totalCrawled: event.totalCrawled,
        totalAccepted: event.totalAccepted,
        totalDeduplicated: event.totalDeduplicated,
        sources: event.sources,
        ideaTitles: event.ideas.map((i) => i.titleEn),
      },
    });
  });

  crawlerService.start();
}

/**
 * Run a single crawl cycle (for cron mode).
 * The process exits after the cycle completes.
 */
async function runCron(config?: Partial<SearchConfig>): Promise<void> {
  currentMode = 'cron';
  report({
    type: 'status',
    timestamp: new Date().toISOString(),
    mode: currentMode,
    message: 'Starting one-shot cron crawl cycle',
  });

  const service = new CrawlerService(config);
  crawlerService = service;

  try {
    const event = await service.runOnce();
    report({
      type: 'cycle_complete',
      timestamp: new Date().toISOString(),
      mode: currentMode,
      message: `Cron cycle complete: ${event.totalAccepted} new ideas from ${event.sources.length} sources`,
      data: {
        totalCrawled: event.totalCrawled,
        totalAccepted: event.totalAccepted,
        totalDeduplicated: event.totalDeduplicated,
        sources: event.sources,
      },
    });
  } catch (error) {
    report({
      type: 'error',
      timestamp: new Date().toISOString(),
      mode: currentMode,
      message: 'Cron cycle failed',
      data: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
  } finally {
    process.exit(0);
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

// Graceful shutdown handlers
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// ---- Parse CLI args ----

function parseArgs(): Partial<SearchConfig> {
  const config: Partial<SearchConfig> = {};
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--interval':
        config.crawlIntervalMs = parseInt(args[++i], 10) || DEFAULT_SEARCH_CONFIG.crawlIntervalMs;
        break;
      case '--concurrency':
        config.maxConcurrency = parseInt(args[++i], 10) || DEFAULT_SEARCH_CONFIG.maxConcurrency;
        break;
      case '--delay':
        config.requestDelayMs = parseInt(args[++i], 10) || DEFAULT_SEARCH_CONFIG.requestDelayMs;
        break;
      case '--timeout':
        config.requestTimeoutMs = parseInt(args[++i], 10) || DEFAULT_SEARCH_CONFIG.requestTimeoutMs;
        break;
      case '--no-github':
        config.enableGithubTrending = false;
        break;
      case '--no-universities':
        config.enableUniversityCrawl = false;
        break;
      case '--languages':
        config.githubLanguages = args[++i]?.split(',') ?? DEFAULT_SEARCH_CONFIG.githubLanguages;
        break;
      case '--cron':
        // Already handled in detectMode
        break;
    }
  }

  return config;
}

// ---- Entry point ----

const mode = detectMode();
const cliConfig = parseArgs();

switch (mode) {
  case 'standalone':
    runStandalone(cliConfig);
    break;
  case 'cron':
    runCron(cliConfig);
    break;
  case 'inline':
    // When imported, the module just exports the CrawlerService.
    // Callers are responsible for managing the lifecycle.
    report({
      type: 'status',
      timestamp: new Date().toISOString(),
      mode: 'inline',
      message: 'Crawler worker loaded as module — caller must manage lifecycle',
    });
    break;
}

// When running as a module, export the CrawlerService and helpers
export { CrawlerService } from './crawler.service';
export type { NewIdeasFoundEvent, SearchConfig } from '../../types/search.types';
