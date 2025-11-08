import { Pool } from 'pg';
import { LiveIdeSession } from '../types';
import { getDbPool } from './connection';

export class SessionsRepository {
  private db: Pool;

  constructor() {
    this.db = getDbPool();
  }

  async findAllByUserId(userId: string): Promise<LiveIdeSession[]> {
    const result = await this.db.query(
      `SELECT id, name, status, last_active, user_id
       FROM sessions
       WHERE user_id = $1
       ORDER BY last_active DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      lastActive: row.last_active.toISOString(),
      userId: row.user_id
    }));
  }

  async findById(id: string): Promise<LiveIdeSession | null> {
    const result = await this.db.query(
      `SELECT id, name, status, last_active, user_id
       FROM sessions
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      lastActive: row.last_active.toISOString(),
      userId: row.user_id
    };
  }

  async create(userId: string, name: string, status: string = 'offline'): Promise<LiveIdeSession> {
    const result = await this.db.query(
      `INSERT INTO sessions (user_id, name, status, last_active)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING id, name, status, last_active, user_id`,
      [userId, name, status]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      lastActive: row.last_active.toISOString(),
      userId: row.user_id
    };
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.db.query(
      `UPDATE sessions
       SET status = $1, last_active = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [status, id]
    );
  }

  async updateLastActive(id: string): Promise<void> {
    await this.db.query(
      `UPDATE sessions
       SET last_active = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
  }
}

