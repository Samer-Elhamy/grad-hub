/**
 * Inbound WebSocket message router.
 *
 * Validates and routes incoming client messages to the appropriate
 * subsystem: connection manager for preference updates, stream
 * manager for buffer requests, etc.
 *
 * @module websocket/message-handler
 */

import { WebSocket } from 'ws';
import type { WSMessage, WSOutboundMessage } from '../types/ws.types';
import type { ConnectionManager } from './connection-manager';
import type { StreamManager } from './stream-manager';

// ─── Message Schema Validation ──────────────────────────────────

/**
 * Validates that an inbound message has the required shape.
 * Returns the validated message or null if malformed.
 */
function validateMessage(raw: unknown): WSMessage | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const msg = raw as Record<string, unknown>;

  if (typeof msg.type !== 'string') return null;

  switch (msg.type) {
    case 'preference_update': {
      if (typeof msg.data !== 'object' || msg.data === null) return null;
      return { type: 'preference_update', data: msg.data as Record<string, unknown> };
    }
    case 'request_more': {
      const count = Number(msg.count);
      if (!Number.isInteger(count) || count < 1 || count > 50) return null;
      return { type: 'request_more', count };
    }
    case 'subscribe_category': {
      if (typeof msg.category !== 'string' || msg.category.trim().length === 0) return null;
      return { type: 'subscribe_category', category: msg.category.trim() };
    }
    case 'reconnect': {
      if (typeof msg.session_id !== 'string' || msg.session_id.length === 0) return null;
      const lastId = msg.last_received_id !== undefined ? Number(msg.last_received_id) : undefined;
      return {
        type: 'reconnect',
        session_id: msg.session_id,
        ...(lastId !== undefined && Number.isInteger(lastId) ? { last_received_id: lastId } : {}),
      };
    }
    default:
      return null;
  }
}

/**
 * Sends a single outbound message to a WebSocket, guarded by readyState.
 * Returns true if the message was sent, false otherwise.
 */
function sendSafe(ws: WebSocket, message: WSOutboundMessage): boolean {
  if (ws.readyState !== WebSocket.OPEN) return false;
  try {
    ws.send(JSON.stringify(message));
    return true;
  } catch {
    return false;
  }
}

// ─── Message Handler ────────────────────────────────────────────

export interface MessageHandler {
  /** Process an inbound raw message from a known session. */
  handle: (sessionId: string, raw: unknown) => void;
}

/**
 * Creates a message handler bound to the connection manager
 * and stream manager.
 */
export function createMessageHandler(
  connectionManager: ConnectionManager,
  streamManager: StreamManager,
): MessageHandler {
  function handle(sessionId: string, raw: unknown): void {
    const session = connectionManager.getSession(sessionId);
    if (!session) return;

    const ws = connectionManager.getSocket(sessionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const message = validateMessage(raw);
    if (!message) {
      // Send error back for malformed messages, ignore silently otherwise
      sendSafe(ws, {
        type: 'error',
        code: 'INVALID_MESSAGE',
        message: 'Malformed or unknown message type. Accepted types: preference_update, request_more, subscribe_category, reconnect.',
      });
      return;
    }

    switch (message.type) {
      case 'preference_update':
        handlePreferenceUpdate(sessionId, message.data, ws);
        break;

      case 'request_more':
        handleRequestMore(sessionId, message.count, ws);
        break;

      case 'subscribe_category':
        handleSubscribeCategory(sessionId, message.category, ws);
        break;

      case 'reconnect':
        handleReconnect(sessionId, message.session_id, ws);
        break;
    }
  }

  // ─── Sub-handlers ─────────────────────────────────────────────

  function handlePreferenceUpdate(
    sessionId: string,
    data: Record<string, unknown>,
    ws: WebSocket,
  ): void {
    const updated = connectionManager.updatePreference(sessionId, data);
    if (!updated) {
      sendSafe(ws, {
        type: 'error',
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found. Please reconnect.',
      });
      return;
    }

    // Notify stream manager to re-evaluate filtering for this client
    streamManager.flushBufferedForSession(sessionId);
  }

  function handleRequestMore(
    sessionId: string,
    count: number,
    ws: WebSocket,
  ): void {
    const ideas = streamManager.popFromBuffer(sessionId, count);

    // Report buffer status
    const session = connectionManager.getSession(sessionId);
    if (session) {
      sendSafe(ws, {
        type: 'buffer_status',
        data: {
          queued: session.buffer_state.size,
          capacity: session.buffer_state.capacity,
          is_low: session.buffer_state.size <= session.buffer_state.low_water_mark,
        },
      });
    }
  }

  function handleSubscribeCategory(
    sessionId: string,
    category: string,
    ws: WebSocket,
  ): void {
    // Narrow stream: exclude all categories except this one
    const session = connectionManager.getSession(sessionId);
    if (!session) return;

    const allCategories = Object.keys(session.preference_context.category_weights);
    const excluded = allCategories.filter((c) => c !== category);

    connectionManager.updatePreference(sessionId, {
      excluded_categories: excluded,
      last_updated: new Date().toISOString(),
    });

    // Flush buffer to apply new filter
    streamManager.flushBufferedForSession(sessionId);
  }

  function handleReconnect(
    sessionId: string,
    reconnectSessionId: string,
    ws: WebSocket,
  ): void {
    // If the session is different, register as new
    if (sessionId !== reconnectSessionId) {
      // Register new session, carry over preference context
      connectionManager.register(ws, reconnectSessionId);
    }

    // Stream manager will re-send from last_sent_idea_id
    streamManager.sendInitialBatch(reconnectSessionId);
  }

  return { handle };
}
