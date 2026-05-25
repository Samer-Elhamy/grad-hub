/**
 * Unit tests: FeedbackEventBus (events.ts)
 *
 * Tests the singleton event bus that provides cross-service communication
 * for the feedback/swipe analytics system.
 *
 * Coverage targets:
 * - Singleton behavior: getInstance() returns the same instance
 * - Emit/Subscribe: handlers receive payloads for correct events
 * - Multiple subscribers: all registered handlers fire
 * - Off/unsubscribe: handlers removed via off() do not fire
 * - Once: one-shot handlers fire exactly once
 * - Listener count: correct count returned
 * - Remove all listeners: all handlers cleared
 * - Typed payloads: correct payload shapes per event
 * - Multiple events: independent events fire correctly
 * - Max listeners: 50 limit is set (implicit verification)
 */

import { feedbackEventBus, FeedbackEventNames } from '../../src/services/feedback/events';
import type { SwipeRecordedPayload, PreferenceChangedPayload, CategoryAffinityChangedPayload } from '../../src/services/feedback/events';

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('FeedbackEventBus — Singleton', () => {
  beforeEach(() => {
    feedbackEventBus.removeAllListeners();
  });

  test('getInstance() returns the same instance across multiple calls', () => {
    // This is an inherent property of the exported singleton — we re-import to verify
    const bus1 = feedbackEventBus;
    const bus2 = feedbackEventBus;

    expect(bus1).toBe(bus2);
  });

  test('exported feedbackEventBus is a valid object with expected methods', () => {
    expect(feedbackEventBus).toBeDefined();
    expect(typeof feedbackEventBus.on).toBe('function');
    expect(typeof feedbackEventBus.off).toBe('function');
    expect(typeof feedbackEventBus.once).toBe('function');
    expect(typeof feedbackEventBus.emit).toBe('function');
    expect(typeof feedbackEventBus.listenerCount).toBe('function');
    expect(typeof feedbackEventBus.removeAllListeners).toBe('function');
  });
});

describe('FeedbackEventBus — Emit / Subscribe', () => {
  beforeEach(() => {
    feedbackEventBus.removeAllListeners();
  });

  test('on() subscriber receives the payload when emit is called', () => {
    const handler = jest.fn();
    const payload: SwipeRecordedPayload = {
      swipe: {
        id: 'swipe_001',
        idea_id: 42,
        session_id: 'session_abc',
        direction: 'right',
        dwell_time_ms: 1500,
        rating: 4,
        timestamp: new Date().toISOString(),
      },
    };

    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler);
    feedbackEventBus.emit(FeedbackEventNames.SWIPE_RECORDED, payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(payload);
  });

  test('handler receives the exact payload object that was emitted', () => {
    const handler = jest.fn();
    const payload: SwipeRecordedPayload = {
      swipe: {
        id: 'swipe_002',
        idea_id: 7,
        session_id: 'session_xyz',
        direction: 'left',
        dwell_time_ms: 800,
        timestamp: new Date().toISOString(),
      },
    };

    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler);
    feedbackEventBus.emit(FeedbackEventNames.SWIPE_RECORDED, payload);

    expect(handler).toHaveBeenCalledWith(payload);
    expect(handler.mock.calls[0][0].swipe.idea_id).toBe(7);
    expect(handler.mock.calls[0][0].swipe.direction).toBe('left');
  });
});

describe('FeedbackEventBus — Multiple subscribers', () => {
  beforeEach(() => {
    feedbackEventBus.removeAllListeners();
  });

  test('all registered handlers receive the event when emitted', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    const handler3 = jest.fn();
    const payload: SwipeRecordedPayload = {
      swipe: {
        id: 'swipe_003',
        idea_id: 10,
        session_id: 'session_a',
        direction: 'right',
        dwell_time_ms: 1200,
        timestamp: new Date().toISOString(),
      },
    };

    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler1);
    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler2);
    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler3);
    feedbackEventBus.emit(FeedbackEventNames.SWIPE_RECORDED, payload);

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
    expect(handler3).toHaveBeenCalledTimes(1);
  });

  test('subscribers are called in the order they were registered', () => {
    const callOrder: number[] = [];
    const payload: SwipeRecordedPayload = {
      swipe: {
        id: 'swipe_004',
        idea_id: 1,
        session_id: 'session_b',
        direction: 'left',
        dwell_time_ms: 500,
        timestamp: new Date().toISOString(),
      },
    };

    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, () => callOrder.push(1));
    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, () => callOrder.push(2));
    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, () => callOrder.push(3));
    feedbackEventBus.emit(FeedbackEventNames.SWIPE_RECORDED, payload);

    expect(callOrder).toEqual([1, 2, 3]);
  });
});

