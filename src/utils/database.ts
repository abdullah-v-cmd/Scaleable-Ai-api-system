// Database utility functions

import type { D1Database } from '@cloudflare/workers-types';
import type { User, ApiKey, RequestLog, AIModel } from '../types';

/**
 * Get user by email
 */
export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const result = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  return result as User | null;
}

/**
 * Get user by API key
 */
export async function getUserByApiKey(db: D1Database, apiKey: string): Promise<User | null> {
  const result = await db.prepare('SELECT * FROM users WHERE api_key = ?').bind(apiKey).first();
  return result as User | null;
}

/**
 * Get user by ID
 */
export async function getUserById(db: D1Database, id: number): Promise<User | null> {
  const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  return result as User | null;
}

/**
 * Create new user
 */
export async function createUser(
  db: D1Database,
  email: string,
  username: string,
  passwordHash: string,
  apiKey: string,
  role: string = 'user'
): Promise<User> {
  const result = await db.prepare(`
    INSERT INTO users (email, username, password_hash, api_key, role)
    VALUES (?, ?, ?, ?, ?)
    RETURNING *
  `).bind(email, username, passwordHash, apiKey, role).first();
  
  return result as User;
}

/**
 * Get API key details
 */
export async function getApiKeyDetails(db: D1Database, apiKey: string): Promise<ApiKey | null> {
  const result = await db.prepare(`
    SELECT * FROM api_keys WHERE api_key = ? AND is_active = 1
  `).bind(apiKey).first();
  
  return result as ApiKey | null;
}

/**
 * Update API key last used timestamp
 */
export async function updateApiKeyLastUsed(db: D1Database, apiKeyId: number): Promise<void> {
  await db.prepare(`
    UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(apiKeyId).run();
}

/**
 * Log API request
 */
export async function logRequest(
  db: D1Database,
  data: {
    userId?: number;
    apiKeyId?: number;
    endpoint: string;
    method: string;
    modelProvider?: string;
    modelName?: string;
    statusCode: number;
    requestSize: number;
    responseSize: number;
    latencyMs: number;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  await db.prepare(`
    INSERT INTO request_logs (
      user_id, api_key_id, endpoint, method, model_provider, model_name,
      status_code, request_size, response_size, latency_ms, error_message,
      ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.userId || null,
    data.apiKeyId || null,
    data.endpoint,
    data.method,
    data.modelProvider || null,
    data.modelName || null,
    data.statusCode,
    data.requestSize,
    data.responseSize,
    data.latencyMs,
    data.errorMessage || null,
    data.ipAddress || null,
    data.userAgent || null
  ).run();
}

/**
 * Get all active AI models
 */
export async function getActiveModels(db: D1Database): Promise<AIModel[]> {
  const result = await db.prepare('SELECT * FROM ai_models WHERE is_active = 1').all();
  return result.results as AIModel[];
}

/**
 * Get model by provider and name
 */
export async function getModelByProviderAndName(
  db: D1Database,
  provider: string,
  modelName: string
): Promise<AIModel | null> {
  const result = await db.prepare(`
    SELECT * FROM ai_models WHERE provider = ? AND model_id = ? AND is_active = 1
  `).bind(provider, modelName).first();
  
  return result as AIModel | null;
}

/**
 * Check rate limit for user
 */
export async function checkRateLimit(
  db: D1Database,
  userId: number,
  endpoint: string,
  maxRequests: number = 100,
  windowMinutes: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

  // Get current count in window
  const result = await db.prepare(`
    SELECT COUNT(*) as count FROM request_logs
    WHERE user_id = ? AND endpoint = ? AND created_at > ?
  `).bind(userId, endpoint, windowStart.toISOString()).first();

  const count = (result as any)?.count || 0;
  const remaining = Math.max(0, maxRequests - count);
  const resetAt = new Date(now.getTime() + windowMinutes * 60 * 1000);

  return {
    allowed: count < maxRequests,
    remaining,
    resetAt
  };
}

/**
 * Get user statistics
 */
export async function getUserStats(db: D1Database, userId: number): Promise<any> {
  const result = await db.prepare(`
    SELECT
      COUNT(*) as total_requests,
      SUM(CASE WHEN status_code < 400 THEN 1 ELSE 0 END) as successful_requests,
      SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as failed_requests,
      AVG(latency_ms) as avg_latency,
      MAX(created_at) as last_request
    FROM request_logs
    WHERE user_id = ?
  `).bind(userId).first();

  return result;
}

/**
 * Get recent logs for user
 */
export async function getRecentLogs(db: D1Database, userId: number, limit: number = 50): Promise<RequestLog[]> {
  const result = await db.prepare(`
    SELECT * FROM request_logs
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(userId, limit).all();

  return result.results as RequestLog[];
}
