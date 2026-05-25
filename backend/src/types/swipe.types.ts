/**
 * Swipe Analytics Types — Feedback Agent Core
 *
 * Defines the type system for the swipe analytics engine:
 * - SwipeEvent: single swipe interaction record
 * - SwipeStats: aggregated statistics by category
 * - CategoryAffinity: learned preference weight per category
 * - PreferenceTrend: time-series preference evolution
 */

/** Swipe direction: left = dislike, right = heart like, up = star/super-like */
export type SwipeDirection = 'left' | 'right' | 'up';

/** Rating scale 1–5 (optional per swipe) */
export type Rating = 1 | 2 | 3 | 4 | 5;

/** A single swipe event captured from the frontend card interaction */
export interface SwipeEvent {
  /** Unique swipe identifier (generated server-side) */
  id: string;
  /** ID of the idea that was swiped */
  idea_id: number;
  /** Session identifier for debounce and context tracking */
  session_id: string;
  /** Swipe direction: left (dislike), right (heart), or up (star) */
  direction: SwipeDirection;
  /** Time in ms between card display and swipe action */
  dwell_time_ms: number;
  /** Optional explicit rating (1–5 stars) before swipe */
  rating?: Rating;
  /** ISO-8601 timestamp of when the swipe occurred */
  timestamp: string;
}

/**
 * Aggregated swipe statistics for a single category.
 * All ratios are pure derivations from raw swipe data.
 */
export interface CategoryStats {
  /** Category name (e.g. "AI/ML", "Web Applications") */
  category: string;
  /** Total swipe count in this category */
  total_swipes: number;
  /** Number of right (like) swipes */
  right_swipes: number;
  /** Right/total ratio — 0.0 (all disliked) to 1.0 (all liked) */
  right_ratio: number;
  /** Average dwell time in milliseconds */
  average_dwell_time_ms: number;
  /** Average rating across rated swipes, or null if none rated */
  average_rating: number | null;
}

/**
 * Complete swipe statistics snapshot.
 * Pure data — no methods, no side effects.
 */
export interface SwipeStats {
  total_swipes: number;
  total_likes: number;
  total_dislikes: number;
  like_ratio: number;
  average_dwell_time_ms: number;
  /** Per-category breakdown */
  categories: Record<string, CategoryStats>;
  last_updated: string;
}

/**
 * Category affinity — the learned preference weight for a category.
 * Range: -1.0 (strong dislike) to +1.0 (strong like), 0 = neutral.
 */
export interface CategoryAffinity {
  category: string;
  /** Affinity score from -1.0 to +1.0 */
  affinity_score: number;
  /** Total swipe count informing this score */
  swipe_count: number;
  /** Direction of recent affinity change */
  trend: 'rising' | 'falling' | 'stable';
  /** ISO-8601 timestamp of last swipe in this category */
  last_swipe_at: string;
}

/**
 * Preference trend — evolution of a category's like ratio over time.
 * Used to detect which categories are gaining or losing user interest.
 */
export interface PreferenceTrend {
  category: string;
  /** Lookback period label */
  period: '24h' | '7d' | '30d' | 'all';
  /** Ordered time-series data points (oldest first) */
  data_points: Array<{
    /** Date label for this bucket */
    date: string;
    /** Like ratio in this bucket (0.0–1.0) */
    like_ratio: number;
    /** Number of swipes in this bucket */
    swipe_count: number;
    /** Running cumulative affinity score */
    cumulative_affinity: number;
  }>;
  /** Overall trend direction */
  direction: 'up' | 'down' | 'stable';
  /** Magnitude of the trend (0.0–1.0) */
  magnitude: number;
}

/**
 * Geo-distribution of liked ideas by country.
 * Provides insight into which educational systems the user prefers.
 */
export interface GeoPreference {
  country: string;
  like_count: number;
  swipe_count: number;
  like_ratio: number;
}
