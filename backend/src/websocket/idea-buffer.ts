/**
 * Per-client prefetch buffer for instant idea delivery.
 *
 * Maintains a FIFO queue of up to `capacity` ideas per connected client.
 * When buffer drops below `lowWaterMark`, fires a `low` event to trigger
 * a prefetch from the database or crawler pipeline.
 *
 * @module websocket/idea-buffer
 */

import type { Idea } from '../types/api';
import type { BufferState } from '../types/ws.types';
import { DEFAULT_STREAM_CONFIG } from '../types/ws.types';

// ─── Types ──────────────────────────────────────────────────────

export type BufferEvent = 'low' | 'overflow';
export type BufferEventHandler = (event: BufferEvent, data: { size: number; capacity: number }) => void;

// ─── Buffer Implementation ──────────────────────────────────────

const DEFAULT_CAPACITY = DEFAULT_STREAM_CONFIG.buffer_capacity;
const DEFAULT_LOW_WATER = DEFAULT_STREAM_CONFIG.buffer_low_water_mark;

/**
 * Creates a per-client FIFO idea buffer.
 *
 * Pure in the sense that it returns a closed-over object with explicit
 * methods — no hidden global state.
 */
export function createIdeaBuffer(
  capacity: number = DEFAULT_CAPACITY,
  lowWaterMark: number = DEFAULT_LOW_WATER,
): {
  /** Append ideas to the tail of the buffer. Returns count of accepted items. */
  push: (ideas: Idea[]) => number;
  /** Pop up to `count` ideas from the head. Returns the removed items. */
  pop: (count: number) => Idea[];
  /** Peek at the head without removing. Returns null when empty. */
  peek: () => Idea | null;
  /** Current number of buffered ideas. */
  size: () => number;
  /** Total capacity of this buffer. */
  readonly capacity: number;
  /** Whether the buffer is at or below the low-water mark. */
  isLow: () => boolean;
  /** Remove all ideas and return the evicted items. */
  clear: () => Idea[];
  /** Snapshot of current buffer state for reporting. */
  getState: () => BufferState;
  /** Register a listener for buffer lifecycle events. */
  on: (event: BufferEvent, handler: BufferEventHandler) => void;
  /** Remove a previously registered listener. */
  off: (event: BufferEvent, handler: BufferEventHandler) => void;
} {
  const queue: Idea[] = [];
  const listeners = new Map<BufferEvent, Set<BufferEventHandler>>();

  function notify(event: BufferEvent): void {
    const handlers = listeners.get(event);
    if (!handlers) return;
    const data = { size: queue.length, capacity };
    for (const handler of handlers) {
      handler(event, data);
    }
  }

  return {
    push(ideas: Idea[]): number {
      let accepted = 0;
      for (const idea of ideas) {
        if (queue.length >= capacity) {
          notify('overflow');
          break;
        }
        queue.push(idea);
        accepted++;
      }
      return accepted;
    },

    pop(count: number): Idea[] {
      const actual = Math.min(count, queue.length);
      const removed = queue.splice(0, actual);
      if (queue.length <= lowWaterMark) {
        notify('low');
      }
      return removed;
    },

    peek(): Idea | null {
      return queue.length > 0 ? queue[0] : null;
    },

    size(): number {
      return queue.length;
    },

    capacity,

    isLow(): boolean {
      return queue.length <= lowWaterMark;
    },

    clear(): Idea[] {
      const evicted = queue.splice(0);
      return evicted;
    },

    getState(): BufferState {
      return {
        size: queue.length,
        capacity,
        low_water_mark: lowWaterMark,
      };
    },

    on(event: BufferEvent, handler: BufferEventHandler): void {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler);
    },

    off(event: BufferEvent, handler: BufferEventHandler): void {
      listeners.get(event)?.delete(handler);
    },
  };
}
