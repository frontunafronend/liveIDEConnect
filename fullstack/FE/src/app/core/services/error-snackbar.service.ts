import { Injectable, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SnackbarMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorSnackbarService {
  private readonly _messages = signal<SnackbarMessage[]>([]);
  readonly messages = this._messages.asReadonly();

  show(message: string, type: SnackbarMessage['type'] = 'error', duration: number = 5000): void {
    const id = `snackbar-${Date.now()}-${Math.random()}`;
    const snackbarMessage: SnackbarMessage = { id, message, type, duration };

    this._messages.update(messages => [...messages, snackbarMessage]);

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  dismiss(id: string): void {
    this._messages.update(messages => messages.filter(msg => msg.id !== id));
  }

  clear(): void {
    this._messages.set([]);
  }
}

