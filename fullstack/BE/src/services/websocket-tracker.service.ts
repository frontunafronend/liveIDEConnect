/**
 * WebSocket Connection Tracker Service
 * Tracks active WebSocket connections for monitoring
 */

export class WebSocketTrackerService {
  private static instance: WebSocketTrackerService;
  private connections: Map<string, { sessionId: string; connectedAt: Date }> = new Map();

  private constructor() {}

  static getInstance(): WebSocketTrackerService {
    if (!WebSocketTrackerService.instance) {
      WebSocketTrackerService.instance = new WebSocketTrackerService();
    }
    return WebSocketTrackerService.instance;
  }

  /**
   * Register a new WebSocket connection
   */
  addConnection(connectionId: string, sessionId: string): void {
    this.connections.set(connectionId, {
      sessionId,
      connectedAt: new Date()
    });
  }

  /**
   * Remove a WebSocket connection
   */
  removeConnection(connectionId: string): void {
    this.connections.delete(connectionId);
  }

  /**
   * Get count of active WebSocket connections
   */
  getActiveConnectionsCount(): number {
    return this.connections.size;
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): Array<{ connectionId: string; sessionId: string; connectedAt: Date }> {
    return Array.from(this.connections.entries()).map(([connectionId, data]) => ({
      connectionId,
      sessionId: data.sessionId,
      connectedAt: data.connectedAt
    }));
  }
}

