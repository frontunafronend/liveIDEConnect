import { FastifyInstance } from 'fastify';
import { AuthenticatedRequest, authenticate } from '../middleware/auth.middleware';
import { adminGuard } from '../middleware/admin.middleware';
import { UsersRepository } from '../db/users.repository';
import { SessionsRepository } from '../db/sessions.repository';
import { MessagesRepository } from '../db/messages.repository';
import { AIGuardService } from '../services/ai.guard.service';
import { AIGuardV2Service } from '../services/ai.guard.v2.service';
import { getDbPool } from '../db/connection';

export async function adminRoutes(fastify: FastifyInstance) {
  const usersRepo = new UsersRepository();
  const sessionsRepo = new SessionsRepository();
  const messagesRepo = new MessagesRepository();
  const aiGuard = new AIGuardService();
  const aiGuardV2 = new AIGuardV2Service();
  const db = getDbPool();

  // Admin overview/dashboard stats
  fastify.get<{
    Reply: {
      stats: {
        totalUsers: number;
        totalSessions: number;
        totalMessages: number;
        activeSessions: number;
        onlineUsers: number;
      };
    } | { error: string; message: string };
  }>('/api/admin/overview', {
    preHandler: [authenticate, adminGuard]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const [usersResult, sessionsResult, messagesResult, activeSessionsResult] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM users'),
        db.query('SELECT COUNT(*) as count FROM sessions'),
        db.query('SELECT COUNT(*) as count FROM messages'),
        db.query("SELECT COUNT(*) as count FROM sessions WHERE status = 'online'")
      ]);

      // Count unique users with active sessions
      const onlineUsersResult = await db.query(
        "SELECT COUNT(DISTINCT user_id) as count FROM sessions WHERE status = 'online'"
      );

      return {
        stats: {
          totalUsers: parseInt(usersResult.rows[0].count),
          totalSessions: parseInt(sessionsResult.rows[0].count),
          totalMessages: parseInt(messagesResult.rows[0].count),
          activeSessions: parseInt(activeSessionsResult.rows[0].count),
          onlineUsers: parseInt(onlineUsersResult.rows[0].count)
        }
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch admin overview'
      });
    }
  });

  // Get all users (admin only)
  fastify.get<{
    Reply: any[] | { error: string; message: string };
  }>('/api/admin/users', {
    preHandler: [authenticate, adminGuard]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const users = await usersRepo.findAll();
      return users;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch users'
      });
    }
  });

  // Ban user (soft delete)
  fastify.patch<{
    Params: { id: string };
    Reply: { success: boolean } | { error: string; message: string };
  }>('/api/admin/users/:id/ban', {
    preHandler: [authenticate, adminGuard]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      // Prevent self-ban
      if (id === request.userId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Cannot ban yourself'
        });
      }

      const success = await usersRepo.banUser(id);
      if (!success) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      return { success: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to ban user'
      });
    }
  });

  // Delete user (hard delete)
  fastify.delete<{
    Params: { id: string };
    Reply: { success: boolean } | { error: string; message: string };
  }>('/api/admin/users/:id', {
    preHandler: [authenticate, adminGuard]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      // Prevent self-delete
      if (id === request.userId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Cannot delete yourself'
        });
      }

      const success = await usersRepo.deleteUser(id);
      if (!success) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      return { success: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete user'
      });
    }
  });

  // Get AI Guard alerts
  fastify.get<{
    Reply: any[] | { error: string; message: string };
  }>('/api/admin/alerts', {
    preHandler: [authenticate, adminGuard]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const alerts = await aiGuard.analyzeAndGenerateAlerts();
      return alerts;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch alerts'
      });
    }
  });

  // Get system logs (recent messages and session activity)
  fastify.get<{
    Query: { limit?: string; offset?: string };
    Reply: {
      logs: Array<{
        id: string;
        type: 'message' | 'session';
        action: string;
        userId?: string;
        sessionId?: string;
        timestamp: string;
        details: any;
      }>;
      total: number;
    } | { error: string; message: string };
  }>('/api/admin/logs', {
    preHandler: [authenticate, adminGuard]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const limit = parseInt((request.query as any)?.limit || '50');
      const offset = parseInt((request.query as any)?.offset || '0');

      // Get recent messages
      const messagesResult = await db.query(
        `SELECT 
          m.id,
          m.session_id,
          m.type,
          m.from_role,
          m.content,
          m.created_at,
          s.user_id
         FROM messages m
         JOIN sessions s ON m.session_id = s.id
         ORDER BY m.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      // Get recent session activity
      const sessionsResult = await db.query(
        `SELECT 
          id,
          user_id,
          name,
          status,
          last_active,
          created_at
         FROM sessions
         ORDER BY last_active DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const logs = [
        ...messagesResult.rows.map(row => ({
          id: row.id,
          type: 'message' as const,
          action: 'message_created',
          userId: row.user_id,
          sessionId: row.session_id,
          timestamp: row.created_at.toISOString(),
          details: {
            type: row.type,
            from: row.from_role,
            content: row.content.substring(0, 100) // Truncate for logs
          }
        })),
        ...sessionsResult.rows.map(row => ({
          id: row.id,
          type: 'session' as const,
          action: 'session_updated',
          userId: row.user_id,
          sessionId: row.id,
          timestamp: row.last_active.toISOString(),
          details: {
            name: row.name,
            status: row.status
          }
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Get total count
      const totalResult = await db.query(
        'SELECT COUNT(*) as count FROM (SELECT id FROM messages UNION SELECT id FROM sessions) as combined'
      );

      return {
        logs: logs.slice(0, limit),
        total: parseInt(totalResult.rows[0].count)
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch logs'
      });
    }
  });

  // Get all sessions (admin view)
  fastify.get<{
    Reply: any[] | { error: string; message: string };
  }>('/api/admin/sessions', {
    preHandler: [authenticate, adminGuard]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const result = await db.query(
        `SELECT 
          s.id,
          s.name,
          s.status,
          s.last_active,
          s.created_at,
          s.user_id,
          u.email as user_email,
          u.name as user_name
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         ORDER BY s.last_active DESC`
      );

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        status: row.status,
        lastActive: row.last_active.toISOString(),
        createdAt: row.created_at.toISOString(),
        userId: row.user_id,
        user: {
          email: row.user_email,
          name: row.user_name
        }
      }));
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch sessions'
      });
    }
  });

  // AI Guard v2 - System Monitor
  fastify.get<{
    Reply: {
      summary: string;
      status: 'OK' | 'WARNING' | 'CRITICAL';
      metrics: {
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
      };
      alerts: Array<{
        type: string;
        severity: 'info' | 'warning' | 'critical';
        message: string;
        timestamp?: string;
      }>;
    } | { error: string; message: string };
  }>('/api/admin/monitor', {
    preHandler: [authenticate, adminGuard]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const monitorData = await aiGuardV2.getSystemMetrics();
      return monitorData;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch system metrics'
      });
    }
  });

  // AI Guard v2 - Metrics History
  fastify.get<{
    Query: { hours?: string };
    Reply: Array<{
      timestamp: string;
      cpu: number;
      memory: number;
      messages: number;
    }> | { error: string; message: string };
  }>('/api/admin/monitor/history', {
    preHandler: [authenticate, adminGuard]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const hours = parseInt((request.query as any)?.hours || '24');
      const history = await aiGuardV2.getMetricsHistory(Math.min(hours, 24)); // Limit to 24 hours max
      return history;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch metrics history'
      });
    }
  });
}

