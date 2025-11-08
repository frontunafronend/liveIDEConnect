/**
 * Shared TypeScript types for LiveIDEConnect Frontend
 * These should match the backend types for consistency
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
  name: string;
  role?: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
}

