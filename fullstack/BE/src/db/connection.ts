import { Pool, PoolConfig } from 'pg';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const config: PoolConfig = {
      connectionString,
      ssl: connectionString.includes('sslmode=require') || connectionString.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    pool = new Pool(config);

    pool.on('error', (err) => {
    });
  }

  return pool;
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is not set');
      return false;
    }
    const db = getDbPool();
    const result = await db.query('SELECT NOW()');
    console.log('Database connection test successful');
    return true;
  } catch (error: any) {
    console.error('Database connection test failed:', error.message);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    return false;
  }
}

