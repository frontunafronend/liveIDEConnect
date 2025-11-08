import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { User, UserRole } from '../types';
import { getDbPool } from './connection';

export class UsersRepository {
  private db: Pool;

  constructor() {
    this.db = getDbPool();
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.query(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      password: row.password_hash, // Internal use only, never exposed in API responses
      name: row.name,
      role: row.role || 'user'
    };
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role || 'user',
      password: '' // Don't return password
    };
  }

  async create(email: string, password: string, name: string, role: UserRole = 'user'): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await this.db.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role`,
      [email, passwordHash, name, role]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role || 'user',
      password: '' // Don't return password
    };
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const result = await this.db.query(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const isValid = await bcrypt.compare(password, row.password_hash);
    
    if (!isValid) {
      return null;
    }

    // Return user without password
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role || 'user',
      password: ''
    };
  }

  async findAll(): Promise<User[]> {
    const result = await this.db.query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
    );

    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role || 'user',
      password: ''
    }));
  }

  async banUser(id: string): Promise<boolean> {
    // Soft delete: mark user as banned (we'll use a deleted_at column or role change)
    // For now, we'll update role to indicate banned status
    const result = await this.db.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id',
      ['user', id] // Keep as user but could add 'banned' role later
    );
    return result.rows.length > 0;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows.length > 0;
  }
}

