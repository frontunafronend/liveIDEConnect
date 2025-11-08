/**
 * AI Guard v2 Service
 * 
 * Real-time system monitoring with live database connections.
 * All metrics are collected from:
 * - Real system resources (CPU, memory via Node.js os module)
 * - Live database queries (sessions, messages, metrics history)
 * - Active WebSocket connections (in-memory tracker)
 * 
 * No mock data - all queries use actual database tables:
 * - sessions: Real session status and counts
 * - messages: Real message counts from last hour
 * - monitor_metrics: Real historical metrics stored in database
 */
import { getDbPool } from '../db/connection';
import { AIGuardService, AIAlert } from './ai.guard.service';
import { WebSocketTrackerService } from './websocket-tracker.service';
import * as os from 'os';

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

export interface MonitorResponse {
  summary: string;
  status: SystemStatus;
  metrics: SystemMetrics;
  alerts: MonitorAlert[];
}

export class AIGuardV2Service {
  private db = getDbPool();
  private aiGuard = new AIGuardService();
  private wsTracker = WebSocketTrackerService.getInstance();
  private cache: { data: MonitorResponse | null; timestamp: number } = {
    data: null,
    timestamp: 0
  };
  private readonly CACHE_TTL = 10000; // 10 seconds

  /**
   * Get system metrics with caching
   */
  async getSystemMetrics(): Promise<MonitorResponse> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.cache.data && (now - this.cache.timestamp) < this.CACHE_TTL) {
      return this.cache.data;
    }

    // Collect metrics
    const [cpu, memory, dbLatency, activeWebSockets, activeSessions, messagesLastHour] = await Promise.all([
      this.getCpuUsage(),
      this.getMemoryUsage(),
      this.getDbLatency(),
      Promise.resolve(this.wsTracker.getActiveConnectionsCount()),
      this.getActiveSessionsCount(),
      this.getMessagesLastHour()
    ]);

    // Get previous metrics for trend calculation
    const previousMetrics = await this.getPreviousMetrics();
    
    // Calculate trends
    const trend: SystemMetrics['trend'] = {};
    if (previousMetrics.cpu !== null && !isNaN(previousMetrics.cpu)) {
      const cpuDelta = cpu - previousMetrics.cpu;
      trend.cpu = cpuDelta >= 0 ? `+${cpuDelta.toFixed(1)}%` : `${cpuDelta.toFixed(1)}%`;
    }
    if (previousMetrics.memory !== null && !isNaN(previousMetrics.memory)) {
      const memoryDelta = memory - previousMetrics.memory;
      trend.memory = memoryDelta >= 0 ? `+${memoryDelta.toFixed(1)}%` : `${memoryDelta.toFixed(1)}%`;
    }
    if (previousMetrics.messages !== null && !isNaN(previousMetrics.messages) && previousMetrics.messages > 0) {
      const messagesDelta = ((messagesLastHour - previousMetrics.messages) / previousMetrics.messages) * 100;
      trend.messages = messagesDelta >= 0 ? `+${messagesDelta.toFixed(1)}%` : `${messagesDelta.toFixed(1)}%`;
    } else if (previousMetrics.messages === 0 && messagesLastHour > 0) {
      // Handle case where previous was 0 but now we have messages
      trend.messages = `+${messagesLastHour}`;
    }

    const metrics: SystemMetrics = {
      cpu,
      memory,
      dbLatencyMs: dbLatency,
      activeWebSockets,
      activeSessions,
      messagesLastHour,
      trend
    };

    // Get alerts from v1 service and add system alerts
    const v1Alerts = await this.aiGuard.analyzeAndGenerateAlerts();
    const systemAlerts = this.generateSystemAlerts(metrics, previousMetrics);
    
    const allAlerts: MonitorAlert[] = [
      ...v1Alerts.map(alert => ({
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp
      })),
      ...systemAlerts
    ];

    // Determine system status
    const status = this.determineSystemStatus(metrics, allAlerts);

    // Generate summary
    let summary = this.generateSummary(status, allAlerts);

    // Optional AI summary if OpenAI API key is available
    if (process.env.OPENAI_API_KEY) {
      try {
        const aiSummary = await this.generateAISummary(allAlerts, metrics);
        if (aiSummary) {
          summary = aiSummary;
        }
      } catch (error) {
        // Fallback to default summary if AI fails
      }
    }

    const response: MonitorResponse = {
      summary,
      status,
      metrics,
      alerts: allAlerts
    };

    // Cache the response
    this.cache.data = response;
    this.cache.timestamp = now;

    // Store metrics in database for history
    await this.storeMetrics(metrics);

    return response;
  }

  /**
   * Get CPU usage percentage
   * Uses process CPU time as a proxy for system CPU usage
   */
  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = Date.now();

      // Sample CPU over a short interval
      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const currentTime = Date.now();
        const elapsedTime = (currentTime - startTime) * 1000; // Convert to microseconds

        // Calculate CPU percentage (user + system time / elapsed time * 100)
        const cpuPercent = ((currentUsage.user + currentUsage.system) / elapsedTime) * 100;
        
        // For system-wide CPU, we approximate based on process CPU
        // In production, consider using a library like 'os-utils' or 'systeminformation'
        const systemCpu = Math.min(100, cpuPercent * os.cpus().length);
        
        resolve(Math.max(0, Math.min(100, Math.round(systemCpu * 100) / 100)));
      }, 100);
    });
  }

  /**
   * Get memory usage percentage
   */
  private async getMemoryUsage(): Promise<number> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usagePercent = (usedMem / totalMem) * 100;
    return Math.round(usagePercent * 100) / 100;
  }

  /**
   * Get database latency in milliseconds
   */
  private async getDbLatency(): Promise<number> {
    const start = Date.now();
    try {
      await this.db.query('SELECT 1');
      return Date.now() - start;
    } catch (error) {
      return -1; // Error indicator
    }
  }

  /**
   * Get active sessions count
   */
  private async getActiveSessionsCount(): Promise<number> {
    try {
      const result = await this.db.query(
        "SELECT COUNT(*) as count FROM sessions WHERE status = 'online'"
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get messages count from last hour
   */
  private async getMessagesLastHour(): Promise<number> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const result = await this.db.query(
        'SELECT COUNT(*) as count FROM messages WHERE created_at >= $1',
        [oneHourAgo]
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get previous metrics for trend calculation
   * Looks for the most recent metrics record (within last 2 hours) to compare against
   */
  private async getPreviousMetrics(): Promise<{ cpu: number | null; memory: number | null; messages: number | null }> {
    try {
      // Look for metrics from 1-2 hours ago to get a good comparison point
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const result = await this.db.query(
        `SELECT cpu, memory, messages 
         FROM monitor_metrics 
         WHERE timestamp >= $1 AND timestamp < $2
         ORDER BY timestamp DESC 
         LIMIT 1`,
        [twoHoursAgo, oneHourAgo]
      );

      // If no record found in that window, try to get the most recent one (excluding very recent)
      if (result.rows.length === 0) {
        const recentResult = await this.db.query(
          `SELECT cpu, memory, messages 
           FROM monitor_metrics 
           WHERE timestamp < $1
           ORDER BY timestamp DESC 
           LIMIT 1`,
          [oneHourAgo]
        );

        if (recentResult.rows.length > 0) {
          const row = recentResult.rows[0];
          return {
            cpu: parseFloat(row.cpu) || null,
            memory: parseFloat(row.memory) || null,
            messages: parseInt(row.messages) || null
          };
        }
      } else {
        const row = result.rows[0];
        return {
          cpu: parseFloat(row.cpu) || null,
          memory: parseFloat(row.memory) || null,
          messages: parseInt(row.messages) || null
        };
      }
    } catch (error) {
      // Table might not exist yet or query failed, return nulls
      // This is expected on first run
    }

    return { cpu: null, memory: null, messages: null };
  }

  /**
   * Generate system alerts based on metrics
   */
  private generateSystemAlerts(metrics: SystemMetrics, previousMetrics: { cpu: number | null; memory: number | null; messages: number | null }): MonitorAlert[] {
    const alerts: MonitorAlert[] = [];

    // CPU alerts
    if (metrics.cpu > 90) {
      alerts.push({
        type: 'cpu_high',
        severity: 'critical',
        message: `CPU usage is critically high: ${metrics.cpu.toFixed(1)}%`
      });
    } else if (metrics.cpu > 75) {
      alerts.push({
        type: 'cpu_high',
        severity: 'warning',
        message: `CPU usage is elevated: ${metrics.cpu.toFixed(1)}%`
      });
    }

    // Memory alerts
    if (metrics.memory > 90) {
      alerts.push({
        type: 'memory_high',
        severity: 'critical',
        message: `Memory usage is critically high: ${metrics.memory.toFixed(1)}%`
      });
    } else if (metrics.memory > 80) {
      alerts.push({
        type: 'memory_high',
        severity: 'warning',
        message: `Memory usage is elevated: ${metrics.memory.toFixed(1)}%`
      });
    }

    // Database latency alerts
    if (metrics.dbLatencyMs > 1000) {
      alerts.push({
        type: 'db_latency',
        severity: 'critical',
        message: `Database latency is very high: ${metrics.dbLatencyMs}ms`
      });
    } else if (metrics.dbLatencyMs > 500) {
      alerts.push({
        type: 'db_latency',
        severity: 'warning',
        message: `Database latency is elevated: ${metrics.dbLatencyMs}ms`
      });
    }

    return alerts;
  }

  /**
   * Determine overall system status
   */
  private determineSystemStatus(metrics: SystemMetrics, alerts: MonitorAlert[]): SystemStatus {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const warningAlerts = alerts.filter(a => a.severity === 'warning');

    if (criticalAlerts.length > 0 || metrics.cpu > 90 || metrics.memory > 90 || metrics.dbLatencyMs > 1000) {
      return 'CRITICAL';
    }

    if (warningAlerts.length > 0 || metrics.cpu > 75 || metrics.memory > 80 || metrics.dbLatencyMs > 500) {
      return 'WARNING';
    }

    return 'OK';
  }

  /**
   * Generate summary text
   */
  private generateSummary(status: SystemStatus, alerts: MonitorAlert[]): string {
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const warningCount = alerts.filter(a => a.severity === 'warning').length;

    if (status === 'CRITICAL') {
      return `System critical. ${criticalCount} critical alert${criticalCount !== 1 ? 's' : ''} detected.`;
    }

    if (status === 'WARNING') {
      return `System stable with warnings. ${warningCount} warning${warningCount !== 1 ? 's' : ''} detected.`;
    }

    return 'System operating normally. All metrics within acceptable ranges.';
  }

  /**
   * Generate AI summary using OpenAI (optional)
   */
  private async generateAISummary(alerts: MonitorAlert[], metrics: SystemMetrics): Promise<string | null> {
    if (!process.env.OPENAI_API_KEY) {
      return null;
    }

    try {
      // Dynamic import to avoid requiring openai package if not available
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a system monitoring assistant. Summarize system health and alerts in a concise, professional manner.'
          },
          {
            role: 'user',
            content: JSON.stringify({
              metrics: {
                cpu: `${metrics.cpu}%`,
                memory: `${metrics.memory}%`,
                dbLatency: `${metrics.dbLatencyMs}ms`,
                activeWebSockets: metrics.activeWebSockets,
                activeSessions: metrics.activeSessions,
                messagesLastHour: metrics.messagesLastHour
              },
              alerts: alerts.map(a => ({ type: a.type, severity: a.severity, message: a.message }))
            })
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      return response.choices[0]?.message?.content?.trim() || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Store metrics in database for history
   */
  private async storeMetrics(metrics: SystemMetrics): Promise<void> {
    try {
      // Ensure we have valid numeric values
      const cpu = isNaN(metrics.cpu) ? 0 : metrics.cpu;
      const memory = isNaN(metrics.memory) ? 0 : metrics.memory;
      const messages = isNaN(metrics.messagesLastHour) ? 0 : metrics.messagesLastHour;

      await this.db.query(
        `INSERT INTO monitor_metrics (cpu, memory, messages, timestamp)
         VALUES ($1, $2, $3, NOW())`,
        [cpu, memory, messages]
      );

      // Clean up old records (keep last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await this.db.query(
        'DELETE FROM monitor_metrics WHERE timestamp < $1',
        [oneDayAgo]
      );
    } catch (error) {
      // Table might not exist yet - this is expected on first run before migrations
      // The migration will create the table, and subsequent calls will work
      // Log error in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.warn('monitor_metrics table may not exist yet:', error);
      }
    }
  }

  /**
   * Get metrics history for charts
   */
  async getMetricsHistory(hours: number = 24): Promise<Array<{ timestamp: string; cpu: number; memory: number; messages: number }>> {
    try {
      // Limit to max 24 hours
      const maxHours = Math.min(hours, 24);
      const since = new Date(Date.now() - maxHours * 60 * 60 * 1000);
      
      const result = await this.db.query(
        `SELECT cpu, memory, messages, timestamp
         FROM monitor_metrics
         WHERE timestamp >= $1
         ORDER BY timestamp ASC`,
        [since]
      );

      return result.rows.map(row => ({
        timestamp: row.timestamp.toISOString(),
        cpu: parseFloat(row.cpu) || 0,
        memory: parseFloat(row.memory) || 0,
        messages: parseInt(row.messages) || 0
      }));
    } catch (error) {
      // Table might not exist yet or query failed
      // Return empty array - frontend will handle gracefully
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to fetch metrics history:', error);
      }
      return [];
    }
  }
}

