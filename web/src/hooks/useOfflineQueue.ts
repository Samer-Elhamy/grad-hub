/* ════════════════════════════════════════
   useOfflineQueue — Offline Queue Hook
   Queues swipe POSTs when offline.
   Replays on reconnect.
   Persists queue to localStorage.
   ════════════════════════════════════════ */

import { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "../store";
import {
  postSwipe,
  getIsOnline,
} from "../services/api.integration";
import { subscribeStatus } from "../services/websocket.integration";
import type { SwipeEvent } from "../types/swipe";
import type { WsIntegrationStatus } from "../services/websocket.integration";

/* ─── Constants ──────────────────────────────────────────── */

const STORAGE_KEY = "grad_hub_offline_queue";
const MAX_QUEUE_SIZE = 200;

/* ─── Types ──────────────────────────────────────────────── */

interface QueuedSwipe {
  id: string;
  event: SwipeEvent;
  queuedAt: string;
}

/* ─── Storage Helpers (pure, testable) ───────────────────── */

function loadQueue(): QueuedSwipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: unknown): item is QueuedSwipe =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "event" in item,
    );
  } catch {
    return [];
  }
}

function persistQueue(queue: QueuedSwipe[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("[OfflineQueue] Failed to persist queue", e);
  }
}

function generateId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/* ─── Hook ───────────────────────────────────────────────── */

export interface OfflineQueueState {
  /** Current items in the queue */
  queue: QueuedSwipe[];
  /** Number of pending items */
  pendingCount: number;
  /** Whether a replay is in progress */
  isReplaying: boolean;
  /** Add a swipe to the queue (when offline) */
  enqueue: (event: SwipeEvent) => void;
  /** Manually trigger replay of the queue */
  replay: () => Promise<void>;
  /** Clear all queued items */
  clear: () => void;
  /** Last replay error, if any */
  lastError: string | null;
}

/**
 * Hook that manages an offline queue of swipe events.
 * - Automatically enqueues when offline
 * - Replays queued events when connectivity returns
 * - Persists to localStorage for survival across page reloads
 */
export function useOfflineQueue(): OfflineQueueState {
  const [queue, setQueue] = useState<QueuedSwipe[]>(loadQueue);
  const [isReplaying, setIsReplaying] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const replayingRef = useRef(false);

  /* ── Persist queue changes ── */
  useEffect(() => {
    persistQueue(queue);
  }, [queue]);

  /* ── Auto-replay on reconnect ── */
  useEffect(() => {
    const unsub = subscribeStatus((status: WsIntegrationStatus) => {
      if (status === "connected" && queue.length > 0 && !replayingRef.current) {
        replayQueue();
      }
    });

    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length]);

  /* ── Enqueue ── */
  const enqueue = useCallback((event: SwipeEvent) => {
    setQueue((prev) => {
      if (prev.length >= MAX_QUEUE_SIZE) {
        // Drop oldest when at capacity
        return [
          ...prev.slice(1),
          { id: generateId(), event, queuedAt: new Date().toISOString() },
        ];
      }
      return [
        ...prev,
        { id: generateId(), event, queuedAt: new Date().toISOString() },
      ];
    });
  }, []);

  /* ── Replay ── */
  const replayQueue = useCallback(async () => {
    if (replayingRef.current) return;
    replayingRef.current = true;
    setIsReplaying(true);
    setLastError(null);

    const items = loadQueue();
    const addToast = useStore.getState().addToast;
    const failed: QueuedSwipe[] = [];

    for (const item of items) {
      if (!getIsOnline()) {
        // Went offline during replay — stop and keep remaining
        failed.push(item);
        break;
      }

      try {
        await postSwipe(item.event);
      } catch {
        failed.push(item);
      }
    }

    // Update queue with failed items only
    setQueue(failed);
    persistQueue(failed);

    replayingRef.current = false;
    setIsReplaying(false);

    if (failed.length > 0) {
      const msg = `${failed.length} swipe(s) failed to sync`;
      setLastError(msg);
      addToast(msg, "error");
    } else if (items.length > 0) {
      addToast(`Synced ${items.length} offline swipe(s)`, "success");
    }
  }, []);

  /* ── Clear ── */
  const clear = useCallback(() => {
    setQueue([]);
    persistQueue([]);
    setLastError(null);
  }, []);

  return {
    queue,
    pendingCount: queue.length,
    isReplaying,
    enqueue,
    replay: replayQueue,
    clear,
    lastError,
  };
}
