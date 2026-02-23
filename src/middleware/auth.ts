// Authentication middleware

import { Context, Next } from 'hono';
import type { Bindings, Variables, User, ApiKey } from '../types';
import { verifyJWT } from '../utils/auth';
import { getUserByApiKey, getApiKeyDetails, updateApiKeyLastUsed } from '../utils/database';

const JWT_SECRET = 'your-secret-key-change-in-production'; // Should be in environment variables

/**
 * JWT Authentication middleware
 * Verifies JWT token from Authorization header
 */
export async function authMiddleware(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized - No token provided' }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verifyJWT(token, JWT_SECRET);
    
    // Get user from database
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(payload.userId)
      .first() as User | null;

    if (!user || !user.is_active) {
      return c.json({ error: 'Unauthorized - Invalid user' }, 401);
    }

    // Store user in context
    c.set('user', user);
    await next();
  } catch (error) {
    return c.json({ error: 'Unauthorized - Invalid token' }, 401);
  }
}

/**
 * API Key Authentication middleware
 * Verifies API key from X-API-Key header
 */
export async function apiKeyMiddleware(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
) {
  const apiKey = c.req.header('X-API-Key');

  if (!apiKey) {
    return c.json({ error: 'Unauthorized - No API key provided' }, 401);
  }

  try {
    // Check if it's a user API key
    const user = await getUserByApiKey(c.env.DB, apiKey);
    
    if (user && user.is_active) {
      c.set('user', user);
      await next();
      return;
    }

    // Check if it's a separate API key
    const apiKeyDetails = await getApiKeyDetails(c.env.DB, apiKey);
    
    if (!apiKeyDetails) {
      return c.json({ error: 'Unauthorized - Invalid API key' }, 401);
    }

    // Get user associated with API key
    const keyUser = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(apiKeyDetails.user_id)
      .first() as User | null;

    if (!keyUser || !keyUser.is_active) {
      return c.json({ error: 'Unauthorized - Invalid user' }, 401);
    }

    // Update last used timestamp
    await updateApiKeyLastUsed(c.env.DB, apiKeyDetails.id);

    // Store user and API key in context
    c.set('user', keyUser);
    c.set('apiKey', apiKeyDetails);
    
    await next();
  } catch (error) {
    console.error('API Key auth error:', error);
    return c.json({ error: 'Unauthorized - Authentication failed' }, 401);
  }
}

/**
 * Optional authentication middleware
 * Allows requests with or without authentication
 */
export async function optionalAuthMiddleware(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
) {
  const authHeader = c.req.header('Authorization');
  const apiKey = c.req.header('X-API-Key');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = await verifyJWT(token, JWT_SECRET);
      const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
        .bind(payload.userId)
        .first() as User | null;

      if (user && user.is_active) {
        c.set('user', user);
      }
    } catch (error) {
      // Continue without authentication
    }
  } else if (apiKey) {
    try {
      const user = await getUserByApiKey(c.env.DB, apiKey);
      if (user && user.is_active) {
        c.set('user', user);
      }
    } catch (error) {
      // Continue without authentication
    }
  }

  await next();
}

/**
 * Admin role middleware
 * Requires user to be authenticated and have admin role
 */
export async function adminMiddleware(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
) {
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'Unauthorized - Authentication required' }, 401);
  }

  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden - Admin access required' }, 403);
  }

  await next();
}

// Export JWT_SECRET for use in other modules
export { JWT_SECRET };
