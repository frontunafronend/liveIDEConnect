import { getDbPool } from '../db/connection';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AIAlert {
  id: string;
  type: string;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}

export class AIGuardService {
  private db = getDbPool();

  async analyzeAndGenerateAlerts(): Promise<AIAlert[]> {
    const alerts: AIAlert[] = [];

    try {
      const messageSpikeAlert = await this.checkMessageVolumeSpike();
      if (messageSpikeAlert) {
        alerts.push(messageSpikeAlert);
      }

      const sessionAlert = await this.checkExcessiveSessions();
      if (sessionAlert) {
        alerts.push(sessionAlert);
      }

      const inactiveAlert = await this.checkInactiveConnections();
      if (inactiveAlert) {
        alerts.push(inactiveAlert);
      }

      const idleAlert = await this.checkIdleSessions();
      if (idleAlert) {
        alerts.push(idleAlert);
      }
    } catch (error) {
    }

    return alerts;
  }
  private async checkMessageVolumeSpike(): Promise<AIAlert | null> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const recentMessages = await this.db.query(
      `SELECT COUNT(*) as count FROM messages 
       WHERE created_at >= $1 AND created_at < $2`,
      [oneHourAgo, now]
    );

    const previousMessages = await this.db.query(
      `SELECT COUNT(*) as count FROM messages 
       WHERE created_at >= $1 AND created_at < $2`,
      [twoHoursAgo, oneHourAgo]
    );

    const recentCount = parseInt(recentMessages.rows[0].count);
    const previousCount = parseInt(previousMessages.rows[0].count);

    if (previousCount === 0) return null;

    const increase = ((recentCount - previousCount) / previousCount) * 100;

    if (increase > 200) {
      return {
        id: `alert-msg-spike-${Date.now()}`,
        type: 'activity_spike',
        severity: 'critical',
        message: `Message volume increased by +${Math.round(increase)}% in the last hour.`,
        timestamp: new Date().toISOString(),
        details: {
          recentCount,
          previousCount,
          increase: Math.round(increase)
        }
      };
    }

    if (increase > 100) {
      return {
        id: `alert-msg-spike-${Date.now()}`,
        type: 'activity_spike',
        severity: 'warning',
        message: `Message volume increased by +${Math.round(increase)}% in the last hour.`,
        timestamp: new Date().toISOString(),
        details: {
          recentCount,
          previousCount,
          increase: Math.round(increase)
        }
      };
    }

    return null;
  }

  private async checkExcessiveSessions(): Promise<AIAlert | null> {
    const result = await this.db.query(
      `SELECT user_id, COUNT(*) as session_count 
       FROM sessions 
       GROUP BY user_id 
       HAVING COUNT(*) > 10`
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      return {
        id: `alert-excessive-sessions-${Date.now()}`,
        type: 'excessive_sessions',
        severity: 'warning',
        message: `User has ${user.session_count} active sessions (threshold: 10).`,
        timestamp: new Date().toISOString(),
        details: {
          userId: user.user_id,
          sessionCount: parseInt(user.session_count)
        }
      };
    }

    return null;
  }

  private async checkInactiveConnections(): Promise<AIAlert | null> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await this.db.query(
      `SELECT COUNT(*) as count FROM sessions 
       WHERE status = 'online' AND last_active < $1`,
      [oneDayAgo]
    );

    const inactiveCount = parseInt(result.rows[0].count);

    if (inactiveCount > 5) {
      return {
        id: `alert-inactive-${Date.now()}`,
        type: 'connection_anomaly',
        severity: 'warning',
        message: `High number of idle sessions detected (${inactiveCount}).`,
        timestamp: new Date().toISOString(),
        details: {
          inactiveCount
        }
      };
    }

    return null;
  }

  private async checkIdleSessions(): Promise<AIAlert | null> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const result = await this.db.query(
      `SELECT COUNT(*) as count FROM sessions 
       WHERE status = 'online' AND last_active < $1`,
      [oneHourAgo]
    );

    const idleCount = parseInt(result.rows[0].count);

    if (idleCount > 10) {
      return {
        id: `alert-idle-${Date.now()}`,
        type: 'idle_sessions',
        severity: 'info',
        message: `${idleCount} sessions have been idle for over an hour.`,
        timestamp: new Date().toISOString(),
        details: {
          idleCount
        }
      };
    }

    return null;
  }
}

