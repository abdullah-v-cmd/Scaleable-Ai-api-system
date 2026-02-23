// Authentication routes

import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { hashPassword, verifyPassword, generateApiKey, generateJWT } from '../utils/auth';
import { getUserByEmail, createUser, getUserById } from '../utils/database';
import { authMiddleware } from '../middleware/auth';
import { JWT_SECRET } from '../middleware/auth';

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * POST /api/auth/register
 * Register a new user
 */
auth.post('/register', async (c) => {
  try {
    const { email, username, password } = await c.req.json();

    // Validate input
    if (!email || !username || !password) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(c.env.DB, email);
    if (existingUser) {
      return c.json({ error: 'User already exists' }, 409);
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Generate API key
    const apiKey = generateApiKey();

    // Create user
    const user = await createUser(c.env.DB, email, username, passwordHash, apiKey);

    // Generate JWT
    const token = await generateJWT({
      userId: user.id,
      email: user.email,
      role: user.role
    }, JWT_SECRET);

    return c.json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        apiKey: user.api_key
      },
      token
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

/**
 * POST /api/auth/login
 * Login user and get JWT token
 */
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: 'Missing email or password' }, 400);
    }

    // Get user
    const user = await getUserByEmail(c.env.DB, email);
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Check if user is active
    if (!user.is_active) {
      return c.json({ error: 'Account is disabled' }, 403);
    }

    // Generate JWT
    const token = await generateJWT({
      userId: user.id,
      email: user.email,
      role: user.role
    }, JWT_SECRET);

    return c.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        apiKey: user.api_key
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      apiKey: user.api_key,
      createdAt: user.created_at
    }
  });
});

/**
 * POST /api/auth/refresh-api-key
 * Generate a new API key for user
 */
auth.post('/refresh-api-key', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Generate new API key
    const newApiKey = generateApiKey();

    // Update user's API key
    await c.env.DB.prepare('UPDATE users SET api_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(newApiKey, user.id)
      .run();

    return c.json({
      message: 'API key refreshed successfully',
      apiKey: newApiKey
    });
  } catch (error) {
    console.error('API key refresh error:', error);
    return c.json({ error: 'Failed to refresh API key' }, 500);
  }
});

/**
 * PUT /api/auth/password
 * Change user password
 */
auth.put('/password', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const { currentPassword, newPassword } = await c.req.json();

    if (!currentPassword || !newPassword) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (newPassword.length < 8) {
      return c.json({ error: 'New password must be at least 8 characters' }, 400);
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user!.password_hash);
    if (!isValid) {
      return c.json({ error: 'Invalid current password' }, 401);
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(newPasswordHash, user!.id)
      .run();

    return c.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    return c.json({ error: 'Failed to update password' }, 500);
  }
});

export default auth;
