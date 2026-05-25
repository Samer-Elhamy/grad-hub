/**
 * WebSocket server for the real-time idea stream.
 *
 * Integrates into the existing Express HTTP server on the `/ws/stream` path.
 * Owns the upgrade handshake, wires together connection management,
 * stream orchestration, and message routing.
 *
 * Usage in `app.ts` or `index.ts`:
 * ```ts
 * import { initWebSocketServer } from './websocket/ws-server';
 * const server = app.listen(PORT);
 * const wsServer = initWebSocketServer(server);
 * // On shutdown: wsServer.shutdown();
 * ```
 *
 * @module websocket/ws-server
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import type { StreamConfig } from '../types/ws.types';
import { DEFAULT_STREAM_CONFIG } from '../types/ws.types';
import { createConnectionManager } from './connection-manager';
import type { ConnectionManager } from './connection-manager';
import { createStreamManager } from './stream-manager';
import type { StreamManager, PrefetchHandler } from './stream-manager';
import { createMessageHandler } from './message-handler';
import type { MessageHandler } from './message-handler';

// ─── Constants ──────────────────────────────────────────────────

const WS_PATH = '/ws/stream';

// ─── Types ──────────────────────────────────────────────────────

export interface WebSocketService {
  /** The underlying ws WebSocketServer instance. */
  wss: WebSocketServer;
  /** Connection manager — inspect or modify client sessions. */
  connectionManager: ConnectionManager;
  /** Stream manager — push ideas or inspect buffer state. */
  streamManager: StreamManager;
  /** Message handler — routes inbound client messages. */
  messageHandler: MessageHandler;
  /** Gracefully shut down all connections and clean up resources. */
  shutdown: () => void;
  /** Register a callback for when a client's buffer needs refilling. */
  onPrefetchNeeded: (handler: PrefetchHandler) => void;
}

// ─── Server Factory ─────────────────────────────────────────────

/**
 * Initialise the WebSocket server on top of an existing HTTP server.
 *
 * 1. Creates a `WebSocketServer` with `noServer: true`.
 * 2. Hooks into the HTTP `upgrade` event, routing only `/ws/stream`.
 * 3. Wires up connection tracking, stream orchestration, and message routing.
 * 4. Starts the heartbeat cycle.
 *
 * @param server   The Node.js HTTP server (from `app.listen`)
 * @param config   Optional overrides for stream configuration
 * @returns        A service handle exposing internals and shutdown
 */
export function initWebSocketServer(
  server: HttpServer,
  config: StreamConfig = DEFAULT_STREAM_CONFIG,
): WebSocketService {
  // ── Create underlying ws server (noServer mode) ───────────────
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: config.max_payload_bytes,
  });

  // ── Create subsystems ─────────────────────────────────────────
  const connectionManager = createConnectionManager(config);

  // Default prefetch handler — no-op; the integration agent registers
  // the real callback that queries the database or triggers the crawler.
  let prefetchHandler: PrefetchHandler = () => {};

  const streamManager = createStreamManager(connectionManager, config, (sid, count) => {
    prefetchHandler(sid, count);
  });

  const messageHandler = createMessageHandler(connectionManager, streamManager);

  // ── Heartbeat timer ───────────────────────────────────────────
  const heartbeatTimer = connectionManager.startHeartbeat();

  // ── HTTP → WebSocket upgrade ──────────────────────────────────
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '', `http://${request.headers.host ?? 'localhost'}`);

    if (url.pathname !== WS_PATH) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  // ── New connection handler ────────────────────────────────────
  wss.on('connection', (ws: WebSocket) => {
    const sessionId = connectionManager.register(ws);

    // Pong → mark alive
    ws.on('pong', () => {
      connectionManager.markAlive(ws);
    });

    // Inbound messages
    ws.on('message', (raw) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        // Malformed JSON — ignore
        return;
      }
      messageHandler.handle(sessionId, parsed);
    });

    // Error — log and clean up
    ws.on('error', (err) => {
      console.error(`[ws:${sessionId}] Connection error:`, err.message);
    });

    // Close — clean up tracking
    ws.on('close', () => {
      connectionManager.unregister(sessionId);
    });

    // Immediately send the initial batch of ideas
    streamManager.sendInitialBatch(sessionId);
  });

  // ── Graceful shutdown ─────────────────────────────────────────
  wss.on('close', () => {
    connectionManager.stopHeartbeat(heartbeatTimer);
  });

  // ── Public API ────────────────────────────────────────────────
  return {
    wss,
    connectionManager,
    streamManager,
    messageHandler,

    shutdown(): void {
      console.log('[ws] Shutting down WebSocket server...');

      // Stop accepting new connections
      wss.close();

      // Drain streaming buffers
      streamManager.drainAll();

      // Close all client connections gracefully
      connectionManager.closeAll(1001, 'Server shutting down');

      // Stop heartbeat
      connectionManager.stopHeartbeat(heartbeatTimer);

      console.log('[ws] WebSocket server shut down complete.');
    },

    onPrefetchNeeded(handler: PrefetchHandler): void {
      prefetchHandler = handler;
      streamManager.onPrefetchNeeded(handler);
    },
  };
}
