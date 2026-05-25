/* ════════════════════════════════════════
   Rate Limiter — Per-Endpoint Sliding Window
   In-memory: swipe POST 60/min, preferences POST 30/min, history GET 120/min
   ════════════════════════════════════════ */

import type { Request, Response, NextFunction } from 'express';

/* ─── Types ────────────────────────────────────────────── */

interface WindowEntry {
  /** Timestamp of the request in milliseconds */
  timestamp: number;
}

interface RateLimitConfig {
  /** Maximum number of requests in the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Human-readable identifier for the rate limit */
  name: string;
}

/* ─── Per-Key Window Store ─────────────────────────────── */

class SlidingWindowStore {
  /** Map of client key → sorted array of request timestamps */
  private windows = new Map<string, WindowEntry[]>();

  /**
   * Attempt to consume a request slot.
   * Returns true if allowed, false if rate-limited.
   */
  consume(key: string, config: RateLimitConfig): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let entries = this.windows.get(key);
    if (!entries) {
      entries = [];
      this.windows.set(key, entries);
    }

    // Remove expired entries
    const valid = entries.filter((e) => e.timestamp > windowStart);
    this.windows.set(key, valid);

    if (valid.length >= config.limit) {
      // Rate limited — calculate retry-after from the oldest entry
      const oldest = valid[0];
      const retryAfterMs = oldest.timestamp + config.windowMs - now;
      return { allowed: false, retryAfterMs: Math.max(1, retryAfterMs) };
    }

    // Allow the request
    valid.push({ timestamp: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  /**
   * Clean up stale entries periodically to prevent memory leaks.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entries] of this.windows.entries()) {
      // Remove windows older than 2× the max window (2 minutes)
      const cutoff = now - 120_000;
      const valid = entries.filter((e) => e.timestamp > cutoff);
      if (valid.length === 0) {
        this.windows.delete(key);
      } else {
        this.windows.set(key, valid);
      }
    }
  }
}

/* ─── Singleton ────────────────────────────────────────── */

const store = new SlidingWindowStore();

// Clean up every 60 seconds
setInterval(() => store.cleanup(), 60_000);

/* ─── Configurations ───────────────────────────────────── */

export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  swipe: {
    limit: 60,
    windowMs: 60_000,
    name: 'swipe',
  },
  preferences: {
    limit: 30,
    windowMs: 60_000,
    name: 'preferences',
  },
  history: {
    limit: 120,
    windowMs: 60_000,
    name: 'history',
  },
};

/* ─── Helper: Extract client key ───────────────────────── */

function getClientKey(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

/* ─── Middleware Factory ───────────────────────────────── */

/**
 * Creates a rate limiter middleware for a specific endpoint.
 *
 * Usage:
 *   router.post('/swipe', rateLimiter('swipe'), handler);
 *   router.post('/preferences', rateLimiter('preferences'), handler);
 *   router.get('/history', rateLimiter('history'), handler);
 */
export function rateLimiter(endpoint: keyof typeof RATE_LIMIT_CONFIGS) {
  const config = RATE_LIMIT_CONFIGS[endpoint];

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientKey = `${config.name}:${getClientKey(req)}`;
    const { allowed, retryAfterMs } = store.consume(clientKey, config);

    if (!allowed) {
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        success: false,
        error: `Too many requests. Try again in ${retryAfterSeconds} second(s).`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds,
      });
      return;
    }

    // Informational headers
    res.setHeader('X-RateLimit-Limit', config.limit);
    res.setHeader('X-RateLimit-Remaining', String(config.limit - 1));

    next();
  };
}

/* ─── Backward-Compatible Named Limiters ───────────────── */

/**
 * Rate limiter for swipe endpoint: 60 requests/minute.
 */
export const swipeRateLimiter = rateLimiter('swipe');

/**
 * Rate limiter for preferences endpoint: 30 requests/minute.
 */
export const preferencesRateLimiter = rateLimiter('preferences');

/**
 * Rate limiter for history endpoint: 120 requests/minute.
 */
export const historyRateLimiter = rateLimiter('history');
