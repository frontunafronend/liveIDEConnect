import 'dotenv/config';
import { getDbPool } from './connection';

async function testDatabaseConnection() {
  try {
    const pool = getDbPool();

    const nowResult = await pool.query('SELECT NOW() as current_time');

    const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');

    const sessionsCount = await pool.query('SELECT COUNT(*) as count FROM sessions');

    const messagesCount = await pool.query('SELECT COUNT(*) as count FROM messages');

    const testInsert = await pool.query(`
      INSERT INTO messages (session_id, type, from_role, content)
      VALUES (
        (SELECT id FROM sessions LIMIT 1),
        'status',
        'ide',
        'Test message - will be rolled back'
      )
      RETURNING id, content
    `);
    
    await pool.query('DELETE FROM messages WHERE content = $1', [
      'Test message - will be rolled back'
    ]);

    process.exit(0);
  } catch (error: any) {
    process.exit(1);
  }
}

testDatabaseConnection();

