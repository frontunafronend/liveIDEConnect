import { Pool } from 'pg';
import { LiveIdeMessage } from '../types';
import { getDbPool } from './connection';

export class MessagesRepository {
  private db: Pool;

  constructor() {
    this.db = getDbPool();
  }

  async findBySessionId(sessionId: string): Promise<LiveIdeMessage[]> {
    const result = await this.db.query(
      `SELECT type, session_id, from_role, content, created_at
       FROM messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );

    return result.rows.map(row => ({
      type: row.type,
      sessionId: row.session_id,
      from: row.from_role,
      content: row.content,
      ts: row.created_at.toISOString()
    }));
  }

  async create(message: Omit<LiveIdeMessage, 'ts'>): Promise<LiveIdeMessage> {
    const result = await this.db.query(
      `INSERT INTO messages (session_id, type, from_role, content, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING type, session_id, from_role, content, created_at`,
      [message.sessionId, message.type, message.from, message.content]
    );

    const row = result.rows[0];
    return {
      type: row.type,
      sessionId: row.session_id,
      from: row.from_role,
      content: row.content,
      ts: row.created_at.toISOString()
    };
  }
}

