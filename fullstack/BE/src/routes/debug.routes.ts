import { FastifyInstance } from 'fastify';
import { WebSocketTrackerService } from '../services/websocket-tracker.service';

/**
 * Debug routes for troubleshooting WebSocket connections
 * WARNING: Remove or protect these routes in production!
 */
export async function debugRoutes(fastify: FastifyInstance) {
  const wsTracker = WebSocketTrackerService.getInstance();
  
  // Get all active WebSocket connections (DEBUG ONLY)
  fastify.get('/api/debug/connections', async (request, reply) => {
    const connections = wsTracker.getActiveConnections();
    const bySession: Record<string, any[]> = {};
    
    connections.forEach(conn => {
      if (!bySession[conn.sessionId]) {
        bySession[conn.sessionId] = [];
      }
      bySession[conn.sessionId].push({
        connectionId: conn.connectionId,
        tabId: conn.tabId,
        type: conn.tabId ? 'IDE' : 'Web App',
        connectedAt: conn.connectedAt
      });
    });
    
    return {
      total: connections.length,
      bySession,
      all: connections.map(c => ({
        connectionId: c.connectionId,
        sessionId: c.sessionId,
        tabId: c.tabId,
        type: c.tabId ? 'IDE' : 'Web App',
        connectedAt: c.connectedAt
      }))
    };
  });
  
  // Get tabs for a specific session
  fastify.get<{
    Params: { sessionId: string };
  }>('/api/debug/sessions/:sessionId/tabs', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const tabs = wsTracker.getTabsForSession(sessionId);
    const connections = wsTracker.getConnectionsForSession(sessionId);
    
    return {
      sessionId,
      tabs,
      totalConnections: connections.length,
      ideConnections: connections.filter(c => c.tabId).length,
      webAppConnections: connections.filter(c => !c.tabId).length,
      allConnections: connections.map(c => ({
        connectionId: c.connectionId,
        tabId: c.tabId,
        type: c.tabId ? 'IDE' : 'Web App',
        connectedAt: c.connectedAt,
        socketReadyState: c.socket?.readyState || 'unknown',
        socketOpen: c.socket?.readyState === 1 // 1 = OPEN
      }))
    };
  });
  
  // Get connection status summary
  fastify.get('/api/debug/status', async (request, reply) => {
    const connections = wsTracker.getActiveConnections();
    const bySession: Record<string, { total: number; ide: number; webApp: number; tabs: string[] }> = {};
    
    connections.forEach(conn => {
      if (!bySession[conn.sessionId]) {
        bySession[conn.sessionId] = {
          total: 0,
          ide: 0,
          webApp: 0,
          tabs: []
        };
      }
      bySession[conn.sessionId].total++;
      if (conn.tabId) {
        bySession[conn.sessionId].ide++;
        bySession[conn.sessionId].tabs.push(conn.tabId);
      } else {
        bySession[conn.sessionId].webApp++;
      }
    });
    
    return {
      summary: {
        totalConnections: connections.length,
        totalSessions: Object.keys(bySession).length,
        totalIdeConnections: connections.filter(c => c.tabId).length,
        totalWebAppConnections: connections.filter(c => !c.tabId).length
      },
      bySession
    };
  });
}

