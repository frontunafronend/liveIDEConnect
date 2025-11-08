import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { LiveIdeSession } from '../types';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SessionsService {
  private readonly apiUrl = `${environment.apiBaseUrl}/sessions`;

  // Signal for reactive state
  private readonly _sessions = signal<LiveIdeSession[]>([]);
  readonly sessions = this._sessions.asReadonly();

  constructor(private http: HttpClient) {}

  loadSessions(): Observable<LiveIdeSession[]> {
    // Auth interceptor automatically adds Authorization header
    return this.http.get<LiveIdeSession[]>(this.apiUrl).pipe(
      tap(sessions => this._sessions.set(sessions)),
      catchError(error => {
        // Error interceptor handles 401 and redirects
        // Just return empty array to prevent further errors
        if (error.status === 401) {
          this._sessions.set([]);
          return of([]);
        }
        throw error;
      })
    );
  }

  getSession(id: string): Observable<LiveIdeSession> {
    // Auth interceptor automatically adds Authorization header
    return this.http.get<LiveIdeSession>(`${this.apiUrl}/${id}`);
  }

  refreshSessions(): void {
    this.loadSessions().subscribe({
      error: () => {
        // Error already handled in loadSessions
      }
    });
  }

  createSession(name: string, status: string = 'online'): Observable<LiveIdeSession> {
    return this.http.post<LiveIdeSession>(this.apiUrl, { name, status }).pipe(
      tap(newSession => {
        // Add the new session to the list
        const currentSessions = this._sessions();
        this._sessions.set([newSession, ...currentSessions]);
      })
    );
  }
}

