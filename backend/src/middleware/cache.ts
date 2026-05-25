/* ════════════════════════════════════════
   Cache Middleware — In-Memory API Response Cache
   Map-based with TTL and tag-based invalidation
   ════════════════════════════════════════ */

import type { Request, Response, NextFunction } from 'express';

/* ─── Types ────────────────────────────────────────────── */

interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
  tags: string[];
}

interface CacheConfig {
  /** TTL in seconds per tag */
  ttlByTag: Record<string, number>;
}

/* ─── Constants ────────────────────────────────────────── */

const DEFAULT_CONFIG: CacheConfig = {
  ttlByTag: {
    preferences: 30,   // 30 seconds
    ideas: 10,         // 10 seconds (next-idea)
    history: 60,       // 60 seconds
  },
};

const TAG_ROUTE_MAP: Record<string, string[]> = {
  '/api/preferences': ['preferences'],
  '/api/ideas/next': ['ideas'],
  '/api/history': ['history'],
};

/* ─── Cache Store (singleton Map) ──────────────────────── */

class TagCache {
  private store = new Map<string, CacheEntry>();
  private readonly config: CacheConfig;

  constructor(config: CacheConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Get a cached value by key.
   * Returns undefined if the entry is missing or expired.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  /**
   * Set a cached value with tags.
   * TTL is derived from the first matching tag in config.
   */
  set(key: string, data: unknown, tags: string[]): void {
    const ttl = this.resolveTtl(tags);
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttl * 1000,
      tags,
    });
  }

  /**
   * Invalidate all entries that match any of the given tags.
   */
  invalidate(tags: string[]): void {
    for (const [key, entry] of this.store.entries()) {
      if (entry.tags.some((t) => tags.includes(t))) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Invalidate all entries for a given route.
   */
  invalidateRoute(route: string): void {
    const tags = TAG_ROUTE_MAP[route];
    if (tags) {
      this.invalidate(tags);
    }
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Returns the number of non-expired entries.
   */
  get size(): number {
    this.evictExpired();
    return this.store.size;
  }

  /**
   * Purge all expired entries.
   */
  evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  private resolveTtl(tags: string[]): number {
    for (const tag of tags) {
      const ttl = this.config.ttlByTag[tag];
      if (ttl !== undefined) return ttl;
    }
    // Default TTL: 10 seconds
    return 10;
  }
}

/* ─── Singleton Export ─────────────────────────────────── */

/** Global cache instance shared across the application. */
export const apiCache = new TagCache();

/* ─── Middleware Factory ───────────────────────────────── */

interface CacheMiddlewareOptions {
  /** Override TTL for this specific route (seconds). */
  ttl?: number;
  /** Tags for cache invalidation. */
  tags?: string[];
}

/**
 * Creates Express middleware that caches GET responses.
 *
 * The cache key is derived from the request path + query string.
 * On cache hit, the cached response is returned immediately.
 * On cache miss, the response is intercepted, cached, and forwarded.
 *
 * Usage:
 *   router.get('/preferences', cacheMiddleware({ tags: ['preferences'] }), handler);
 */
export function cacheMiddleware(options?: CacheMiddlewareOptions) {
  const tags = options?.tags ?? [];

  return (req: Request, res: Response, next: NextFunction): void => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      next();
      return;
    }

    const cacheKey = `${req.originalUrl}`;

    // Check cache
    const cached = apiCache.get<unknown>(cacheKey);
    if (cached !== undefined) {
      res.json(cached);
      return;
    }

    // Intercept the response send to cache it
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown): Response {
      // Cache successful responses only
      if (res.statusCode >= 200 && res.statusCode < 300) {
        apiCache.set(cacheKey, body, tags);
      }
      return originalJson(body);
    } as res['json'];

    next();
  };
}

/**
 * Creates Express middleware that invalidates cache entries
 * based on the route being written to.
 *
 * Usage:
 *   router.post('/swipe', invalidateCacheMiddleware(['ideas', 'preferences']), handler);
 */
export function invalidateCacheMiddleware(invalidateTags: string[]) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    apiCache.invalidate(invalidateTags);
    next();
  };
}