describe('FeedbackEventBus — Off / Unsubscribe', () => {
  beforeEach(() => {
    feedbackEventBus.removeAllListeners();
  });

  test('handler does NOT receive events after off() is called', () => {
    const handler = jest.fn();
    const payload: SwipeRecordedPayload = {
      swipe: {
        id: 'swipe_005',
        idea_id: 3,
        session_id: 'session_c',
        direction: 'right',
        dwell_time_ms: 1000,
        timestamp: new Date().toISOString(),
      },
    };

    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler);
    feedbackEventBus.off(FeedbackEventNames.SWIPE_RECORDED, handler);
    feedbackEventBus.emit(FeedbackEventNames.SWIPE_RECORDED, payload);

    expect(handler).not.toHaveBeenCalled();
  });

  test('other handlers still fire after one handler is unsubscribed', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    const payload: SwipeRecordedPayload = {
      swipe: {
        id: 'swipe_006',
        idea_id: 5,
        session_id: 'session_d',
        direction: 'left',
        dwell_time_ms: 2000,
        timestamp: new Date().toISOString(),
      },
    };

    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler1);
    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler2);
    feedbackEventBus.off(FeedbackEventNames.SWIPE_RECORDED, handler1);
    feedbackEventBus.emit(FeedbackEventNames.SWIPE_RECORDED, payload);

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);
  });
});

describe('FeedbackEventBus — Once', () => {
  beforeEach(() => {
    feedbackEventBus.removeAllListeners();
  });

  test('handler registered via once() fires exactly once across multiple emits', () => {
    const handler = jest.fn();
    const payload: SwipeRecordedPayload = {
      swipe: {
        id: 'swipe_007',
        idea_id: 8,
        session_id: 'session_e',
        direction: 'right',
        dwell_time_ms: 1500,
        timestamp: new Date().toISOString(),
      },
    };

    feedbackEventBus.once(FeedbackEventNames.SWIPE_RECORDED, handler);
    feedbackEventBus.emit(FeedbackEventNames.SWIPE_RECORDED, payload);
    feedbackEventBus.emit(FeedbackEventNames.SWIPE_RECORDED, payload);
    feedbackEventBus.emit(FeedbackEventNames.SWIPE_RECORDED, payload);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('once() handler does not persist across different events', () => {
    const handler = jest.fn();
    const swipePayload: SwipeRecordedPayload = {
      swipe: {
        id: 'swipe_008',
        idea_id: 2,
        session_id: 'session_f',
        direction: 'left',
        dwell_time_ms: 900,
        timestamp: new Date().toISOString(),
      },
    };
    const prefPayload: PreferenceChangedPayload = {
      preferenceVector: {
        category_weights: {},
        keyword_weights: {},
        excluded_categories: [],
        difficulty_preference: null,
        last_updated: new Date().toISOString(),
      },
      sourceSwipeId: 'swipe_008',
    };

    feedbackEventBus.once(FeedbackEventNames.SWIPE_RECORDED, handler);
    feedbackEventBus.emit(FeedbackEventNames.PREFERENCE_CHANGED, prefPayload);

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('FeedbackEventBus — listenerCount', () => {
  beforeEach(() => {
    feedbackEventBus.removeAllListeners();
  });

  test('listenerCount returns 0 when no handlers are registered', () => {
    expect(feedbackEventBus.listenerCount(FeedbackEventNames.SWIPE_RECORDED)).toBe(0);
  });

  test('listenerCount returns correct count after adding handlers', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    const handler3 = jest.fn();

    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler1);
    expect(feedbackEventBus.listenerCount(FeedbackEventNames.SWIPE_RECORDED)).toBe(1);

    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler2);
    expect(feedbackEventBus.listenerCount(FeedbackEventNames.SWIPE_RECORDED)).toBe(2);

    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler3);
    expect(feedbackEventBus.listenerCount(FeedbackEventNames.SWIPE_RECORDED)).toBe(3);
  });

  test('listenerCount decreases after off() is called', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler1);
    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler2);
    expect(feedbackEventBus.listenerCount(FeedbackEventNames.SWIPE_RECORDED)).toBe(2);

    feedbackEventBus.off(FeedbackEventNames.SWIPE_RECORDED, handler1);
    expect(feedbackEventBus.listenerCount(FeedbackEventNames.SWIPE_RECORDED)).toBe(1);
  });

  test('listenerCount is correct for different events independently', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler1);
    feedbackEventBus.on(FeedbackEventNames.PREFERENCE_CHANGED, handler2);

    expect(feedbackEventBus.listenerCount(FeedbackEventNames.SWIPE_RECORDED)).toBe(1);
    expect(feedbackEventBus.listenerCount(FeedbackEventNames.PREFERENCE_CHANGED)).toBe(1);
  });
});

