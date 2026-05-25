/* ════════════════════════════════════════
   useWebSocket — React hook for WebSocket lifecycle
   Auto-connects on mount, disconnects on unmount
   Wraps WebSocketManager with React state integration
   ════════════════════════════════════════ */

import { useEffect, useRef, useState, useCallback } from "react";
import { WebSocketManager, type WsStatus, type WsMessageHandler } from "../services/websocket";
import { useStore } from "../store";

interface UseWebSocketOptions {
  sessionId?: string;
  url?: string;
}

/**
 * React hook wrapping WebSocketManager.
 * Auto-connects on mount, cleanly disconnects on unmount.
 * Pushes new_idea events into the store's card queue.
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [status, setStatus] = useState<WsStatus>("disconnected");
  const managerRef = useRef<WebSocketManager | null>(null);
  const loadNextCards = useStore((s) => s.loadNextCards);

  const handleMessage = useCallback<WsMessageHandler>(
    (data) => {
      const msg = data as Record<string, unknown>;
      if (msg?.type === "new_idea" && msg?.idea) {
        // New idea pushed from server — add to card queue
        // The store's loadNextCards will pull from API
        loadNextCards();
      }
    },
    [loadNextCards],
  );

  useEffect(() => {
    const manager = new WebSocketManager({
      url: options.url,
      sessionId: options.sessionId,
      onMessage: handleMessage,
      onStatusChange: setStatus,
    });

    managerRef.current = manager;
    manager.connect();

    return () => {
      manager.disconnect();
      managerRef.current = null;
    };
  }, [options.url, options.sessionId, handleMessage]);

  /** Manually reconnect */
  const reconnect = useCallback(() => {
    managerRef.current?.connect();
  }, []);

  return { status, reconnect };
}
