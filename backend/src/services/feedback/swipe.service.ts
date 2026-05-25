/**
 * SwipeService — Main swipe processing engine
 *
 * Lifecycle of a single swipe:
 *   1. VALIDATE  — Check idea exists, session is valid, timestamp is recent
 *   2. DEBOUNCE  — Reject if < 200ms since last swipe from same session
 *   3. PERSIST   — Write immutable swipe record to store
 *   4. EMIT      — Notify subscribers via event bus
 *
 * Design principles:
 *   - Immutable records: once written, a swipe is never modified
 *   - Validation at boundaries: all inputs checked before processing
 *   - Debounce at service level (not middleware) for testability
 *   - Pure-ish: stateful debounce cache, but persistence is abstracted
 */

import type { SwipeEvent, SwipeDirection, Rating } from '../../types/swipe.types';
import type { CreateSwipeInput } from '../../validators/swipe-validator';
import type { PreferenceVector } from '../../types/api';
import type { SwipeRecord } from '../../types/api';
import { feedbackEventBus, FeedbackEventNames } from './events';
import { updatePreferenceVector } from './analytics.service';
import { getPreferences, setPreferences } from '../preferences.service';
import { getIdeaById } from '../ideas.service';
import {
  loadPersistedSwipeHistory,
  persistSwipeHistory,
} from '../runtime-state.service';

// ── Constants ────────────────────────────────────────────────────────

/** Minimum time between swipes from the same session (milliseconds) */
const DEBOUNCE_WINDOW_MS = 200;

/** Maximum age of a swipe timestamp (milliseconds) */
const MAX_TIMESTAMP_AGE_MS = 5_000;

/** Known valid idea IDs for validation (stub — replace with DB lookup) */
const VALID_IDEA_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

/** Known valid session IDs for validation (stub — replace with DB lookup) */
const VALID_SESSION_IDS = new Set(['default']);

// ── In-memory stores (stub — replaces PostgreSQL) ────────────────────

/** Single-user review history — one latest record per idea. */
const swipeHistory: SwipeRecord[] = dedupeByLatestIdea(loadPersistedSwipeHistory());

/** Session debounce tracker: session_id → last_swipe_timestamp */
const lastSwipeBySession = new Map<string, number>();

/** Current preference vector (mirrors the one in preferences.service) */
let currentPreferences: PreferenceVector = {
  category_weights: {
    'AI/ML': 0.5,
    'Web Applications': 0.5,
    'Mobile Apps': 0.3,
    Cybersecurity: 0.4,
    'Data Science': 0.5,
    'Cloud/DevOps': 0.3,
    Blockchain: 0.1,
    'Game Development': 0.2,
    IoT: 0.1,
  },
  keyword_weights: {
    python: 0.5,
    react: 0.4,
    docker: 0.3,
    machine_learning: 0.6,
    nlp: 0.4,
    fullstack: 0.3,
  },
  excluded_categories: ['IoT', 'Blockchain'],
  difficulty_preference: null,
  last_updated: new Date().toISOString(),
};

// ── Validation ───────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

/**
 * Validate that the idea_id exists in the known set.
 * In production, this queries the ideas table via repository.
 */
function validateIdeaId(ideaId: number): ValidationResult {
  if (!Number.isInteger(ideaId) || ideaId < 1) {
    return { valid: false, error: 'idea_id must be a positive integer', code: 'INVALID_IDEA' };
  }
  if (!VALID_IDEA_IDS.has(ideaId)) {
    return { valid: false, error: `Idea with id ${ideaId} not found`, code: 'IDEA_NOT_FOUND' };
  }
  return { valid: true };
}

/**
 * Validate that the session_id is known.
 * In production, this checks the sessions table.
 */
function validateSessionId(sessionId: string): ValidationResult {
  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    return { valid: false, error: 'session_id is required', code: 'INVALID_SESSION' };
  }
  if (!VALID_SESSION_IDS.has(sessionId)) {
    return { valid: false, error: `Session ${sessionId} not found`, code: 'SESSION_NOT_FOUND' };
  }
  return { valid: true };
}