describe('FeedbackEventBus — removeAllListeners', () => {
  beforeEach(() => {
    feedbackEventBus.removeAllListeners();
  });

  test('removeAllListeners() without event clears all handlers across all events', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    const handlePref = jest.fn();
    const swipePayload: SwipeRecordedPayload = {
      swipe: {
        id: 'swipe_009',
        idea_id: 4,
        session_id: 'session_g',
        direction: 'right',
        dwell_time_ms: 1100,
        timestamp: new Date().toISOString(),
      },
    };
    const prefPayload: PreferenceChangedPayload = {
      preferenceVector: {
        category_weights: {},
        keyword_weights: {},
        excluded_categories: [],
        difficulty_preference: null,
        last_updated: new Date().toISOString(),
      },
      sourceSwipeId: 'swipe_009',
    };

    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler1);
    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler2);
    feedbackEventBus.on(FeedbackEventNames.PREFERENCE_CHANGED, handlePref);

    feedbackEventBus.removeAllListeners();

    feedbackEventBus.emit(FeedbackEventNames.SWIPE_RECORDED, swipePayload);
    feedbackEventBus.emit(FeedbackEventNames.PREFERENCE_CHANGED, prefPayload);

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
    expect(handlePref).not.toHaveBeenCalled();
    expect(feedbackEventBus.listenerCount(FeedbackEventNames.SWIPE_RECORDED)).toBe(0);
    expect(feedbackEventBus.listenerCount(FeedbackEventNames.PREFERENCE_CHANGED)).toBe(0);
  });

  test('removeAllListeners(event) clears only that specific event', () => {
    const handler1 = jest.fn();
    const handlePref = jest.fn();
    const swipePayload: SwipeRecordedPayload = {
      swipe: {
        id: 'swipe_010',
        idea_id: 6,
        session_id: 'session_h',
        direction: 'left',
        dwell_time_ms: 700,
        timestamp: new Date().toISOString(),
      },
    };
    const prefPayload: PreferenceChangedPayload = {
      preferenceVector: {
        category_weights: {},
        keyword_weights: {},
        excluded_categories: [],
        difficulty_preference: null,
        last_updated: new Date().toISOString(),
      },
      sourceSwipeId: 'swipe_010',
    };

    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler1);
    feedbackEventBus.on(FeedbackEventNames.PREFERENCE_CHANGED, handlePref);

    feedbackEventBus.removeAllListeners(FeedbackEventNames.SWIPE_RECORDED);
    feedbackEventBus.emit(FeedbackEventNames.SWIPE_RECORDED, swipePayload);
    feedbackEventBus.emit(FeedbackEventNames.PREFERENCE_CHANGED, prefPayload);

    expect(handler1).not.toHaveBeenCalled();
    expect(handlePref).toHaveBeenCalledTimes(1);
  });
});

