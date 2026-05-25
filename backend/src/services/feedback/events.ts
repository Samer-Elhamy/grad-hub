/**
 * Feedback System Events — Typed EventEmitter
 *
 * Provides a singleton event bus for cross-service communication within
 * the feedback/swipe analytics system. Services subscribe to these events
 * to react to swipe activity, preference changes, and category affinity shifts.
 *
 * Events:
 *   SWIPE_RECORDED        — Fired after a swipe is validated and persisted
 *   PREFERENCE_CHANGED    — Fired when the preference vector is recalculated
 *   CATEGORY_AFFINITY_CHANGED — Fired when a category's affinity score crosses a threshold
 */

import { EventEmitter } from 'events';
import type { SwipeEvent, CategoryAffinity } from '../../types/swipe.types';
import type { PreferenceVector } from '../../types/api';

// ── Event name constants ─────────────────────────────────────────────

export const FeedbackEventNames = {
  SWIPE_RECORDED: 'swipe:recorded',
  PREFERENCE_CHANGED: 'preference:changed',
  CATEGORY_AFFINITY_CHANGED: 'category_affinity:changed',
} as const;

export type FeedbackEventName =
  (typeof FeedbackEventNames)[keyof typeof FeedbackEventNames];

// ── Typed payloads ───────────────────────────────────────────────────

export interface SwipeRecordedPayload {
  swipe: SwipeEvent;
}

export interface PreferenceChangedPayload {
  preferenceVector: PreferenceVector;
  sourceSwipeId: string;
}

export interface CategoryAffinityChangedPayload {
  category: string;
  previousAffinity: number;
  currentAffinity: number;
  trend: 'rising' | 'falling' | 'stable';
}

/** Maps each event name to its payload tuple for type-safe emit/on */
export interface FeedbackEventPayloadMap {
  [FeedbackEventNames.SWIPE_RECORDED]: [SwipeRecordedPayload];
  [FeedbackEventNames.PREFERENCE_CHANGED]: [PreferenceChangedPayload];
  [FeedbackEventNames.CATEGORY_AFFINITY_CHANGED]: [CategoryAffinityChangedPayload];
}

// ── Singleton Event Bus ──────────────────────────────────────────────

/**
 * Singleton event bus for feedback system events.
 *
 * Why singleton:
 *   Multiple services (swipe, analytics, search) need to subscribe to
 *   the same events without sharing a direct reference. The singleton
 *   pattern provides a single, centrally-managed event bus.
 *
 * Usage:
 *   import { feedbackEventBus, FeedbackEventNames } from './events';
 *
 *   // Emit
 *   feedbackEventBus.emit(FeedbackEventNames.SWIPE_RECORDED, { swipe });
 *
 *   // Subscribe
 *   feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, ({ swipe }) => {
 *     // handle
 *   });
 */
class FeedbackEventBus {
  private static instance: FeedbackEventBus;
  private emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
    // Allow multiple concurrent subscribers (swipe, analytics, search agents)
    this.emitter.setMaxListeners(50);
  }

  static getInstance(): FeedbackEventBus {
    if (!FeedbackEventBus.instance) {
      FeedbackEventBus.instance = new FeedbackEventBus();
    }
    return FeedbackEventBus.instance;
  }

  /** Emit a typed feedback event to all subscribers */
  emit<K extends keyof FeedbackEventPayloadMap>(
    event: K,
    ...args: FeedbackEventPayloadMap[K]
  ): boolean {
    return this.emitter.emit(event as string, ...args);
  }

  /** Subscribe to a typed feedback event */
  on<K extends keyof FeedbackEventPayloadMap>(
    event: K,
    listener: (...args: FeedbackEventPayloadMap[K]) => void,
  ): this {
    this.emitter.on(event as string, listener as (...args: unknown[]) => void);
    return this;
  }

  /** Unsubscribe a listener from a typed feedback event */
  off<K extends keyof FeedbackEventPayloadMap>(
    event: K,
    listener: (...args: FeedbackEventPayloadMap[K]) => void,
  ): this {
    this.emitter.off(event as string, listener as (...args: unknown[]) => void);
    return this;
  }

  /** Subscribe to a typed feedback event for one invocation only */
  once<K extends keyof FeedbackEventPayloadMap>(
    event: K,
    listener: (...args: FeedbackEventPayloadMap[K]) => void,
  ): this {
    this.emitter.once(event as string, listener as (...args: unknown[]) => void);
    return this;
  }

  /** Remove all listeners for a specific event, or all events if omitted */
  removeAllListeners(event?: keyof FeedbackEventPayloadMap): this {
    if (event) {
      this.emitter.removeAllListeners(event as string);
    } else {
      this.emitter.removeAllListeners();
    }
    return this;
  }

  /** Get current listener count for an event (useful for leak detection) */
  listenerCount(event: keyof FeedbackEventPayloadMap): number {
    return this.emitter.listenerCount(event as string);
  }
}

/** Singleton instance — import this everywhere */
export const feedbackEventBus = FeedbackEventBus.getInstance();
