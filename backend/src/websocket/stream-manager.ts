/**
 * Idea push orchestration layer.
 *
 * Coordinates the flow of filtered ideas from the search pipeline
 * to connected clients. Maintains per-client prefetch buffers,
 * applies preference-based filtering, and handles backpressure
 * when clients cannot keep up.
 *
 * @module websocket/stream-manager
 */

import { WebSocket } from 'ws';
import type { Idea, PreferenceVector } from '../types/api';
import type { WSOutboundMessage, StreamConfig } from '../types/ws.types';
import { DEFAULT_STREAM_CONFIG } from '../types/ws.types';
import type { ConnectionManager } from './connection-manager';
import { createIdeaBuffer } from './idea-buffer';
import type { BufferEvent, BufferEventHandler } from './idea-buffer';

// ─── Types ──────────────────────────────────────────────────────

export interface StreamManager {
  /** Send the initial batch of ideas to a newly connected client. */
  sendInitialBatch: (sessionId: string) => void;
  /** Push newly filtered ideas from the search pipeline to all relevant clients. */
  broadcastNewIdeas: (ideas: Idea[]) => void;
  /** Pop ideas from a client's buffer (when they request_more). */
  popFromBuffer: (sessionId: string, count: number) => Idea[];
  /** Flush and refill a client's buffer (after preference change). */
  flushBufferedForSession: (sessionId: string) => void;
  /** Register a callback when a client's buffer needs prefetching. */
  onPrefetchNeeded: (handler: PrefetchHandler) => void;
  /** Drain all queued messages during shutdown. */
  drainAll: () => void;
  /** Get aggregate stream metrics. */
  getMetrics: () => StreamMetrics;
}

export type PrefetchHandler = (sessionId: string, count: number) => void;

export interface StreamMetrics {
  total_broadcasts: number;
  total_ideas_pushed: number;
  total_filtered_out: number;
  active_buffers: number;
}

// ─── Helpers ────────────────────────────────────────────────────

function matchesPreference(idea: Idea, prefs: PreferenceVector): boolean {
  // Exclude blocked categories
  if (
    prefs.excluded_categories.length > 0 &&
    prefs.excluded_categories.includes(idea.category)
  ) {
    return false;
  }

  // If no preferences are set, include everything
  if (
    Object.keys(prefs.category_weights).length === 0 &&
    prefs.excluded_categories.length === 0
  ) {
    return true;
  }

  // Check if there's at least one liked category match
  const likedCategories = Object.keys(prefs.category_weights);
  if (likedCategories.length > 0 && !likedCategories.includes(idea.category)) {
    return false;
  }

  return true;
}

function sendSafe(ws: WebSocket, message: WSOutboundMessage): boolean {
  if (ws.readyState !== WebSocket.OPEN) return false;
  try {
    ws.send(JSON.stringify(message));
    return true;
  } catch {
    return false;
  }
}

// ─── Factory ────────────────────────────────────────────────────

/**
 * Creates the stream manager that pushes ideas from search → clients.
 */
