/**
 * WebSocket type definitions for the real-time idea stream.
 *
 * Defines message contracts, client session metadata, buffer state,
 * and stream configuration used across all WebSocket modules.
 */

import type { Idea, PreferenceVector } from './api';

// ─── Inbound Messages (Client → Server) ─────────────────────────

/** Client updates their preference context — adjusts stream filtering */
export interface PreferenceUpdateMessage {
  type: 'preference_update';
  data: Partial<PreferenceVector>;
}

/** Client requests additional ideas from their prefetch buffer */
export interface RequestMoreMessage {
  type: 'request_more';
  count: number;
}

/** Client subscribes to a specific idea category — narrows the stream */
export interface SubscribeCategoryMessage {
  type: 'subscribe_category';
  category: string;
}

/** Client sends session_id on reconnect for state resumption */
export interface ReconnectMessage {
  type: 'reconnect';
  session_id: string;
  last_received_id?: number;
}

/** All inbound message types that the server can receive */
export type WSMessage =
  | PreferenceUpdateMessage
  | RequestMoreMessage
  | SubscribeCategoryMessage
  | ReconnectMessage;

// ─── Outbound Messages (Server → Client) ────────────────────────

/** A fresh idea discovered by the search pipeline */
export interface NewIdeaOutbound {
  type: 'new_idea';
  data: Idea;
}

/** Preference vector was updated in response to client's feedback */
export interface PreferenceUpdateOutbound {
  type: 'preference_update';
  data: PreferenceVector;
}

/** Initial batch sent to a freshly connected client */
export interface InitialBatchOutbound {
  type: 'initial_batch';
  data: {
    ideas: Idea[];
    total_available: number;
    session_id: string;
  };
}

/** Server-side buffer status notification */
export interface BufferStatusOutbound {
  type: 'buffer_status';
  data: {
    queued: number;
    capacity: number;
    is_low: boolean;
  };
}

/** Heartbeat response to confirm connection is alive */
export interface PongOutbound {
  type: 'pong';
  timestamp: string;
}

/** Error notification sent to client */
export interface ErrorOutbound {
  type: 'error';
  code: string;
  message: string;
}

/** All outbound message types that the server can send */
export type WSOutboundMessage =
  | NewIdeaOutbound
  | PreferenceUpdateOutbound
  | InitialBatchOutbound
  | BufferStatusOutbound
  | PongOutbound
  | ErrorOutbound;

// ─── Client Session ─────────────────────────────────────────────

/** Tracks a connected WebSocket client's state */
export interface ClientSession {
  /** Unique session identifier (generated on first connect, reused on reconnect) */
  session_id: string;
  /** WebSocket readyState (1 = OPEN) */
  ready_state: number;
  /** ISO timestamp of when this session connected */
  connected_at: string;
  /** ISO timestamp of last activity (message sent or received) */
  last_active_at: string;
  /** Client's preference context for stream filtering */
  preference_context: PreferenceVector;
  /** Index of the last-sent idea ID for reconnection resumption */
  last_sent_idea_id: number | null;
  /** Current buffer occupancy */
  buffer_state: BufferState;
  /** Whether the client has responded to the latest ping */
  is_alive: boolean;
}

/** Prefetch buffer state for a single client */
export interface BufferState {
  /** Number of ideas currently in the buffer */
  size: number;
  /** Maximum capacity (default: 20) */
  capacity: number;
  /** Threshold below which auto-prefetch triggers (default: 5) */
  low_water_mark: number;
}

// ─── Stream Configuration ───────────────────────────────────────

/** Global stream configuration with sensible defaults */
export interface StreamConfig {
  /** Heartbeat ping interval in ms (default: 30_000) */
  heartbeat_interval_ms: number;
  /** Max ms without pong before disconnect (default: 60_000) */
  disconnect_timeout_ms: number;
  /** Per-client prefetch buffer capacity (default: 20) */
  buffer_capacity: number;
  /** Buffer low-water mark for auto-prefetch trigger (default: 5) */
  buffer_low_water_mark: number;
  /** Max outbound message payload size in bytes (default: 256 KB) */
  max_payload_bytes: number;
  /** Max queued messages per client for backpressure (default: 50) */
  max_queued_messages: number;
}

/** Default stream configuration — frozen for immutability */
export const DEFAULT_STREAM_CONFIG: StreamConfig = Object.freeze({
  heartbeat_interval_ms: 30_000,
  disconnect_timeout_ms: 60_000,
  buffer_capacity: 20,
  buffer_low_water_mark: 5,
  max_payload_bytes: 256 * 1024,
  max_queued_messages: 50,
});
