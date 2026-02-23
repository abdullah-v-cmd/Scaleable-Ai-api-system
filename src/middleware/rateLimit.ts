// Rate limiting middleware

import { Context, Next } from 'hono';
import type { Bindings, Variables } from '../types';
import { checkRateLimit } from '../utils/database';

interface RateLimitConfig {
  maxRequests: number;
  windowMinutes: number;
  message?: string;
}

// Default rate limits by endpoint type
const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  '/api/ai/chat': { maxRequests: 100, windowMinutes: 60 },
  '/api/ai/completion': { maxRequests: 100, windowMinutes: 60 },
  '/api/auth/login': { maxRequests: 10, windowMinutes: 15 },
  '/api/auth/register': { maxRequests: 5, windowMinutes: 60 },
  default: { maxRequests: 200, windowMinutes: 60 }
};

/**
 * Rate limiting middleware
 * Limits requests per user based on endpoint
 */
export function rateLimiter(config?: RateLimitConfig) {
  return async (
    c: Context<{ Bindings: Bindings; Variables: Variables }>,
    next: Next
  ) => {
    const user = c.get('user');
    
    // Skip rate limiting if no user (should be used after auth middleware)
    if (!user) {
      await next();
      return;
    }

    const path = c.req.path;
    const endpoint = path.split('?')[0]; // Remove query params
    
    // Get rate limit config for this endpoint
    let limitConfig = config;
    if (!limitConfig) {
      // Try to match specific endpoint
      for (const [key, value] of Object.entries(DEFAULT_LIMITS)) {
        if (endpoint.startsWith(key)) {
          limitConfig = value;
          break;
        }
      }
      // Use default if no match
      if (!limitConfig) {
        limitConfig = DEFAULT_LIMITS.default;
      }
    }

    try {
      const { allowed, remaining, resetAt } = await checkRateLimit(
        c.env.DB,
        user.id,
        endpoint,
        limitConfig.maxRequests,
        limitConfig.windowMinutes
      );

      // Set rate limit headers
      c.header('X-RateLimit-Limit', limitConfig.maxRequests.toString());
      c.header('X-RateLimit-Remaining', remaining.toString());
      c.header('X-RateLimit-Reset', resetAt.toISOString());

      if (!allowed) {
        return c.json({
          error: limitConfig.message || 'Rate limit exceeded',
          message: `Too many requests. Please try again after ${resetAt.toISOString()}`,
          retryAfter: resetAt.toISOString(),
          limit: limitConfig.maxRequests,
          remaining: 0
        }, 429);
      }

      await next();
    } catch (error) {
      console.error('Rate limit error:', error);
      // Continue without rate limiting on error
      await next();
    }
  };
}

/**
 * IP-based rate limiting (for public endpoints)
 */
export function ipRateLimiter(config: RateLimitConfig) {
  const ipRequestMap = new Map<string, { count: number; resetAt: Date }>();

  return async (c: Context, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') || 
                c.req.header('X-Forwarded-For') || 
                'unknown';

    const now = new Date();
    const ipData = ipRequestMap.get(ip);

    if (ipData) {
      if (now > ipData.resetAt) {
        // Reset window
        ipRequestMap.set(ip, {
          count: 1,
          resetAt: new Date(now.getTime() + config.windowMinutes * 60 * 1000)
        });
      } else if (ipData.count >= config.maxRequests) {
        // Rate limit exceeded
        c.header('X-RateLimit-Limit', config.maxRequests.toString());
        c.header('X-RateLimit-Remaining', '0');
        c.header('X-RateLimit-Reset', ipData.resetAt.toISOString());
        
        return c.json({
          error: 'Rate limit exceeded',
          message: 'Too many requests from this IP address',
          retryAfter: ipData.resetAt.toISOString()
        }, 429);
      } else {
        // Increment count
        ipData.count++;
      }
    } else {
      // First request from this IP
      ipRequestMap.set(ip, {
        count: 1,
        resetAt: new Date(now.getTime() + config.windowMinutes * 60 * 1000)
      });
    }

    const currentData = ipRequestMap.get(ip)!;
    c.header('X-RateLimit-Limit', config.maxRequests.toString());
    c.header('X-RateLimit-Remaining', (config.maxRequests - currentData.count).toString());
    c.header('X-RateLimit-Reset', currentData.resetAt.toISOString());

    await next();
  };
}

/**
 * Clean up expired entries periodically
 * Note: In Cloudflare Workers, this would be handled by D1 database TTL
 * or a scheduled worker (Cron Trigger)
 */
// setInterval not allowed in global scope for Cloudflare Workers
// Use Cron Triggers or Durable Objects for cleanup in production
