import { FastifyInstance } from 'fastify';
import { LiveIdeSession, ApiError } from '../types';
import { SessionsRepository } from '../db/sessions.repository';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { WebSocketTrackerService } from '../services/websocket-tracker.service';

export async function sessionsRoutes(fastify: FastifyInstance) {
  const sessionsRepo = new SessionsRepository();
  const wsTracker = WebSocketTrackerService.getInstance();

  // Get all sessions for authenticated user
  fastify.get<{
    Reply: LiveIdeSession[] | ApiError;
  }>('/api/sessions', {
    preHandler: authenticate
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      if (!request.userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User ID not found in token'
        });
      }

      const sessions = await sessionsRepo.findAllByUserId(request.userId);
      return sessions;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch sessions'
      });
    }
  });

  // Get single session by ID (protected)
  fastify.get<{
    Params: { id: string };
    Reply: LiveIdeSession | ApiError;
  }>('/api/sessions/:id', {
    preHandler: authenticate
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      if (!request.userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User ID not found in token'
        });
      }

      const { id } = request.params as { id: string };
      const session = await sessionsRepo.findById(id);

      if (!session) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Session not found'
        });
      }

      // Verify user owns this session
      if (session.userId !== request.userId) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have access to this session'
        });
      }

      return session;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch session'
      });
    }
  });

  // Create new session (for IDE extension)
  fastify.post<{
    Body: { name: string; status?: string };
    Reply: LiveIdeSession | ApiError;
  }>('/api/sessions', {
    preHandler: authenticate
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      if (!request.userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User ID not found in token'
        });
      }

      const { name, status = 'offline' } = request.body as { name: string; status?: string };

      if (!name) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Session name is required'
        });
      }

      const session = await sessionsRepo.create(request.userId, name, status);
      return reply.status(201).send(session);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create session'
      });
    }
  });

  // Delete session (protected - user must own the session)
  fastify.delete<{
    Params: { id: string };
    Reply: { success: boolean; message: string } | ApiError;
  }>('/api/sessions/:id', {
    preHandler: authenticate
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      if (!request.userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User ID not found in token'
        });
      }

      const { id } = request.params as { id: string };
      
      // Verify user owns this session
      const session = await sessionsRepo.findById(id);
      if (!session) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Session not found'
        });
      }

      if (session.userId !== request.userId) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have access to delete this session'
        });
      }

      const deleted = await sessionsRepo.delete(id, request.userId);
      if (deleted) {
        return reply.status(200).send({
          success: true,
          message: 'Session deleted successfully'
        });
      } else {
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete session'
        });
      }
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete session'
      });
    }
  });

  // Get active tabs for a session
  fastify.get<{
    Params: { id: string };
    Reply: Array<{ tabId: string; connectedAt: Date }> | ApiError;
  }>('/api/sessions/:id/tabs', {
    preHandler: authenticate
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      if (!request.userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User ID not found in token'
        });
      }

      const { id } = request.params as { id: string };
      const session = await sessionsRepo.findById(id);

      if (!session) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Session not found'
        });
      }

      // Verify user owns this session
      if (session.userId !== request.userId) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have access to this session'
        });
      }

      const tabs = wsTracker.getTabsForSession(id);
      const allConnections = wsTracker.getConnectionsForSession(id);
      const allActiveConnections = wsTracker.getActiveConnections();
      
      fastify.log.info(`📊 Tabs request for session ${id}:`);
      fastify.log.info(`   Requesting user ID: ${request.userId}`);
      fastify.log.info(`   Session owner ID: ${session.userId}`);
      fastify.log.info(`   Total active connections (all sessions): ${allActiveConnections.length}`);
      fastify.log.info(`   Total connections for this session: ${allConnections.length}`);
      fastify.log.info(`   IDE connections (with tabId): ${allConnections.filter(c => c.tabId).length}`);
      fastify.log.info(`   Web app connections (no tabId): ${allConnections.filter(c => !c.tabId).length}`);
      
      if (allConnections.length > 0) {
        allConnections.forEach(conn => {
          fastify.log.info(`   - Connection ID: ${conn.tabId || 'Web App'}, Session: ${conn.sessionId}, Tab: ${conn.tabId || 'null'}, Connected: ${conn.connectedAt}`);
        });
      } else {
        fastify.log.warn(`   ⚠️  No connections found for session ${id}`);
        // Debug: show all active connections
        if (allActiveConnections.length > 0) {
          fastify.log.info(`   🔍 All active connections:`);
          allActiveConnections.forEach(conn => {
            fastify.log.info(`      - Connection ID: ${conn.connectionId}, Session: ${conn.sessionId}, Tab: ${conn.tabId || 'null'}`);
          });
        }
      }
      
      fastify.log.info(`   Returning ${tabs.length} tab(s): ${JSON.stringify(tabs)}`);
      return tabs;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch tabs'
      });
    }
  });
}

