import { FastifyInstance } from 'fastify';
import { LiveIdeMessage } from '../types';
import { MessagesRepository } from '../db/messages.repository';
import { SessionsRepository } from '../db/sessions.repository';
import { WebSocketTrackerService } from '../services/websocket-tracker.service';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

export async function wsRoutes(fastify: FastifyInstance) {
  const messagesRepo = new MessagesRepository();
  const sessionsRepo = new SessionsRepository();
  const wsTracker = WebSocketTrackerService.getInstance();

  fastify.get('/ws', { websocket: true }, async (connection, req) => {
    const connectionId = randomUUID();
    const urlString = req.url || '';
    const queryString = urlString.includes('?') ? urlString.split('?')[1] : '';
    const params = new URLSearchParams(queryString);
    const sessionId = params.get('sessionId');
    const token = params.get('token');

    const socket = connection.socket;

    if (!sessionId) {
      if (socket && socket.readyState === socket.OPEN) {
        socket.close(1008, 'Session ID required');
      }
      return;
    }

    if (!token) {
      if (socket && socket.readyState === socket.OPEN) {
        socket.close(1008, 'Authentication token required');
      }
      return;
    }

    let userId: string;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      userId = decoded.userId;
    } catch (error) {
      if (socket && socket.readyState === socket.OPEN) {
        socket.close(1008, 'Invalid or expired token');
      }
      return;
    }

    const session = await sessionsRepo.findById(sessionId);
    if (!session) {
      if (socket && socket.readyState === socket.OPEN) {
        socket.close(1008, 'Session not found');
      }
      return;
    }

    if (session.userId !== userId) {
      if (socket && socket.readyState === socket.OPEN) {
        socket.close(1008, 'Access denied to this session');
      }
      return;
    }

    try {
      await sessionsRepo.updateStatus(sessionId, 'online');
      
      // Track WebSocket connection
      wsTracker.addConnection(connectionId, sessionId);

      const welcomeMessage: LiveIdeMessage = {
        type: 'status',
        sessionId,
        from: 'ide',
        content: 'WebSocket connection established',
        ts: new Date().toISOString()
      };
      await messagesRepo.create(welcomeMessage);
      if (socket && socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(welcomeMessage));
      }

      const existingMessages = await messagesRepo.findBySessionId(sessionId);
      existingMessages.forEach(msg => {
        if (socket && socket.readyState === socket.OPEN) {
          socket.send(JSON.stringify(msg));
        }
      });

      socket.on('message', async (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());

          const savedMessage: LiveIdeMessage = await messagesRepo.create({
            type: data.type || 'agent_message',
            sessionId,
            from: data.from || 'client',
            content: data.content || 'No content'
          });

          if (socket && socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify(savedMessage));
          }

          await sessionsRepo.updateLastActive(sessionId);
        } catch (error) {
          if (socket && socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify({
              type: 'status',
              sessionId,
              from: 'ide',
              content: 'Error saving message to database',
              ts: new Date().toISOString()
            }));
          }
        }
      });

      socket.on('close', async () => {
        try {
          // Remove from tracker
          wsTracker.removeConnection(connectionId);
          await sessionsRepo.updateStatus(sessionId, 'offline');
        } catch (error) {
        }
      });
    } catch (error) {
      if (socket && socket.readyState === socket.OPEN) {
        socket.close(1011, 'Internal server error');
      }
    }
  });
}
