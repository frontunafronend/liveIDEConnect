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

  fastify.get('/ws', { websocket: true }, (connection, req) => {
    const connectionId = randomUUID();
    const urlString = req.url || '';
    const queryString = urlString.includes('?') ? urlString.split('?')[1] : '';
    const params = new URLSearchParams(queryString);
    const sessionId = params.get('sessionId');
    const token = params.get('token');
    const tabId = params.get('tabId'); // Unique ID for Cursor tab/window

    // In Fastify WebSocket, connection.socket is the actual WebSocket
    // But connection itself might be the socket stream - try both
    const socket = (connection as any).socket || connection;
    
    if (!socket || typeof socket.on !== 'function') {
      fastify.log.error('❌ WebSocket socket not available or invalid');
      return;
    }
    
    // CRITICAL: Set up message handler SYNCHRONOUSLY (before any async operations)
    // This ensures messages aren't lost while we're doing async setup
    let isAuthenticated = false;
    let authenticatedSessionId: string | null = null;
    let authenticatedUserId: string | null = null;
    let authenticatedTabId: string | null = tabId;

    fastify.log.info(`🔧 Setting up message handler synchronously for session: ${sessionId}`);
    fastify.log.info(`🔧 Socket type: ${typeof socket}, has 'on': ${typeof socket.on}`);
    
    socket.on('message', async (message: Buffer) => {
      fastify.log.info(`📥 Message event triggered!`);
      
      // If not authenticated yet, ignore the message (auth will complete soon)
      if (!isAuthenticated) {
        fastify.log.info(`⏳ Message received but auth pending, ignoring for now`);
        return;
      }

      // Process message now that we're authenticated
      try {
        fastify.log.info(`📥 Raw message received, length: ${message.length}`);
        const data = JSON.parse(message.toString());
        fastify.log.info(`📨 WebSocket message received: ${JSON.stringify(data)}`);

        // Handle ping/pong messages (connection keep-alive)
        if (data.type === 'ping') {
          if (socket && socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify({
              type: 'pong',
              sessionId: authenticatedSessionId,
              ts: new Date().toISOString()
            }));
          }
          return;
        }
        
        if (data.type === 'pong') {
          // Just acknowledge pong, no action needed
          return;
        }

        // Only process agent_message types (ignore other status messages from clients)
        if (data.type !== 'agent_message') {
          fastify.log.info(`⏭️  Skipping non-agent_message type: ${data.type}`);
          return;
        }

        // Extract targetTabId from message if present (for routing to specific tab)
        const targetTabId = data.targetTabId || authenticatedTabId;
        
        // Save user message
        fastify.log.info(`💾 Saving message to database...`);
        const savedMessage: LiveIdeMessage = await messagesRepo.create({
          type: data.type || 'agent_message',
          sessionId: authenticatedSessionId!,
          from: data.from || 'client',
          content: data.content || 'No content'
        });
        fastify.log.info(`✅ Message saved`);

        // Route message based on source
        if (data.from === 'client') {
          // Message from web app - send to IDE tabs AND back to web app
          fastify.log.info(`📤 Routing client message to IDE tabs...`);
          fastify.log.info(`   Target tab ID: ${targetTabId || 'none (broadcasting to all)'}`);
          
          // Get all IDE connections for this session
          const ideConnections = wsTracker.getConnectionsForSession(authenticatedSessionId!).filter(conn => conn.tabId);
          fastify.log.info(`   Found ${ideConnections.length} IDE connection(s) for this session`);
          
          // Send to specific tab if specified, otherwise broadcast to all IDE tabs
          if (targetTabId) {
            const sent = wsTracker.sendToTab(targetTabId, savedMessage);
            if (!sent) {
              fastify.log.warn(`⚠️  Tab ${targetTabId} not found, broadcasting to all IDE tabs`);
              const sentCount = wsTracker.sendToSession(authenticatedSessionId!, savedMessage, 'ide');
              fastify.log.info(`   Broadcasted to ${sentCount} IDE connection(s)`);
            } else {
              fastify.log.info(`   ✅ Sent to specific tab: ${targetTabId}`);
            }
          } else {
            // Broadcast to all IDE tabs in session
            const sentCount = wsTracker.sendToSession(authenticatedSessionId!, savedMessage, 'ide');
            fastify.log.info(`   ✅ Broadcasted to ${sentCount} IDE connection(s)`);
          }
          
          // Also send back to web app so it sees its own message (optimistic update confirmation)
          wsTracker.sendToSession(authenticatedSessionId!, savedMessage, 'client');
          
          // Generate AI response
          fastify.log.info(`🤖 Generating AI response...`);
          const aiResponse: LiveIdeMessage = await messagesRepo.create({
            type: 'agent_message',
            sessionId: authenticatedSessionId!,
            from: 'ide',
            content: `You said: "${data.content}". This is an echo response. AI integration coming soon!`
          });
          fastify.log.info(`✅ AI response created`);

          // Send AI response to both web app and IDE tabs
          setTimeout(() => {
            // Send to web app
            wsTracker.sendToSession(authenticatedSessionId!, aiResponse, 'client');
            
            // Send to IDE tabs (specific tab if available, otherwise all)
            if (targetTabId) {
              const sent = wsTracker.sendToTab(targetTabId, aiResponse);
              if (!sent) {
                wsTracker.sendToSession(authenticatedSessionId!, aiResponse, 'ide');
              }
            } else {
              wsTracker.sendToSession(authenticatedSessionId!, aiResponse, 'ide');
            }
          }, 500);
        } else if (data.from === 'ide') {
          // Message from IDE - send to web app AND echo back to IDE
          fastify.log.info(`📤 Routing IDE message to web app...`);
          
          // Get all web app connections for this session
          const webAppConnections = wsTracker.getConnectionsForSession(authenticatedSessionId!).filter(conn => !conn.tabId);
          fastify.log.info(`   Found ${webAppConnections.length} web app connection(s) for this session`);
          
          // Send to all web app connections
          const sentCount = wsTracker.sendToSession(authenticatedSessionId!, savedMessage, 'client');
          fastify.log.info(`   ✅ Sent to ${sentCount} web app connection(s)`);
          
          // Echo back to sender (IDE) for confirmation
          if (socket && socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify(savedMessage));
            fastify.log.info(`   ✅ Echoed back to IDE sender`);
          }
        }

        await sessionsRepo.updateLastActive(authenticatedSessionId!);
      } catch (error: any) {
        fastify.log.error('❌ WebSocket message error:', error?.message || error);
        if (socket && socket.readyState === socket.OPEN) {
          socket.send(JSON.stringify({
            type: 'status',
            sessionId: authenticatedSessionId || sessionId || '',
            from: 'ide',
            content: 'Error processing message',
            ts: new Date().toISOString()
          }));
        }
      }
    });

    socket.on('error', (error: Error) => {
      const errorMsg = error?.message || String(error);
      fastify.log.error(`❌ WebSocket error for session ${sessionId}: ${errorMsg}`);
      if (error?.stack) {
        fastify.log.error(`Error stack: ${error.stack}`);
      }
    });

    socket.on('close', async () => {
      try {
        const connectionType = tabId ? 'IDE' : 'Web App';
        fastify.log.info(`🔌 WebSocket closed for session: ${authenticatedSessionId || sessionId}, type: ${connectionType}`);
        // Remove from tracker
        wsTracker.removeConnection(connectionId);
        if (authenticatedSessionId) {
          // Only update status to offline if no other connections exist for this session
          const remainingConnections = wsTracker.getConnectionsForSession(authenticatedSessionId);
          if (remainingConnections.length === 0) {
            await sessionsRepo.updateStatus(authenticatedSessionId, 'offline');
          }
          
          // Send disconnect status to web app (if this was an IDE connection)
          if (tabId) {
            const disconnectMessage: LiveIdeMessage = {
              type: 'status',
              sessionId: authenticatedSessionId,
              from: 'ide',
              content: 'IDE disconnected',
              ts: new Date().toISOString()
            };
            wsTracker.sendToSession(authenticatedSessionId, disconnectMessage, 'client');
          }
        }
      } catch (error: any) {
        fastify.log.error('Error closing WebSocket:', error?.message || error);
      }
    });

    // Now do async authentication and setup
    (async () => {
      try {
        fastify.log.info(`🚀 Starting WebSocket connection setup`);
        fastify.log.info(`   Session ID: ${sessionId || 'MISSING'}`);
        fastify.log.info(`   Token: ${token ? `${token.substring(0, 20)}...` : 'MISSING'}`);
        fastify.log.info(`   Tab ID: ${tabId || 'none (web app)'}`);
        fastify.log.info(`   Connection ID: ${connectionId}`);

        if (!sessionId) {
          fastify.log.error(`❌ Connection rejected: Session ID required`);
          if (socket && socket.readyState === socket.OPEN) {
            socket.close(1008, 'Session ID required');
          }
          return;
        }

        if (!token) {
          fastify.log.error(`❌ Connection rejected: Authentication token required`);
          if (socket && socket.readyState === socket.OPEN) {
            socket.close(1008, 'Authentication token required');
          }
          return;
        }

        let userId: string;
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
          userId = decoded.userId;
          fastify.log.info(`   ✅ Token verified for user: ${userId}`);
        } catch (error: any) {
          fastify.log.error(`❌ Connection rejected: Invalid or expired token - ${error?.message || error}`);
          if (socket && socket.readyState === socket.OPEN) {
            socket.close(1008, 'Invalid or expired token');
          }
          return;
        }

        const session = await sessionsRepo.findById(sessionId);
        if (!session) {
          fastify.log.error(`❌ Connection rejected: Session ${sessionId} not found`);
          if (socket && socket.readyState === socket.OPEN) {
            socket.close(1008, 'Session not found');
          }
          return;
        }

        if (session.userId !== userId) {
          fastify.log.error(`❌ Connection rejected: User ${userId} does not own session ${sessionId} (owner: ${session.userId})`);
          if (socket && socket.readyState === socket.OPEN) {
            socket.close(1008, 'Access denied to this session');
          }
          return;
        }
        
        fastify.log.info(`   ✅ Session ${sessionId} found and access granted`);

        // Authentication successful - mark as authenticated
        isAuthenticated = true;
        authenticatedSessionId = sessionId;
        authenticatedUserId = userId;

        const connectionType = tabId ? 'IDE' : 'Web App';
        fastify.log.info(`🔌 WebSocket connection established for session: ${sessionId}, user: ${userId}, type: ${connectionType}, tab: ${tabId || 'none'}`);
        fastify.log.info(`   Connection ID: ${connectionId}`);
        fastify.log.info(`   Tab ID: ${tabId || 'null (web app)'}`);
        await sessionsRepo.updateStatus(sessionId, 'online');
        
        // Track WebSocket connection with tabId (null for web app, UUID for IDE)
        wsTracker.addConnection(connectionId, sessionId, tabId, socket);
        
        // Log all connections for this session after adding
        const allConnections = wsTracker.getConnectionsForSession(sessionId);
        const ideConnections = allConnections.filter(conn => conn.tabId);
        const webAppConnections = allConnections.filter(conn => !conn.tabId);
        fastify.log.info(`   📊 Total connections for session: ${allConnections.length} (${ideConnections.length} IDE, ${webAppConnections.length} Web App)`);
        if (ideConnections.length > 0) {
          fastify.log.info(`   🖥️  IDE tabs: ${ideConnections.map(c => c.tabId).join(', ')}`);
        }
        
        // Set up heartbeat/ping to keep connection alive
        const heartbeatInterval = setInterval(() => {
          if (socket && socket.readyState === socket.OPEN) {
            try {
              // Send ping frame (WebSocket ping)
              if (typeof socket.ping === 'function') {
                socket.ping();
              } else {
                // Fallback: send JSON ping message
                socket.send(JSON.stringify({
                  type: 'ping',
                  sessionId,
                  ts: new Date().toISOString()
                }));
              }
            } catch (error) {
              fastify.log.warn(`Failed to send heartbeat: ${error}`);
              clearInterval(heartbeatInterval);
            }
          } else {
            clearInterval(heartbeatInterval);
          }
        }, 30000); // Every 30 seconds
        
        // Clean up heartbeat on close
        socket.on('close', () => {
          clearInterval(heartbeatInterval);
        });
        
        // Send connection status update to all connections in session
        const statusMessage: LiveIdeMessage = {
          type: 'status',
          sessionId,
          from: 'ide',
          content: `${connectionType} connected`,
          ts: new Date().toISOString()
        };
        // Only send to web app connections (not to IDE to avoid echo)
        if (!tabId) {
          wsTracker.sendToSession(sessionId, statusMessage, 'client');
        }

        // Send existing messages first (before welcome message to avoid duplicates)
        const existingMessages = await messagesRepo.findBySessionId(sessionId);
        const hasExistingMessages = existingMessages.length > 0;
        
        existingMessages.forEach(msg => {
          if (socket && socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify(msg));
          }
        });

        // Only send welcome message if there are no existing messages
        if (!hasExistingMessages) {
          const welcomeMessage: LiveIdeMessage = {
            type: 'status',
            sessionId,
            from: 'ide',
            content: 'WebSocket connection established',
            ts: new Date().toISOString()
          };
          await messagesRepo.create(welcomeMessage);
          if (socket && socket.readyState === socket.OPEN) {
            fastify.log.info(`📤 Sending welcome message to client`);
            socket.send(JSON.stringify(welcomeMessage));
          }
        } else {
          fastify.log.info(`📤 Skipping welcome message - ${existingMessages.length} existing messages sent`);
        }

        fastify.log.info(`✅ WebSocket setup completed successfully for session: ${sessionId}`);
      } catch (error: any) {
        fastify.log.error('❌ Error in WebSocket setup:', error);
        fastify.log.error(`Error type: ${typeof error}`);
        fastify.log.error(`Error message: ${error?.message || 'No message'}`);
        fastify.log.error(`Error stack: ${error?.stack || 'No stack'}`);
        if (error) {
          fastify.log.error('Full error object:', error);
        }
        if (socket && socket.readyState === socket.OPEN) {
          socket.close(1011, 'Internal server error');
        }
      }
    })().catch((error: any) => {
      // Catch any unhandled promise rejections
      fastify.log.error('❌ Unhandled promise rejection in WebSocket setup:', error);
      fastify.log.error(`Error: ${error?.message || error}`);
      if (socket && socket.readyState === socket.OPEN) {
        socket.close(1011, 'Internal server error');
      }
    });
  });
}
