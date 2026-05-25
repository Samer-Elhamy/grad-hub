/* ════════════════════════════════════════
   WebSocket Integration — Grad Projects Hub v3
   Enhanced connection manager with typed message dispatch,
   automatic card buffer management, and reconnection sync
   ════════════════════════════════════════ */

import { ENV } from "../config/environment";
import { WebSocketManager, type WsStatus, type WsMessageHandler } from "./websocket";
import { useStore } from "../store";
import type { Idea } from "../types/idea";

/* ─── Types ──────────────────────────────────────────────── */

export type WsIntegrationStatus = WsStatus;

interface NewIdeaMessage {
  type: "new_idea";
  idea: Idea;
}

interface PreferenceUpdateAck {
  type: "preference_updated";
  timestamp: string;
}

interface SwipeAck {
  type: "swipe_ack";
  idea_id: string;
  success: boolean;
}

type ServerMessage = NewIdeaMessage | PreferenceUpdateAck | SwipeAck | Record<string, unknown>;

export interface WsIntegrationConfig {
  /** Optional custom WebSocket URL (defaults to ENV.WS_URL) */
  url?: string;
  /** Session identifier for resumption */
  sessionId?: string;
  /** Called when connection state changes */
  onStatusChange?: (status: WsIntegrationStatus) => void;
  /** Called on initial connect / reconnect */
  onReconnected?: () => void;
}

/* ─── Manager Singleton ──────────────────────────────────── */

let manager: WebSocketManager | null = null;
let statusListeners: Array<(status: WsIntegrationStatus) => void> = [];
let reconnectCallback: (() => void) | null = null;
let cardBufferThreshold = ENV.CARD_BUFFER_MIN;

/**
 * Subscribe to WebSocket connection status changes.
 * Returns an unsubscribe function.
 */
export function subscribeStatus(listener: (status: WsIntegrationStatus) => void): () => void {
  statusListeners.push(listener);
  return () => {
    statusListeners = statusListeners.filter((l) => l !== listener);
  };
}

function notifyStatus(status: WsIntegrationStatus): void {
  statusListeners.forEach((fn) => fn(status));
}

/* ─── Message Dispatcher ─────────────────────────────────── */

function dispatchMessage(data: ServerMessage): void {
  const msg = data as Record<string, unknown>;
  const type = msg?.type as string | undefined;

  if (!type) return;

  switch (type) {
    case "new_idea": {
      const idea = (msg as unknown as NewIdeaMessage).idea;
      if (idea) {
        // Push new idea into the store's card queue
        const store = useStore.getState();
        const alreadyQueued = store.cards.some((c) => c.id === idea.id);
        if (!alreadyQueued) {
          useStore.setState((s) => ({
            cards: [...s.cards, idea],
          }));
        }
      }
      break;
    }

    case "preference_updated": {
      // Acknowledge preference update — trigger a reload of preferences
      useStore.getState().loadPreferences();
      break;
    }

    case "swipe_ack": {
      const ack = msg as unknown as SwipeAck;
      if (!ack.success) {
        // Failed swipe — add error toast
        useStore.getState().addToast(`Swipe failed for idea ${ack.idea_id}`, "error");
      }
      break;
    }

    default: {
      // Unknown message type — log if debug enabled
      if (ENV.DEBUG) {
        console.debug(`[WS] Unhandled message type: ${type}`, msg);
      }
    }
  }
}

/* ─── Buffer Management ──────────────────────────────────── */

/**
 * Check the current card buffer and request more if running low.
 * Call this after consuming a card or receiving a new_idea.
 */
export function checkBufferAndRefill(): void {
  const { cards, currentIndex, loadNextCards } = useStore.getState();
  const remaining = cards.length - currentIndex;

  if (remaining < cardBufferThreshold) {
    if (ENV.DEBUG) {
      console.debug(
        `[WS] Buffer low: ${remaining} remaining (threshold: ${cardBufferThreshold}), requesting more`,
      );
    }

    // Send request_more via WebSocket
    manager?.send({ type: "request_more", count: ENV.CARD_PREFETCH_COUNT });

    // Also trigger REST API fetch as fallback
    loadNextCards();
  }
}

/* ─── Lifecycle ──────────────────────────────────────────── */

/**
 * Initialize the WebSocket integration.
 * Call once at app root — typically in a useEffect in App.tsx.
 */
export function initWebSocketIntegration(config: WsIntegrationConfig = {}): void {
  if (manager) return; // Already initialized

  const handleMessage: WsMessageHandler = (data) => {
    dispatchMessage(data as ServerMessage);
  };

  const handleStatusChange = (status: WsIntegrationStatus) => {
    notifyStatus(status);

    if (status === "connected") {
      // On (re)connect: fetch initial batch and sync
      useStore.getState().loadNextCards();
      useStore.getState().loadPreferences();
      config.onReconnected?.();
    }
  };

  manager = new WebSocketManager({
    url: (config.url ?? ENV.WS_URL) || undefined,
    sessionId: config.sessionId,
    onMessage: handleMessage,
    onStatusChange: handleStatusChange,
  });

  manager.connect();
}

/**
 * Gracefully shut down the WebSocket integration.
 */
export function destroyWebSocketIntegration(): void {
  manager?.disconnect();
  manager = null;
  statusListeners = [];
  reconnectCallback = null;
}

/**
 * Send a typed message via WebSocket.
 * No-op if not connected.
 */
export function sendWsMessage(type: string, payload: Record<string, unknown> = {}): void {
  manager?.send({ type, ...payload });
}

/** Get current connection status */
export function getWsStatus(): WsIntegrationStatus {
  return manager?.status ?? "disconnected";
}

/** Update the card buffer threshold at runtime */
export function setCardBufferThreshold(threshold: number): void {
  cardBufferThreshold = Math.max(1, threshold);
}
