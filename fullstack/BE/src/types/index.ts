/**
 * Shared TypeScript types for LiveIDEConnect
 * Used by backend, frontend, and future IDE extension
 */

export type LiveIdeRole = 'ide' | 'client';

export type SessionStatus = 'online' | 'offline' | 'busy';

export interface LiveIdeMessage {
  type: 'status' | 'command' | 'agent_message';
  sessionId: string;
  from: LiveIdeRole;
  content: string;
  ts: string;
}

export interface LiveIdeSession {
  id: string;
  name: string;
  status: SessionStatus;
  lastActive: string;
  userId: string;
}

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  password: string; // In production, this would be hashed
  name: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface ApiError {
  error: string;
  message: string;
}

