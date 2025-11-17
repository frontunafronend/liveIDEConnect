/**
 * WebSocket Connection Tracker Service
 * Tracks active WebSocket connections for monitoring
 */

interface ConnectionInfo {
  sessionId: string;
  tabId: string | null;
  socket: any;
  connectedAt: Date;
}

export class WebSocketTrackerService {
  private static instance: WebSocketTrackerService;
  private connections: Map<string, ConnectionInfo> = new Map();
  private tabConnections: Map<string, string> = new Map(); // tabId -> connectionId

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
  addConnection(connectionId: string, sessionId: string, tabId: string | null, socket: any): void {
    this.connections.set(connectionId, {
      sessionId,
      tabId,
      socket,
      connectedAt: new Date()
    });
    
    if (tabId) {
      this.tabConnections.set(tabId, connectionId);
    }
  }

  /**
   * Remove a WebSocket connection
   */
  removeConnection(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (conn && conn.tabId) {
      this.tabConnections.delete(conn.tabId);
    }
    this.connections.delete(connectionId);
  }

  /**
   * Get connection by tabId
   */
  getConnectionByTabId(tabId: string): ConnectionInfo | null {
    const connectionId = this.tabConnections.get(tabId);
    if (connectionId) {
      return this.connections.get(connectionId) || null;
    }
    return null;
  }

  /**
   * Get all connections for a session
   */
  getConnectionsForSession(sessionId: string): ConnectionInfo[] {
    return Array.from(this.connections.values()).filter(conn => conn.sessionId === sessionId);
  }

  /**
   * Get all tabs for a session
   */
  getTabsForSession(sessionId: string): Array<{ tabId: string; connectedAt: Date }> {
    return Array.from(this.connections.values())
      .filter(conn => conn.sessionId === sessionId && conn.tabId)
      .map(conn => ({ tabId: conn.tabId!, connectedAt: conn.connectedAt }));
  }

  /**
   * Send message to specific tab
   */
  sendToTab(tabId: string, message: any): boolean {
    const conn = this.getConnectionByTabId(tabId);
    if (conn && conn.socket && conn.socket.readyState === conn.socket.OPEN) {
      conn.socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  /**
   * Send message to all connections in a session
   * @param sessionId - Session ID
   * @param message - Message to send
   * @param targetType - Optional: 'ide' to send only to IDE connections (with tabId), 'client' to send only to web app connections (without tabId), or undefined to send to all
   */
  sendToSession(sessionId: string, message: any, targetType?: 'ide' | 'client'): number {
    const connections = this.getConnectionsForSession(sessionId);
    let sent = 0;
    connections.forEach(conn => {
      // Filter by target type if specified
      if (targetType === 'ide' && !conn.tabId) {
        return; // Skip web app connections when targeting IDE
      }
      if (targetType === 'client' && conn.tabId) {
        return; // Skip IDE connections when targeting web app
      }
      
      if (conn.socket && conn.socket.readyState === conn.socket.OPEN) {
        conn.socket.send(JSON.stringify(message));
        sent++;
      }
    });
    return sent;
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
  getActiveConnections(): Array<{ connectionId: string; sessionId: string; tabId: string | null; connectedAt: Date }> {
    return Array.from(this.connections.entries()).map(([connectionId, data]) => ({
      connectionId,
      sessionId: data.sessionId,
      tabId: data.tabId,
      connectedAt: data.connectedAt
    }));
  }
}