/**
 * Validate that the timestamp is within the acceptable recency window.
 * Rejects swipes that are too old (clock skew, stale events).
 */
function validateTimestamp(timestamp: string): ValidationResult {
  const parsed = new Date(timestamp);
  if (isNaN(parsed.getTime())) {
    return { valid: false, error: 'Invalid timestamp format', code: 'INVALID_TIMESTAMP' };
  }

  const age = Date.now() - parsed.getTime();
  if (age < 0) {
    return { valid: false, error: 'Timestamp cannot be in the future', code: 'FUTURE_TIMESTAMP' };
  }
  if (age > MAX_TIMESTAMP_AGE_MS) {
    return {
      valid: false,
      error: `Timestamp is too old (max ${MAX_TIMESTAMP_AGE_MS}ms)`,
      code: 'STALE_TIMESTAMP',
    };
  }

  return { valid: true };
}

/**
 * Full swipe input validation.
 * Runs all validation checks and returns the first failure.
 */
function validateSwipeInput(input: CreateSwipeInput & { session_id: string; timestamp: string }): ValidationResult {
  const ideaCheck = validateIdeaId(input.idea_id);
  if (!ideaCheck.valid) return ideaCheck;

  const sessionCheck = validateSessionId(input.session_id);
  if (!sessionCheck.valid) return sessionCheck;

  const timestampCheck = validateTimestamp(input.timestamp);
  if (!timestampCheck.valid) return timestampCheck;

  return { valid: true };
}

// ── Debounce ─────────────────────────────────────────────────────────

/**
 * Check if the session is debouncing (too soon since last swipe).
 * Returns true if the swipe should be rejected.
 */
function isDebouncing(sessionId: string, now: number): boolean {
  const last = lastSwipeBySession.get(sessionId);
  if (last === undefined) return false;
  return now - last < DEBOUNCE_WINDOW_MS;
}

// ── Core service functions ───────────────────────────────────────────

/**
 * Generate a unique swipe ID.
 * Format: swipe_{timestamp}_{random} — URL-safe, sortable.
 */
