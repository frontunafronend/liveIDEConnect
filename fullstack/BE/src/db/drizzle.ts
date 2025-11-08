import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Drizzle ORM database connection
 * Use this for type-safe queries with Drizzle
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create postgres client with SSL for Neon
const client = postgres(connectionString, {
  ssl: connectionString.includes('sslmode=require') || connectionString.includes('neon.tech')
    ? 'require'
    : undefined,
  max: 20,
});

// Create Drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for use in queries
export * from './schema';