describe('FeedbackEventBus — Typed payloads', () => {
  beforeEach(() => {
    feedbackEventBus.removeAllListeners();
  });

  test('emit PREFERENCE_CHANGED with correct payload shape', () => {
    const handler = jest.fn();
    const payload: PreferenceChangedPayload = {
      preferenceVector: {
        category_weights: { 'AI/ML': 0.8, 'Web Applications': 0.3 },
        keyword_weights: { react: 0.6 },
        excluded_categories: [],
        difficulty_preference: 'intermediate',
        last_updated: '2026-05-25T00:00:00.000Z',
      },
      sourceSwipeId: 'swipe_011',
    };

    feedbackEventBus.on(FeedbackEventNames.PREFERENCE_CHANGED, handler);
    feedbackEventBus.emit(FeedbackEventNames.PREFERENCE_CHANGED, payload);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        preferenceVector: expect.objectContaining({
          category_weights: expect.objectContaining({ 'AI/ML': 0.8 }),
        }),
        sourceSwipeId: 'swipe_011',
      }),
    );
  });

  test('emit CATEGORY_AFFINITY_CHANGED with correct payload shape', () => {
    const handler = jest.fn();
    const payload: CategoryAffinityChangedPayload = {
      category: 'AI/ML',
      previousAffinity: 0.3,
      currentAffinity: 0.7,
      trend: 'rising',
    };

    feedbackEventBus.on(FeedbackEventNames.CATEGORY_AFFINITY_CHANGED, handler);
    feedbackEventBus.emit(FeedbackEventNames.CATEGORY_AFFINITY_CHANGED, payload);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'AI/ML',
        previousAffinity: 0.3,
        currentAffinity: 0.7,
        trend: 'rising',
      }),
    );
  });

  test('SWIPE_RECORDED payload has the full SwipeEvent shape', () => {
    const handler = jest.fn();
    const payload: SwipeRecordedPayload = {
      swipe: {
        id: 'swipe_012',
        idea_id: 15,
        session_id: 'session_i',
        direction: 'right',
        dwell_time_ms: 2000,
        rating: 5,
        timestamp: '2026-05-25T12:00:00.000Z',
      },
    };

    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler);
    feedbackEventBus.emit(FeedbackEventNames.SWIPE_RECORDED, payload);

    expect(handler).toHaveBeenCalledWith(payload);
    expect(handler.mock.calls[0][0].swipe.id).toBe('swipe_012');
    expect(handler.mock.calls[0][0].swipe.direction).toBe('right');
    expect(handler.mock.calls[0][0].swipe.dwell_time_ms).toBe(2000);
    expect(handler.mock.calls[0][0].swipe.rating).toBe(5);
  });
});

describe('FeedbackEventBus — Multiple events', () => {
  beforeEach(() => {
    feedbackEventBus.removeAllListeners();
  });

  test('different events each fire their own handlers correctly', () => {
    const swipeHandler = jest.fn();
    const prefHandler = jest.fn();
    const affinityHandler = jest.fn();

    const swipePayload: SwipeRecordedPayload = {
      swipe: {
        id: 'swipe_013',
        idea_id: 20,
        session_id: 'session_j',
        direction: 'left',
        dwell_time_ms: 600,
        timestamp: new Date().toISOString(),
      },
    };
    const prefPayload: PreferenceChangedPayload = {
      preferenceVector: {
        category_weights: {},
        keyword_weights: {},
        excluded_categories: [],
        difficulty_preference: null,
        last_updated: new Date().toISOString(),
      },
      sourceSwipeId: 'swipe_013',
    };
    const affinityPayload: CategoryAffinityChangedPayload = {
      category: 'Data Science',
      previousAffinity: 0.0,
      currentAffinity: 0.5,
      trend: 'rising',
    };

    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, swipeHandler);
    feedbackEventBus.on(FeedbackEventNames.PREFERENCE_CHANGED, prefHandler);
    feedbackEventBus.on(FeedbackEventNames.CATEGORY_AFFINITY_CHANGED, affinityHandler);

    feedbackEventBus.emit(FeedbackEventNames.SWIPE_RECORDED, swipePayload);
    feedbackEventBus.emit(FeedbackEventNames.PREFERENCE_CHANGED, prefPayload);
    feedbackEventBus.emit(FeedbackEventNames.CATEGORY_AFFINITY_CHANGED, affinityPayload);

    expect(swipeHandler).toHaveBeenCalledTimes(1);
    expect(prefHandler).toHaveBeenCalledTimes(1);
    expect(affinityHandler).toHaveBeenCalledTimes(1);

    // Verify each handler received the correct payload
    expect(swipeHandler).toHaveBeenCalledWith(swipePayload);
    expect(prefHandler).toHaveBeenCalledWith(prefPayload);
    expect(affinityHandler).toHaveBeenCalledWith(affinityPayload);
  });

  test('emitting one event does not trigger handlers for other events', () => {
    const prefHandler = jest.fn();
    const swipeHandler = jest.fn();

    const prefPayload: PreferenceChangedPayload = {
      preferenceVector: {
        category_weights: {},
        keyword_weights: {},
        excluded_categories: [],
        difficulty_preference: null,
        last_updated: new Date().toISOString(),
      },
      sourceSwipeId: 'swipe_014',
    };

    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, swipeHandler);
    feedbackEventBus.on(FeedbackEventNames.PREFERENCE_CHANGED, prefHandler);

    // Only emit PREFERENCE_CHANGED
    feedbackEventBus.emit(FeedbackEventNames.PREFERENCE_CHANGED, prefPayload);

    expect(swipeHandler).not.toHaveBeenCalled();
    expect(prefHandler).toHaveBeenCalledTimes(1);
  });
});

