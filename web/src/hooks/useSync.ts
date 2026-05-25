/* ════════════════════════════════════════
   useSync — State Synchronization Hook
   Keeps local state in sync with backend:
   - Card stack auto-refill when buffer low
   - Swipe history sync after successful POST
   - Preference reload on reconnect
   ════════════════════════════════════════ */

import { useEffect, useRef, useCallback } from "react";
import { useStore } from "../store";
import { ENV } from "../config/environment";
import { subscribeStatus, checkBufferAndRefill } from "../services/websocket.integration";
import { getIsOnline } from "../services/api.integration";
import type { WsIntegrationStatus } from "../services/websocket.integration";

/* ─── Sync Triggers ──────────────────────────────────────── */

/**
 * Hook that orchestrates state synchronization with the backend.
 * - Refills card buffer when running low
 * - Syncs history after swipe operations
 * - Reloads preferences on WebSocket reconnect
 *
 * Call once at the app root level.
 */
export function useSync(): {
  /** Force a manual sync of preferences and next card batch */
  forceSync: () => void;
  /** Current sync status indicator */
  isSyncing: boolean;
} {
  const isSyncingRef = useRef(false);
  const loadNextCards = useStore((s) => s.loadNextCards);
  const loadPreferences = useStore((s) => s.loadPreferences);
  const loadHistory = useStore((s) => s.loadHistory);
  const cards = useStore((s) => s.cards);
  const currentIndex = useStore((s) => s.currentIndex);

  /* ── Card Buffer Management ── */
  const remaining = cards.length - currentIndex;
  const needsRefill = remaining < ENV.CARD_BUFFER_MIN;

  useEffect(() => {
    if (needsRefill && !isSyncingRef.current) {
      isSyncingRef.current = true;
      loadNextCards().finally(() => {
        isSyncingRef.current = false;
      });
    }
  }, [needsRefill, loadNextCards]);

  /* ── WebSocket Reconnect Sync ── */
  useEffect(() => {
    const unsub = subscribeStatus((status: WsIntegrationStatus) => {
      if (status === "connected") {
        // Reload preferences and buffer on reconnect
        loadPreferences();
        loadNextCards();
      }
    });

    return unsub;
  }, [loadPreferences, loadNextCards]);

  /* ── Periodic Buffer Check ── */
  // Check buffer after any card is consumed (triggered via store subscription)
  useEffect(() => {
    const unsub = useStore.subscribe((state, prev) => {
      const cardsChanged = state.cards.length !== prev.cards.length;
      const indexChanged = state.currentIndex !== prev.currentIndex;

      if (cardsChanged || indexChanged) {
        checkBufferAndRefill();
      }
    });

    return unsub;
  }, []);

  /* ── Force Sync ── */
  const forceSync = useCallback(() => {
    loadNextCards();
    loadPreferences();
    if (getIsOnline()) {
      loadHistory(1);
    }
  }, [loadNextCards, loadPreferences, loadHistory]);

  return {
    forceSync,
    isSyncing: isSyncingRef.current,
  };
}

/* ── Swipe History Sync ──────────────────────────────────── */

/**
 * Call this after a swipe POST succeeds to refresh history.
 * Can be used in the swipe handler after API confirmation.
 */
export function syncHistoryAfterSwipe(): void {
  const { historyPage, loadHistory } = useStore.getState();
  loadHistory(historyPage);
}
