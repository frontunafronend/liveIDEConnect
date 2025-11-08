import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LiveIdeMessage } from '../types';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MessagesService {
  private readonly apiUrl = `${environment.apiBaseUrl}/messages`;

  // Signal for reactive state
  private readonly _messages = signal<Record<string, LiveIdeMessage[]>>({});
  readonly messages = this._messages.asReadonly();

  constructor(private http: HttpClient) {}

  loadMessages(sessionId: string): Observable<LiveIdeMessage[]> {
    return this.http.get<LiveIdeMessage[]>(`${this.apiUrl}/${sessionId}`).pipe(
      tap(messages => {
        const current = this._messages();
        this._messages.set({
          ...current,
          [sessionId]: messages
        });
      })
    );
  }

  getMessagesForSession(sessionId: string): LiveIdeMessage[] {
    return this._messages()[sessionId] || [];
  }

  addMessage(sessionId: string, message: LiveIdeMessage): void {
    const current = this._messages();
    const sessionMessages = current[sessionId] || [];
    this._messages.set({
      ...current,
      [sessionId]: [...sessionMessages, message]
    });
  }
}

