import { getDbPool, testConnection } from './connection';

export async function runMigrations(): Promise<void> {
  try {
    const db = getDbPool();
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='users' AND column_name='role'
        ) THEN
          ALTER TABLE users ADD COLUMN role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));
        END IF;
      END $$;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy')),
        last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('status', 'command', 'agent_message')),
        from_role VARCHAR(20) NOT NULL CHECK (from_role IN ('ide', 'client')),
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');

    // Monitor metrics table for AI Guard v2
    await db.query(`
      CREATE TABLE IF NOT EXISTS monitor_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cpu FLOAT NOT NULL,
        memory FLOAT NOT NULL,
        messages INT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query('CREATE INDEX IF NOT EXISTS idx_monitor_metrics_timestamp ON monitor_metrics(timestamp)');

    await db.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await db.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    await db.query(`
      DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
      CREATE TRIGGER update_sessions_updated_at
        BEFORE UPDATE ON sessions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

  } catch (error) {
    throw error;
  }
}
export async function initDatabase(): Promise<void> {
  const connected = await testConnection();
  if (!connected) {
    throw new Error('Cannot initialize database: connection failed');
  }

  await runMigrations();
}
