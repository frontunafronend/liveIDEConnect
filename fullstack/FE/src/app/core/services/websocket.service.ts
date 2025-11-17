import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { LiveIdeMessage } from '../types';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private ws: WebSocket | null = null;
  private messageSubject = new Subject<LiveIdeMessage>();
  private readonly _isConnected = signal(false);
  private currentSessionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private reconnectTimeout: any = null;
  private isManualDisconnect = false;
  
  readonly messages$ = this.messageSubject.asObservable();
  readonly isConnected = this._isConnected.asReadonly();

  constructor(private authService: AuthService) {}

  connect(sessionId: string): void {
    // If already connected to the same session, don't reconnect
    if (this.ws?.readyState === WebSocket.OPEN && this.currentSessionId === sessionId) {
      console.log('✅ Already connected to this session');
      return;
    }

    // If connecting to a different session, disconnect first
    if (this.currentSessionId && this.currentSessionId !== sessionId) {
      this.disconnect();
    }

    this.currentSessionId = sessionId;
    this.isManualDisconnect = false;
    this.reconnectAttempts = 0;
    this._connect(sessionId);
  }

  private _connect(sessionId: string): void {
    // Clear any pending reconnection
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Close existing connection if any
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    const token = this.authService.getAuthToken();
    if (!token) {
      console.error('❌ No authentication token available');
      this._isConnected.set(false);
      return;
    }

    const wsUrl = `${environment.wsUrl}?sessionId=${sessionId}&token=${token}`;
    console.log(`🔌 Connecting to WebSocket: ${wsUrl.replace(/token=[^&]+/, 'token=***')}`);
    
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this._isConnected.set(true);
        this.reconnectAttempts = 0; // Reset on successful connection
        this.reconnectDelay = 1000; // Reset delay
      };

      this.ws.onmessage = (event) => {
        try {
          const message: LiveIdeMessage = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', message);
          this.messageSubject.next(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this._isConnected.set(false);
      };

      this.ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed. Code: ${event.code}, Reason: ${event.reason || 'No reason'}`);
        this._isConnected.set(false);
        this.ws = null;

        // Only attempt to reconnect if:
        // 1. It wasn't a manual disconnect
        // 2. We haven't exceeded max attempts
        // 3. We have a session ID
        // 4. The close code isn't 1008 (policy violation) or 1000 (normal closure)
        if (
          !this.isManualDisconnect &&
          this.reconnectAttempts < this.maxReconnectAttempts &&
          this.currentSessionId &&
          event.code !== 1008 && // Policy violation (auth error)
          event.code !== 1000    // Normal closure
        ) {
          this.reconnectAttempts++;
          const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000); // Exponential backoff, max 30s
          console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          
          this.reconnectTimeout = setTimeout(() => {
            if (this.currentSessionId) {
              this._connect(this.currentSessionId);
            }
          }, delay);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('❌ Max reconnection attempts reached. Please refresh the page.');
        }
      };
    } catch (error) {
      console.error('❌ Error creating WebSocket:', error);
      this._isConnected.set(false);
    }
  }

  sendMessage(message: Omit<LiveIdeMessage, 'ts'> | LiveIdeMessage, targetTabId?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Type guard to check if message has 'ts' property
      const hasTimestamp = (msg: Omit<LiveIdeMessage, 'ts'> | LiveIdeMessage): msg is LiveIdeMessage => {
        return 'ts' in msg && typeof (msg as LiveIdeMessage).ts === 'string';
      };
      
      const fullMessage: any = {
        ...message,
        ts: hasTimestamp(message) ? message.ts : new Date().toISOString()
      };
      
      // Add targetTabId if provided (for routing to specific Cursor tab)
      if (targetTabId) {
        fullMessage.targetTabId = targetTabId;
      }
      
      console.log('📤 Sending WebSocket message:', fullMessage);
      this.ws.send(JSON.stringify(fullMessage));
    } else {
      console.error('❌ WebSocket not connected. State:', this.ws?.readyState);
    }
  }

  disconnect(): void {
    this.isManualDisconnect = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this._isConnected.set(false);
    }
    this.currentSessionId = null;
  }
}

