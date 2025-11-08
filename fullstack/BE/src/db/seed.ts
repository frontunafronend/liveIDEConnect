import 'dotenv/config';
import { getDbPool, testConnection } from './connection';
import { initDatabase } from './migrations';
import { UsersRepository } from './users.repository';
import { SessionsRepository } from './sessions.repository';
import { MessagesRepository } from './messages.repository';
import bcrypt from 'bcrypt';

export async function seedDatabase(): Promise<void> {
  try {
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Cannot seed database: connection failed');
    }

    try {
      await initDatabase();
    } catch (error) {
    }

    const db = getDbPool();
    const usersRepo = new UsersRepository();
    const sessionsRepo = new SessionsRepository();
    const messagesRepo = new MessagesRepository();

    // Always ensure admin user exists with correct password
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';
    let adminUser = await usersRepo.findByEmail(adminEmail);
    
    if (!adminUser) {
      // Create admin user if it doesn't exist
      adminUser = await usersRepo.create(adminEmail, adminPassword, 'Admin User', 'admin');
      console.log('Admin user created');
    } else {
      // Verify password is correct, update if needed
      const passwordValid = await bcrypt.compare(adminPassword, adminUser.password || '');
      if (!passwordValid) {
        // Update password hash
        const newPasswordHash = await bcrypt.hash(adminPassword, 10);
        await db.query(
          'UPDATE users SET password_hash = $1 WHERE email = $2',
          [newPasswordHash, adminEmail]
        );
        console.log('Admin user password updated');
      }
      // Ensure role is admin
      if (adminUser.role !== 'admin') {
        await db.query(
          'UPDATE users SET role = $1 WHERE email = $2',
          ['admin', adminEmail]
        );
        console.log('Admin user role updated');
      }
    }

    const existingUsers = await db.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(existingUsers.rows[0].count) > 0) {
      // If users exist, only seed test users if they don't exist
      const testUsers = [
        { email: 'test@example.com', password: 'password123', name: 'Test User', role: 'user' as const },
        { email: 'demo@example.com', password: 'demo123', name: 'Demo User', role: 'user' as const }
      ];

      for (const userData of testUsers) {
        const existingUser = await usersRepo.findByEmail(userData.email);
        if (!existingUser) {
          try {
            await usersRepo.create(userData.email, userData.password, userData.name, userData.role);
          } catch (error: any) {
            // Ignore if user already exists
          }
        }
      }
      return;
    }
    
    // If no users exist, create all test users
    const testUsers = [
      { email: 'test@example.com', password: 'password123', name: 'Test User', role: 'user' as const },
      { email: 'demo@example.com', password: 'demo123', name: 'Demo User', role: 'user' as const },
      { email: 'admin@example.com', password: 'admin123', name: 'Admin User', role: 'admin' as const }
    ];

    const createdUsers = [];
    for (const userData of testUsers) {
      try {
        const user = await usersRepo.create(userData.email, userData.password, userData.name, userData.role);
        createdUsers.push(user);
      } catch (error: any) {
        if (error.code === '23505') {
          const existingUser = await usersRepo.findByEmail(userData.email);
          if (existingUser) {
            createdUsers.push(existingUser);
          }
        } else {
          throw error;
        }
      }
    }

    if (createdUsers.length === 0) {
      return;
    }

    const testUser = createdUsers[0];
    const testSessions = [
      { name: 'VS Code - Main Project', status: 'online' },
      { name: 'Cursor - Side Project', status: 'offline' },
      { name: 'VS Code - Work Project', status: 'busy' }
    ];

    const createdSessions = [];
    for (const sessionData of testSessions) {
      const session = await sessionsRepo.create(testUser.id, sessionData.name, sessionData.status);
      createdSessions.push(session);
    }
    if (createdSessions.length > 0) {
      const firstSession = createdSessions[0];
      
      const testMessages = [
        {
          type: 'status' as const,
          sessionId: firstSession.id,
          from: 'ide' as const,
          content: 'IDE connection established'
        },
        {
          type: 'agent_message' as const,
          sessionId: firstSession.id,
          from: 'ide' as const,
          content: 'Hello! I\'m ready to help with your development tasks.'
        },
        {
          type: 'agent_message' as const,
          sessionId: firstSession.id,
          from: 'client' as const,
          content: 'Can you help me refactor this component?'
        },
        {
          type: 'agent_message' as const,
          sessionId: firstSession.id,
          from: 'ide' as const,
          content: 'Of course! I can help you refactor the component. What specific improvements would you like to make?'
        }
      ];

      for (const messageData of testMessages) {
        await messagesRepo.create(messageData);
      }
    }
  } catch (error) {
    throw error;
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      process.exit(1);
    });
}