function generateSwipeId(): string {
  return `swipe_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function dedupeByLatestIdea(records: SwipeRecord[]): SwipeRecord[] {
  const byIdea = new Map<number, SwipeRecord>();
  for (const record of records) {
    const current = byIdea.get(record.idea_id);
    if (!current || new Date(record.timestamp) >= new Date(current.timestamp)) {
      byIdea.set(record.idea_id, record);
    }
  }
  return Array.from(byIdea.values());
}

/**
 * Persist a swipe record to the local single-user store.
 * Re-swiping an idea updates the existing history row instead of duplicating it.
 */
async function persistSwipe(record: SwipeRecord): Promise<void> {
  const existingIndex = swipeHistory.findIndex((item) => item.idea_id === record.idea_id);
  if (existingIndex >= 0) {
    swipeHistory[existingIndex] = record;
  } else {
    swipeHistory.push(record);
  }
  persistSwipeHistory(swipeHistory);
}

/**
 * Record a swipe interaction end-to-end:
 *   validate → debounce → persist → emit → update preferences
 *
 * Returns the created swipe record and the updated preference vector.
 * Throws on validation/debounce failure.
 */
export async function recordSwipe(input: CreateSwipeInput): Promise<{
  record: SwipeRecord;
  updatedPreferences: PreferenceVector;
}> {
  const now = Date.now();
  const sessionId = 'default'; // Single-user mode
  const timestamp = new Date(now).toISOString();

  // 1. Validate all inputs
  const validation = validateSwipeInput({ ...input, session_id: sessionId, timestamp });
  if (!validation.valid) {
    throw new SwipeValidationError(validation.error!, validation.code!);
  }

  // 2. Debounce rapid swipes from same session
  if (isDebouncing(sessionId, now)) {
    throw new SwipeValidationError(
      `Too many swipes (min ${DEBOUNCE_WINDOW_MS}ms between events)`,
      'DEBOUNCE_REJECTED',
    );
  }

  // 3. Create immutable swipe record.
  const direction: SwipeDirection = input.direction;
  const record: SwipeRecord = {
    id: generateSwipeId(),
    idea_id: input.idea_id,
    direction,
    dwell_time_ms: input.dwell_time_ms ?? 0,
    rating: input.rating as SwipeRecord['rating'],
    timestamp,
  };

  // 4. Persist to store
  await persistSwipe(record);

  // 5. Update debounce tracker
  lastSwipeBySession.set(sessionId, now);

  // 6. Update preference vector using the canonical preference service state.
  const basePreferences = await getPreferences();
  currentPreferences = updatePreferenceVector(basePreferences, record);

  // Sync with preferences.service so GET /api/preferences returns updated values
  setPreferences(currentPreferences);
  // #region agent log
  fetch('http://127.0.0.1:7261/ingest/f0a8580a-2159-4d02-8dff-6d707a9bcc1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3cfbd7'},body:JSON.stringify({sessionId:'3cfbd7',runId:'pre-fix',hypothesisId:'H1,H3,H4',location:'backend/src/services/feedback/swipe.service.ts:recordSwipe',message:'backend swipe persisted and preferences updated',data:{record:{idea_id:record.idea_id,direction:record.direction,dwell_time_ms:record.dwell_time_ms,rating:record.rating},historyCount:swipeHistory.length,updatedExcludedCategories:currentPreferences.excluded_categories,updatedCategoryWeights:currentPreferences.category_weights},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  // 7. Emit events for cross-service communication
  const swipeEvent: SwipeEvent = {
    id: record.id,
    idea_id: record.idea_id,
    session_id: sessionId,
    direction: record.direction as SwipeDirection,
    dwell_time_ms: record.dwell_time_ms ?? 0,
    rating: record.rating as Rating | undefined,
    timestamp: record.timestamp,
  };

  feedbackEventBus.emit(FeedbackEventNames.SWIPE_RECORDED, {
    swipe: swipeEvent,
  });

  feedbackEventBus.emit(FeedbackEventNames.PREFERENCE_CHANGED, {
    preferenceVector: { ...currentPreferences },
    sourceSwipeId: record.id,
  });

  return { record, updatedPreferences: { ...currentPreferences } };
}

/**
 * Get paginated swipe history (read-only snapshot).
 */
export async function getSwipeHistory(
  page: number,
  limit: number,
  filter?: 'liked' | 'disliked' | 'starred',
): Promise<{ records: SwipeRecord[]; total: number }> {
  let filtered = swipeHistory;
  if (filter === 'liked') {
    filtered = swipeHistory.filter((record) => record.direction === 'right');
  } else if (filter === 'disliked') {
    filtered = swipeHistory.filter((record) => record.direction === 'left');
  } else if (filter === 'starred') {
    filtered = swipeHistory.filter((record) => record.direction === 'up');
  }

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const start = (page - 1) * limit;
  const paginated = sorted.slice(start, start + limit);
  const records = await Promise.all(
    paginated.map(async (record) => ({
      ...record,
      idea: (await getIdeaById(record.idea_id)) ?? undefined,
    })),
  );
  return {
    records,
    total: filtered.length,
  };
}

/** Delete a saved idea from swipe history. */
export async function deleteSwipeHistoryItem(ideaId: number): Promise<boolean> {
  const index = swipeHistory.findIndex((record) => record.idea_id === ideaId);
  if (index < 0) return false;
  swipeHistory.splice(index, 1);
  persistSwipeHistory(swipeHistory);
  return true;
}

// ── Error types ──────────────────────────────────────────────────────

/** Error thrown when swipe validation or debounce fails */
export class SwipeValidationError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'SwipeValidationError';
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Reset the debounce tracker — used by tests.
 * Calling this clears all session swipe timestamps.
 */
export function resetDebounce(): void {
  lastSwipeBySession.clear();
}
