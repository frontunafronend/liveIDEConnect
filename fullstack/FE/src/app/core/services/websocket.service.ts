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
  
  readonly messages$ = this.messageSubject.asObservable();
  readonly isConnected = this._isConnected.asReadonly();

  constructor(private authService: AuthService) {}

  connect(sessionId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.disconnect();
    }

    const token = this.authService.getAuthToken();
    if (!token) {
      console.error('No authentication token available');
      return;
    }

    const wsUrl = `${environment.wsUrl}?sessionId=${sessionId}&token=${token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this._isConnected.set(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const message: LiveIdeMessage = JSON.parse(event.data);
        this.messageSubject.next(message);
      } catch (error) {
      }
    };

    this.ws.onerror = (error) => {
      this._isConnected.set(false);
    };

    this.ws.onclose = () => {
      this._isConnected.set(false);
    };
  }

  sendMessage(message: Omit<LiveIdeMessage, 'ts'>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const fullMessage: LiveIdeMessage = {
        ...message,
        ts: new Date().toISOString()
      };
      this.ws.send(JSON.stringify(fullMessage));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this._isConnected.set(false);
    }
  }
}

