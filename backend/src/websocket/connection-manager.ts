/**
 * WebSocket client lifecycle manager.
 *
 * Tracks all connected clients with full session metadata,
 * runs heartbeat ping/pong every 30 s, auto-disconnects clients
 * that don't respond within 60 s, and provides client count metrics.
 *
 * @module websocket/connection-manager
 */

import { WebSocket } from 'ws';
import type { PreferenceVector } from '../types/api';
import type { ClientSession, BufferState, StreamConfig } from '../types/ws.types';
import { DEFAULT_STREAM_CONFIG } from '../types/ws.types';

// ─── Internal Symbol Keys ───────────────────────────────────────

const kSessionId = Symbol('session_id');
const kIsAlive = Symbol('is_alive');
const kLastPong = Symbol('last_pong');

/** Extended WebSocket with internal tracking metadata */
export interface TrackedSocket extends WebSocket {
  [kSessionId]: string;
  [kIsAlive]: boolean;
  [kLastPong]: number;
}

// ─── Helpers ────────────────────────────────────────────────────

let nextId = 1;
function generateSessionId(): string {
  return `sess_${Date.now()}_${nextId++}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function nowMs(): number {
  return Date.now();
}

// ─── Default Preference Vector ──────────────────────────────────

const DEFAULT_PREFERENCE: PreferenceVector = {
  category_weights: {},
  keyword_weights: {},
  excluded_categories: [],
  difficulty_preference: null,
  last_updated: nowISO(),
};

// ─── Connection Manager Factory ─────────────────────────────────

export interface ConnectionManager {
  /** Register a new WebSocket connection and return its session id. */
  register: (ws: WebSocket, sessionId?: string) => string;
  /** Unregister a client by session id — returns true if found. */
  unregister: (sessionId: string) => boolean;
  /** Get session metadata for a connected client. Returns null if unknown. */
  getSession: (sessionId: string) => ClientSession | null;
  /** Get the WebSocket for a session id. Returns null if unknown. */
  getSocket: (sessionId: string) => TrackedSocket | null;
  /** Return all active sessions (snapshot — safe to iterate). */
  getAllSessions: () => ClientSession[];
  /** Return all tracked sockets. */
  getAllSockets: () => TrackedSocket[];
  /** Number of currently connected clients. */
  clientCount: () => number;
  /** Mark a connection as alive (called on pong). */
  markAlive: (ws: WebSocket) => void;
  /** Check all connections — terminate stale ones, return count removed. */
  checkHeartbeat: () => number;
  /** Start periodic heartbeat. Returns the interval handle for cleanup. */
  startHeartbeat: (onStale?: (sessionId: string) => void) => NodeJS.Timeout;
  /** Stop heartbeat interval. */
  stopHeartbeat: (timer: NodeJS.Timeout) => void;
  /** Update a client's preference context. */
  updatePreference: (sessionId: string, prefs: Partial<PreferenceVector>) => boolean;
  /** Update a client's buffer state. */
  updateBufferState: (sessionId: string, state: Partial<BufferState>) => boolean;
  /** Get aggregate metrics for monitoring. */
  getMetrics: () => ConnectionMetrics;
  /** Close all connections gracefully. */
  closeAll: (code?: number, reason?: string) => void;
}

export interface ConnectionMetrics {
  total_connections: number;
  alive_count: number;
  stale_count: number;
  oldest_session_age_ms: number;
  average_buffer_occupancy: number;
}

/**
 * Creates a connection manager that owns the client tracking map
 * and heartbeat lifecycle.
 */
export function createConnectionManager(
  config: StreamConfig = DEFAULT_STREAM_CONFIG,
): ConnectionManager {
  // session_id → TrackedSocket
  const sockets = new Map<string, TrackedSocket>();

  // session_id → ClientSession (metadata, not the socket itself)
  const sessions = new Map<string, ClientSession>();

  function getSession(sessionId: string): ClientSession | null {
    return sessions.get(sessionId) ?? null;
  }

  function getSocket(sessionId: string): TrackedSocket | null {
    return sockets.get(sessionId) ?? null;
  }

  function register(ws: WebSocket, sessionId?: string): string {
    const sid = sessionId ?? generateSessionId();

    // If reconnecting with existing session, restore metadata
    const existing = sessions.get(sid);
    const preferenceContext = existing
      ? existing.preference_context
      : { ...DEFAULT_PREFERENCE, last_updated: nowISO() };

    const bufferState: BufferState = {
      size: 0,
      capacity: config.buffer_capacity,
      low_water_mark: config.buffer_low_water_mark,
    };

    const session: ClientSession = {
      session_id: sid,
      ready_state: ws.readyState,
      connected_at: nowISO(),
      last_active_at: nowISO(),
      preference_context: preferenceContext,
      last_sent_idea_id: existing?.last_sent_idea_id ?? null,
      buffer_state: bufferState,
      is_alive: true,
    };

    // Attach internal tracking to the socket
    const tracked = ws as TrackedSocket;
    tracked[kSessionId] = sid;
    tracked[kIsAlive] = true;
    tracked[kLastPong] = nowMs();

    sockets.set(sid, tracked);
    sessions.set(sid, session);

    return sid;
  }

  function unregister(sessionId: string): boolean {
    const had = sockets.has(sessionId);
    sockets.delete(sessionId);
    sessions.delete(sessionId);
    return had;
  }

  function getAllSessions(): ClientSession[] {
    return Array.from(sessions.values());
  }

  function getAllSockets(): TrackedSocket[] {
    return Array.from(sockets.values());
  }

  function clientCount(): number {
    return sockets.size;
  }

  function markAlive(ws: WebSocket): void {
    const tracked = ws as TrackedSocket;
    tracked[kIsAlive] = true;
    tracked[kLastPong] = nowMs();

    const session = sessions.get(tracked[kSessionId]);
    if (session) {
      session.is_alive = true;
      session.last_active_at = nowISO();
    }
  }

  /**
   * Check all connections — terminate any that haven't responded.
   * Returns the number of stale connections terminated.
   */
  function checkHeartbeat(): number {
    const now = nowMs();
    let staleCount = 0;

    for (const [sid, sock] of sockets.entries()) {
      const elapsed = now - sock[kLastPong];

      if (elapsed > config.disconnect_timeout_ms) {
        // Terminate stale connection
        sock.terminate();
        sockets.delete(sid);
        sessions.delete(sid);
        staleCount++;
      } else if (!sock[kIsAlive]) {
        // Didn't respond to last ping — send another ping
        try {
          sock.ping();
        } catch {
          sock.terminate();
          sockets.delete(sid);
          sessions.delete(sid);
          staleCount++;
        }
      } else {
        // Mark as not-alive pending pong response
        sock[kIsAlive] = false;
        try {
          sock.ping();
        } catch {
          sock.terminate();
          sockets.delete(sid);
          sessions.delete(sid);
          staleCount++;
        }
      }
    }

    return staleCount;
  }

  function startHeartbeat(onStale?: (sessionId: string) => void): NodeJS.Timeout {
    return setInterval(() => {
      const stale = checkHeartbeat();
      if (stale > 0 && onStale) {
        // onStale is informational; we already cleaned up
        void stale;
      }
    }, config.heartbeat_interval_ms);
  }

  function stopHeartbeat(timer: NodeJS.Timeout): void {
    clearInterval(timer);
  }

  function updatePreference(sessionId: string, prefs: Partial<PreferenceVector>): boolean {
    const session = sessions.get(sessionId);
    if (!session) return false;

    session.preference_context = {
      ...session.preference_context,
      ...prefs,
      last_updated: nowISO(),
    };
    session.last_active_at = nowISO();
    return true;
  }

  function updateBufferState(sessionId: string, state: Partial<BufferState>): boolean {
    const session = sessions.get(sessionId);
    if (!session) return false;

    session.buffer_state = { ...session.buffer_state, ...state };
    session.last_active_at = nowISO();
    return true;
  }

  function getMetrics(): ConnectionMetrics {
    const now = nowMs();
    let oldest = now;
    let totalBufferSize = 0;

    for (const s of sessions.values()) {
      const age = now - new Date(s.connected_at).getTime();
      if (age < oldest) oldest = age;
      totalBufferSize += s.buffer_state.size;
    }

    const aliveCount = Array.from(sockets.values()).filter((s) => s[kIsAlive]).length;

    return {
      total_connections: sockets.size,
      alive_count: aliveCount,
      stale_count: sockets.size - aliveCount,
      oldest_session_age_ms: oldest === now && sockets.size === 0 ? 0 : now - oldest,
      average_buffer_occupancy: sockets.size > 0 ? totalBufferSize / sockets.size : 0,
    };
  }

  function closeAll(code = 1001, reason = 'Server shutting down'): void {
    for (const [sid, sock] of sockets.entries()) {
      try {
        sock.close(code, reason);
      } catch {
        sock.terminate();
      }
      sockets.delete(sid);
      sessions.delete(sid);
    }
  }

  return {
    register,
    unregister,
    getSession,
    getSocket,
    getAllSessions,
    getAllSockets,
    clientCount,
    markAlive,
    checkHeartbeat,
    startHeartbeat,
    stopHeartbeat,
    updatePreference,
    updateBufferState,
    getMetrics,
    closeAll,
  };
}