export function createStreamManager(
  connectionManager: ConnectionManager,
  config: StreamConfig = DEFAULT_STREAM_CONFIG,
  onPrefetch: PrefetchHandler = () => {},
): StreamManager {
  // Per-client buffers: sessionId → idea buffer
  const buffers = new Map<string, ReturnType<typeof createIdeaBuffer>>();

  // Server-side overflow queue for backpressure: sessionId → Idea[]
  const overflowQueues = new Map<string, Idea[]>();

  // Metrics counters
  let totalBroadcasts = 0;
  let totalIdeasPushed = 0;
  let totalFilteredOut = 0;

  // ─── Buffer lifecycle ─────────────────────────────────────────

  function getOrCreateBuffer(sessionId: string) {
    let buf = buffers.get(sessionId);
    if (!buf) {
      buf = createIdeaBuffer(config.buffer_capacity, config.buffer_low_water_mark);
      buffers.set(sessionId, buf);

      // Wire up low-water event → trigger prefetch
      const onLow: BufferEventHandler = () => {
        onPrefetch(sessionId, config.buffer_capacity - buf!.size());
      };
      buf.on('low', onLow);
    }
    return buf;
  }

  function removeBuffer(sessionId: string): void {
    buffers.delete(sessionId);
    overflowQueues.delete(sessionId);
  }

  // Listen for client disconnections to clean up buffers
  // (connection manager tracks this; we hook into its close handling)

  // ─── Public API ───────────────────────────────────────────────

  function sendInitialBatch(sessionId: string): void {
    const ws = connectionManager.getSocket(sessionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const buf = getOrCreateBuffer(sessionId);
    const available = buf.size();

    // Pop up to buffer capacity from whatever is in the buffer
    const ideas = buf.pop(config.buffer_capacity);

    // Trigger prefetch if buffer emptied
    if (buf.isLow()) {
      onPrefetch(sessionId, config.buffer_capacity);
    }

    sendSafe(ws, {
      type: 'initial_batch',
      data: {
        ideas,
        total_available: available,
        session_id: sessionId,
      },
    });
  }

  function broadcastNewIdeas(ideas: Idea[]): void {
    totalBroadcasts++;
    const sessions = connectionManager.getAllSessions();

    for (const session of sessions) {
      const ws = connectionManager.getSocket(session.session_id);
      if (!ws || ws.readyState !== WebSocket.OPEN) continue;

      // Filter ideas by client preference context
      const matching = ideas.filter((idea) =>
        matchesPreference(idea, session.preference_context),
      );

      if (matching.length === 0) {
        totalFilteredOut += ideas.length;
        continue;
      }

      const buf = getOrCreateBuffer(session.session_id);

      // Try to push into buffer
      const accepted = buf.push(matching);
      totalIdeasPushed += accepted;

      // Backpressure: queue remaining server-side if buffer is full
      const remaining = matching.slice(accepted);
      if (remaining.length > 0) {
        let queue = overflowQueues.get(session.session_id);
        if (!queue) {
          queue = [];
          overflowQueues.set(session.session_id, queue);
        }

        // Cap overflow to prevent unbounded memory growth
        const space = config.max_queued_messages - queue.length;
        if (space > 0) {
          queue.push(...remaining.slice(0, space));
        }
      }

      // If client has room, deliver immediately
      if (accepted > 0) {
        const deliverable = buf.pop(accepted);
        for (const idea of deliverable) {
          sendSafe(ws, {
            type: 'new_idea',
            data: idea,
          });
        }
      }

      // Check for overflow queue drain opportunity
      const overflow = overflowQueues.get(session.session_id);
      if (overflow && overflow.length > 0) {
        const canTake = config.buffer_capacity - buf.size();
        if (canTake > 0) {
          const drained = overflow.splice(0, canTake);
          buf.push(drained);
          // Not applicable for immediate send, but triggers next request_more
        }
      }
    }
  }

  function popFromBuffer(sessionId: string, count: number): Idea[] {
    const buf = buffers.get(sessionId);
    if (!buf) return [];

    const ideas = buf.pop(count);

    // After popping, try to drain overflow queue
    const overflow = overflowQueues.get(sessionId);
    if (overflow && overflow.length > 0) {
      const space = config.buffer_capacity - buf.size();
      if (space > 0) {
        const drained = overflow.splice(0, space);
        buf.push(drained);
      }
    }

    return ideas;
  }

  function flushBufferedForSession(sessionId: string): void {
    const buf = buffers.get(sessionId);
    if (!buf) return;

    // Clear buffer — preference context changed, old matches may no longer apply
    buf.clear();
    overflowQueues.delete(sessionId);

    // Trigger prefetch to refill with new preference context
    onPrefetch(sessionId, config.buffer_capacity);
  }

  function drainAll(): void {
    for (const [sid, buf] of buffers.entries()) {
      buf.clear();
      overflowQueues.delete(sid);
    }
    buffers.clear();
  }

  function getMetrics(): StreamMetrics {
    return {
      total_broadcasts: totalBroadcasts,
      total_ideas_pushed: totalIdeasPushed,
      total_filtered_out: totalFilteredOut,
      active_buffers: buffers.size,
    };
  }

  return {
    sendInitialBatch,
    broadcastNewIdeas,
    popFromBuffer,
    flushBufferedForSession,
    onPrefetchNeeded: (handler: PrefetchHandler) => {
      onPrefetch = handler;
    },
    drainAll,
    getMetrics,
  };
}
