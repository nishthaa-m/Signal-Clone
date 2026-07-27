import { WSEvent } from './types';

function getWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  return apiUrl.replace(/^http/, 'ws');
}

const WS_BASE_URL = getWsUrl();

type EventCallback = (event: WSEvent) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private listeners: Set<EventCallback> = new Set();
  private isConnecting: boolean = false;
  private token: string | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  public connect(token: string) {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.token = token;
    this.isConnecting = true;

    try {
      this.socket = new WebSocket(`${WS_BASE_URL}/ws/${token}`);

      this.socket.onopen = () => {
        this.isConnecting = false;
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const data: WSEvent = JSON.parse(event.data);
          this.notifyListeners(data);
        } catch {
          // Non-JSON or pong frame
        }
      };

      this.socket.onclose = () => {
        this.isConnecting = false;
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.socket?.close();
      };
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public subscribe(callback: EventCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public sendTyping(conversationId: number, isTyping: boolean) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: 'typing',
          conversation_id: conversationId,
          is_typing: isTyping,
        })
      );
    }
  }

  private notifyListeners(event: WSEvent) {
    this.listeners.forEach((callback) => callback(event));
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout || !this.token) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.token) {
        this.connect(this.token);
      }
    }, 3000);
  }
}

export const wsClient = new WebSocketClient();
