import type { CreateSwipeInput } from '../validators/swipe-validator';
import type { SwipeRecord, PreferenceVector, Rating } from '../types/api';

/**
 * SwipeService — records swipe interactions and updates preference vectors.
 *
 * Note: This is a stub/mock implementation for route scaffolding.
 * In production, this writes to swipe_history table and recalculates the
 * preference vector using the Feedback Agent's AI-powered analytics.
 */

/** In-memory swipe history (replaces PostgreSQL swipe_history table) */
const swipeHistory: SwipeRecord[] = [];

/** Current preference vector (stored in-memory, replaces DB) */
let currentPreferences: PreferenceVector = {
  category_weights: {},
  keyword_weights: {},
  excluded_categories: [],
  difficulty_preference: null,
  last_updated: new Date().toISOString(),
};

/** Record a swipe interaction and return the updated preference vector */
export async function recordSwipe(input: CreateSwipeInput): Promise<{
  record: SwipeRecord;
  updatedPreferences: PreferenceVector;
}> {
  const record: SwipeRecord = {
    id: `swipe_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    idea_id: input.idea_id,
    direction: input.direction === 'up' ? 'right' : input.direction,
    dwell_time_ms: input.dwell_time_ms,
    rating: input.rating as Rating | undefined,
    timestamp: new Date().toISOString(),
  };

  swipeHistory.push(record);

  // TODO: Replace with Feedback Agent AI analytics
  // For now, update preference vector with simple heuristic
  currentPreferences = updatePreferenceVectorSimple(currentPreferences, record);

  return { record, updatedPreferences: { ...currentPreferences } };
}

/** Get paginated swipe history */
export async function getSwipeHistory(
  page: number,
  limit: number,
): Promise<{ records: SwipeRecord[]; total: number }> {
  const start = (page - 1) * limit;
  const paginated = swipeHistory.slice(start, start + limit);
  return {
    records: paginated.map((r) => ({ ...r })),
    total: swipeHistory.length,
  };
}

/** Simple heuristic preference update (placeholder for AI-powered logic) */
function updatePreferenceVectorSimple(
  prefs: PreferenceVector,
  record: SwipeRecord,
): PreferenceVector {
  const updated = { ...prefs };

  // Simple weight adjustment based on swipe direction
  if (record.direction === 'right') {
    // Liked — increase default weights slightly
    updated.category_weights = { ...updated.category_weights };
    updated.keyword_weights = { ...updated.keyword_weights };
  }

  updated.last_updated = new Date().toISOString();
  return updated;
}