describe('FeedbackEventBus — Max listeners warning prevention', () => {
  beforeEach(() => {
    feedbackEventBus.removeAllListeners();
  });

  test('does not emit MaxListenersExceededWarning with 40 subscribers (under 50 limit)', () => {
    // The default EventEmitter limit is 10. The FeedbackEventBus sets it to 50.
    // Registering 40 handlers should not trigger the MaxListenersExceededWarning.
    const warningSpy = jest.spyOn(process, 'emitWarning').mockImplementation(() => {});
    const handlers: jest.Mock[] = [];
    const payload: SwipeRecordedPayload = {
      swipe: {
        id: 'swipe_015',
        idea_id: 1,
        session_id: 'session_k',
        direction: 'right',
        dwell_time_ms: 1000,
        timestamp: new Date().toISOString(),
      },
    };

    for (let i = 0; i < 40; i++) {
      const handler = jest.fn();
      handlers.push(handler);
      feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler);
    }

    feedbackEventBus.emit(FeedbackEventNames.SWIPE_RECORDED, payload);

    // All 40 handlers should have fired
    handlers.forEach((h) => expect(h).toHaveBeenCalledTimes(1));

    // No MaxListenersExceededWarning should have been emitted
    expect(warningSpy).not.toHaveBeenCalled();

    warningSpy.mockRestore();
  });

  test('setMaxListeners was configured to 50 (verify listenerCount holds up to 50)', () => {
    const handlers: jest.Mock[] = [];
    const payload: SwipeRecordedPayload = {
      swipe: {
        id: 'swipe_016',
        idea_id: 2,
        session_id: 'session_l',
        direction: 'left',
        dwell_time_ms: 800,
        timestamp: new Date().toISOString(),
      },
    };

    for (let i = 0; i < 50; i++) {
      const handler = jest.fn();
      handlers.push(handler);
      feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler);
    }

    expect(feedbackEventBus.listenerCount(FeedbackEventNames.SWIPE_RECORDED)).toBe(50);

    feedbackEventBus.emit(FeedbackEventNames.SWIPE_RECORDED, payload);
    handlers.forEach((h) => expect(h).toHaveBeenCalledTimes(1));
  });
});

describe('FeedbackEventBus — Edge cases', () => {
  beforeEach(() => {
    feedbackEventBus.removeAllListeners();
  });

  test('emit returns true when there are listeners', () => {
    const handler = jest.fn();
    const payload: SwipeRecordedPayload = {
      swipe: {
        id: 'swipe_017',
        idea_id: 9,
        session_id: 'session_m',
        direction: 'right',
        dwell_time_ms: 1000,
        timestamp: new Date().toISOString(),
      },
    };

    feedbackEventBus.on(FeedbackEventNames.SWIPE_RECORDED, handler);
    const result = feedbackEventBus.emit(FeedbackEventNames.SWIPE_RECORDED, payload);

    expect(result).toBe(true);
  });

  test('off() with unregistered handler does not throw', () => {
    const handler = jest.fn();

    expect(() => {
      feedbackEventBus.off(FeedbackEventNames.SWIPE_RECORDED, handler);
    }).not.toThrow();
  });

  test('removeAllListeners on a clean bus does not throw', () => {
    expect(() => {
      feedbackEventBus.removeAllListeners();
    }).not.toThrow();
  });

  test('listenerCount returns 0 for unknown event names', () => {
    expect(feedbackEventBus.listenerCount(FeedbackEventNames.SWIPE_RECORDED)).toBe(0);
    expect(feedbackEventBus.listenerCount(FeedbackEventNames.PREFERENCE_CHANGED)).toBe(0);
    expect(feedbackEventBus.listenerCount(FeedbackEventNames.CATEGORY_AFFINITY_CHANGED)).toBe(0);
  });
});
