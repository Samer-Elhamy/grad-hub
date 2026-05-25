/* ════════════════════════════════════════
   Debounce Utility — WebSocket Event Debouncing
   Batches rapid new_idea events into a single flush every N ms
   ════════════════════════════════════════ */

/* ─── Types ────────────────────────────────────────────── */

export interface DebounceOptions<T = unknown> {
  /** Debounce interval in milliseconds (default: 500) */
  delay?: number;
  /** Maximum batch size before forced flush (default: 50) */
  maxBatchSize?: number;
  /** Callback invoked with the batch of accumulated items */
  onFlush: (batch: T[]) => void;
}

/* ─── Debounce Implementation ──────────────────────────── */

/**
 * Creates a debounced batcher for WebSocket events.
 *
 * Accumulates items pushed via `.push()` and flushes them
 * as a batch on a configurable interval. If the batch reaches
 * `maxBatchSize` before the interval, it flushes immediately.
 *
 * Usage:
 *   const batcher = createDebounce({
 *     delay: 500,
 *     maxBatchSize: 50,
 *     onFlush: (batch) => ws.send(JSON.stringify(batch)),
 *   });
 *
 *   // On each new_idea event:
 *   batcher.push(idea);
 *
 *   // Clean up when done:
 *   batcher.dispose();
 */
export function createDebounce<T>(options: DebounceOptions<T>) {
  const { delay = 500, maxBatchSize = 50, onFlush } = options;
  let batch: T[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  /**
   * Flush the current batch to the callback.
   */
  function flush(): void {
    if (disposed) return;
    if (batch.length === 0) return;

    const snapshot = batch;
    batch = [];
    timer = null;

    try {
      onFlush(snapshot);
    } catch (err) {
      console.error('[debounce] flush error:', err);
    }
  }

  /**
   * Schedule a flush after the configured delay.
   */
  function scheduleFlush(): void {
    if (timer !== null) return;
    timer = setTimeout(flush, delay);
  }

  return {
    /**
     * Add an item to the batch.
     * Schedules a flush if one isn't pending; flushes immediately
     * if the batch size reaches maxBatchSize.
     */
    push(item: T): void {
      if (disposed) return;
      batch.push(item);

      if (batch.length >= maxBatchSize) {
        // Flush now — batch is full
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
        flush();
      } else {
        scheduleFlush();
      }
    },

    /**
     * Manually flush the current batch immediately.
     */
    flushNow(): void {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      flush();
    },

    /**
     * Cancel pending flush and clear the batch.
     */
    clear(): void {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      batch = [];
    },

    /**
     * Dispose the debouncer, cancelling any pending flush.
     * After disposal, push() is a no-op.
     */
    dispose(): void {
      disposed = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      batch = [];
    },

    /** Number of items currently in the batch. */
    get size(): number {
      return batch.length;
    },
  };
}

export type DebounceBatcher<T> = ReturnType<typeof createDebounce<T>>;
