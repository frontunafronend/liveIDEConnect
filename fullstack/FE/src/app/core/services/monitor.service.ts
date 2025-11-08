import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export type SystemStatus = 'OK' | 'WARNING' | 'CRITICAL';

export interface SystemMetrics {
  cpu: number;
  memory: number;
  dbLatencyMs: number;
  activeWebSockets: number;
  activeSessions: number;
  messagesLastHour: number;
  trend?: {
    cpu?: string;
    memory?: string;
    messages?: string;
  };
}

export interface MonitorAlert {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp?: string;
}

export interface MonitorData {
  summary: string;
  status: SystemStatus;
  metrics: SystemMetrics;
  alerts: MonitorAlert[];
}

export interface MetricHistoryPoint {
  timestamp: string;
  cpu: number;
  memory: number;
  messages: number;
}

@Injectable({
  providedIn: 'root'
})
export class MonitorService {
  private readonly apiUrl = `${environment.apiBaseUrl}/admin`;

  private readonly _monitorData = signal<MonitorData | null>(null);
  private readonly _history = signal<MetricHistoryPoint[]>([]);
  private readonly _lastUpdate = signal<Date | null>(null);

  readonly monitorData = this._monitorData.asReadonly();
  readonly history = this._history.asReadonly();
  readonly lastUpdate = this._lastUpdate.asReadonly();

  constructor(private http: HttpClient) {}

  loadMonitorData(): Observable<MonitorData> {
    return this.http.get<MonitorData>(`${this.apiUrl}/monitor`).pipe(
      tap(data => {
        this._monitorData.set(data);
        this._lastUpdate.set(new Date());
      })
    );
  }

  loadHistory(hours: number = 24): Observable<MetricHistoryPoint[]> {
    return this.http.get<MetricHistoryPoint[]>(`${this.apiUrl}/monitor/history`, {
      params: { hours: hours.toString() }
    }).pipe(
      tap(history => this._history.set(history))
    );
  }
}

