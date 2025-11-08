import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { AuthResponse, ApiError } from '../types';
import { UsersRepository } from '../db/users.repository';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

export async function authRoutes(fastify: FastifyInstance) {
  const usersRepo = new UsersRepository();

  // Health check for auth routes
  fastify.get('/api/auth', async (request, reply) => {
    return { status: 'ok', message: 'Auth routes are available' };
  });

  // Login endpoint
  fastify.post<{
    Body: { email: string; password: string };
    Reply: AuthResponse | ApiError;
  }>('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Email and password are required'
      });
    }

    try {
      const user = await usersRepo.verifyPassword(email, password);

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password'
        });
      }

      // Generate JWT token with 7-day expiration (include role)
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role || 'user' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'user'
        }
      };
    } catch (error: any) {
      fastify.log.error('Login error:', error);
      fastify.log.error('Error stack:', error?.stack);
      fastify.log.error('Error message:', error?.message);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error?.message || 'An error occurred during login'
      });
    }
  });

  // Signup endpoint
  fastify.post<{
    Body: { email: string; password: string; name: string };
    Reply: AuthResponse | ApiError;
  }>('/api/auth/signup', async (request, reply) => {
    const { email, password, name } = request.body;

    if (!email || !password || !name) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Email, password, and name are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid email format'
      });
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Password must be at least 6 characters long'
      });
    }

    try {
      // Check if user already exists
      const existingUser = await usersRepo.findByEmail(email);
      if (existingUser) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'User with this email already exists'
        });
      }

      // Create new user
      const newUser = await usersRepo.create(email, password, name);

      // Generate JWT token with 7-day expiration (include role)
      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email, role: newUser.role || 'user' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role || 'user'
        }
      };
    } catch (error: any) {
      fastify.log.error(error);
      
      // Handle unique constraint violation
      if (error.code === '23505') {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'User with this email already exists'
        });
      }

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred during signup'
      });
    }
  });

  // Verify token endpoint (for IDE extensions to check token validity)
  fastify.get<{
    Reply: { valid: boolean; user?: { id: string; email: string; name: string } } | ApiError;
  }>('/api/auth/verify', {
    preHandler: authenticate
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      if (!request.userId || !request.userEmail) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid token'
        });
      }

      const user = await usersRepo.findById(request.userId);
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not found'
        });
      }

      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'user'
        }
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to verify token'
      });
    }
  });
}
