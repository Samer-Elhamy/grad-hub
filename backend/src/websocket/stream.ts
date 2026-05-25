/**
 * WebSocket Stream — backward-compatible re-export.
 *
 * The WebSocket infrastructure has been refactored into focused modules:
 *   - `ws-server.ts`       — server lifecycle, upgrade handling, wiring
 *   - `connection-manager.ts` — client tracking, heartbeat, cleanup
 *   - `stream-manager.ts`    — idea push orchestration, prefetch buffers
 *   - `message-handler.ts`   — inbound message routing
 *   - `idea-buffer.ts`       — per-client FIFO prefetch buffer
 *
 * This file provides backward-compatible exports for existing consumers.
 * New code should import directly from `./ws-server`.
 *
 * @module websocket/stream
 */

import type { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { initWebSocketServer } from './ws-server';
import type { WebSocketService } from './ws-server';
import type { WsServerMessage } from '../types/api';

// ─── Singleton State ────────────────────────────────────────────

let service: WebSocketService | null = null;

// ─── Backward-Compatible API ────────────────────────────────────

/**
 * Initialize the WebSocket server on top of an HTTP server.
 * Delegates to the new `initWebSocketServer` from ws-server.ts.
 */
export function initWebSocketStream(server: Server): WebSocketServer {
  service = initWebSocketServer(server);
  return service.wss;
}

/**
 * Broadcast a message to all connected WebSocket clients.
 */
export function broadcast(message: WsServerMessage): void {
  if (!service) return;

  const payload = JSON.stringify(message);
  service.wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

/**
 * Broadcast a new idea to all connected clients.
 * Uses the new stream manager for preference-filtered delivery.
 */
export function broadcastNewIdea(idea: WsServerMessage['data']): void {
  if (!service) return;

  // Delegate to the stream manager for filtered delivery
  service.streamManager.broadcastNewIdeas([idea as any]);
}

/**
 * Broadcast a preference update to all connected clients.
 */
export function broadcastPreferenceUpdate(vector: WsServerMessage['data']): void {
  if (!service) return;

  const payload = JSON.stringify({ type: 'preference_update', data: vector });
  service.wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

/**
 * Gracefully shut down all WebSocket connections.
 */
export function shutdownWebSocketStream(): void {
  if (service) {
    service.shutdown();
    service = null;
  }
}
