/* ════════════════════════════════════════
   WebSocket Connection Manager
   Auto-connect, exponential backoff reconnect, session resume
   ════════════════════════════════════════ */

export type WsMessageHandler = (data: unknown) => void;
export type WsStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

interface WsConfig {
  url?: string;
  sessionId?: string;
  onMessage?: WsMessageHandler;
  onStatusChange?: (status: WsStatus) => void;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: Required<Pick<WsConfig, "url">> & WsConfig;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;
  private baseDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  constructor(config: WsConfig) {
    this.config = {
      url: config.url ?? `ws://${window.location.host}/ws/stream`,
      ...config,
    };
  }

  get status(): WsStatus {
    if (!this.ws) return "disconnected";
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "connecting";
      case WebSocket.OPEN:
        return "connected";
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return "disconnected";
      default:
        return "disconnected";
    }
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.closed = false;
    this.setStatus(this.reconnectAttempts > 0 ? "reconnecting" : "connecting");

    const url = this.config.sessionId
      ? `${this.config.url}?session_id=${encodeURIComponent(this.config.sessionId)}`
      : this.config.url;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus("connected");
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        this.config.onMessage?.(data);
      } catch {
        // If not JSON, pass raw data
        this.config.onMessage?.(event.data);
      }
    };

    this.ws.onclose = () => {
      if (!this.closed) {
        this.scheduleReconnect();
      } else {
        this.setStatus("disconnected");
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };
  }

  disconnect(): void {
    this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.setStatus("disconnected");
  }

  send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private scheduleReconnect(): void {
    if (this.closed) return;

    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay,
    );

    this.reconnectAttempts++;
    this.setStatus("reconnecting");

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay + Math.random() * 500); // Add jitter
  }

  private setStatus(status: WsStatus): void {
    this.config.onStatusChange?.(status);
  }
}
