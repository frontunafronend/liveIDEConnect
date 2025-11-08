import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedRequest } from './auth.middleware';

/**
 * Admin guard middleware
 * Ensures the authenticated user has admin role
 */
export async function adminGuard(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.userId) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  if (request.userRole !== 'admin') {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }
}

