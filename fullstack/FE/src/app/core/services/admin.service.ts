import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminOverview {
  stats: {
    totalUsers: number;
    totalSessions: number;
    totalMessages: number;
    activeSessions: number;
    onlineUsers: number;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt?: string;
}

export interface AIAlert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface SystemLog {
  id: string;
  type: 'message' | 'session';
  action: string;
  userId?: string;
  sessionId?: string;
  timestamp: string;
  details: any;
}

export interface AdminSession {
  id: string;
  name: string;
  status: string;
  lastActive: string;
  createdAt: string;
  userId: string;
  user: {
    email: string;
    name: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly apiUrl = `${environment.apiBaseUrl}/admin`;

  private readonly _overview = signal<AdminOverview | null>(null);
  private readonly _users = signal<AdminUser[]>([]);
  private readonly _alerts = signal<AIAlert[]>([]);
  private readonly _logs = signal<SystemLog[]>([]);
  private readonly _sessions = signal<AdminSession[]>([]);

  readonly overview = this._overview.asReadonly();
  readonly users = this._users.asReadonly();
  readonly alerts = this._alerts.asReadonly();
  readonly logs = this._logs.asReadonly();
  readonly sessions = this._sessions.asReadonly();

  constructor(private http: HttpClient) {}

  loadOverview(): Observable<AdminOverview> {
    return this.http.get<AdminOverview>(`${this.apiUrl}/overview`).pipe(
      tap(overview => this._overview.set(overview))
    );
  }

  loadUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.apiUrl}/users`).pipe(
      tap(users => this._users.set(users))
    );
  }

  loadAlerts(): Observable<AIAlert[]> {
    return this.http.get<AIAlert[]>(`${this.apiUrl}/alerts`).pipe(
      tap(alerts => this._alerts.set(alerts))
    );
  }

  loadLogs(limit: number = 50, offset: number = 0): Observable<{ logs: SystemLog[]; total: number }> {
    return this.http.get<{ logs: SystemLog[]; total: number }>(`${this.apiUrl}/logs`, {
      params: { limit: limit.toString(), offset: offset.toString() }
    }).pipe(
      tap(result => this._logs.set(result.logs))
    );
  }

  loadSessions(): Observable<AdminSession[]> {
    return this.http.get<AdminSession[]>(`${this.apiUrl}/sessions`).pipe(
      tap(sessions => this._sessions.set(sessions))
    );
  }

  banUser(id: string): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.apiUrl}/users/${id}/ban`, {});
  }

  deleteUser(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/users/${id}`);
  }

  deleteSession(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/sessions/${id}`).pipe(
      tap(() => {
        // Remove the session from the list
        const currentSessions = this._sessions();
        this._sessions.set(currentSessions.filter(s => s.id !== id));
      })
    );
  }

  refreshAll(): void {
    this.loadOverview().subscribe();
    this.loadUsers().subscribe();
    this.loadAlerts().subscribe();
    this.loadSessions().subscribe();
  }
}

