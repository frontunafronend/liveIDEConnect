import { FastifyInstance } from 'fastify';
import { LiveIdeMessage, ApiError } from '../types';
import { MessagesRepository } from '../db/messages.repository';
import { SessionsRepository } from '../db/sessions.repository';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';

export async function messagesRoutes(fastify: FastifyInstance) {
  const messagesRepo = new MessagesRepository();
  const sessionsRepo = new SessionsRepository();

  // Get messages for a session (protected - user must own the session)
  fastify.get<{
    Params: { sessionId: string };
    Reply: LiveIdeMessage[] | ApiError;
  }>('/api/messages/:sessionId', {
    preHandler: authenticate
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      if (!request.userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User ID not found in token'
        });
      }

      const { sessionId } = request.params as { sessionId: string };
      
      // Verify user owns this session
      const session = await sessionsRepo.findById(sessionId);
      if (!session) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Session not found'
        });
      }

      if (session.userId !== request.userId) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have access to this session'
        });
      }

      const messages = await messagesRepo.findBySessionId(sessionId);
      return messages;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch messages'
      });
    }
  });
}

