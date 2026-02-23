// Analytics and statistics routes

import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { getUserStats, getRecentLogs } from '../utils/database';

const analytics = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All analytics routes require authentication
analytics.use('/*', authMiddleware);

/**
 * GET /api/analytics/stats
 * Get user statistics
 */
analytics.get('/stats', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const stats = await getUserStats(c.env.DB, user.id);

    return c.json({
      stats: {
        totalRequests: stats.total_requests || 0,
        successfulRequests: stats.successful_requests || 0,
        failedRequests: stats.failed_requests || 0,
        averageLatency: Math.round(stats.avg_latency || 0),
        lastRequest: stats.last_request
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    return c.json({ error: 'Failed to fetch statistics' }, 500);
  }
});

/**
 * GET /api/analytics/logs
 * Get recent request logs
 */
analytics.get('/logs', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const limit = parseInt(c.req.query('limit') || '50');
    const logs = await getRecentLogs(c.env.DB, user.id, limit);

    return c.json({
      logs: logs.map(log => ({
        id: log.id,
        endpoint: log.endpoint,
        method: log.method,
        modelProvider: log.model_provider,
        modelName: log.model_name,
        statusCode: log.status_code,
        latency: log.latency_ms,
        timestamp: log.created_at,
        errorMessage: log.error_message
      }))
    });
  } catch (error) {
    console.error('Logs error:', error);
    return c.json({ error: 'Failed to fetch logs' }, 500);
  }
});

/**
 * GET /api/analytics/usage
 * Get usage breakdown by model
 */
analytics.get('/usage', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const days = parseInt(c.req.query('days') || '7');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await c.env.DB.prepare(`
      SELECT 
        model_provider,
        model_name,
        COUNT(*) as request_count,
        AVG(latency_ms) as avg_latency,
        SUM(CASE WHEN status_code < 400 THEN 1 ELSE 0 END) as successful_requests
      FROM request_logs
      WHERE user_id = ? AND created_at > ?
      GROUP BY model_provider, model_name
      ORDER BY request_count DESC
    `).bind(user.id, startDate.toISOString()).all();

    return c.json({
      usage: result.results.map((row: any) => ({
        provider: row.model_provider,
        model: row.model_name,
        requests: row.request_count,
        averageLatency: Math.round(row.avg_latency || 0),
        successRate: ((row.successful_requests / row.request_count) * 100).toFixed(2) + '%'
      })),
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Usage error:', error);
    return c.json({ error: 'Failed to fetch usage data' }, 500);
  }
});

/**
 * GET /api/analytics/timeline
 * Get request timeline data
 */
analytics.get('/timeline', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const hours = parseInt(c.req.query('hours') || '24');
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    const result = await c.env.DB.prepare(`
      SELECT 
        strftime('%Y-%m-%d %H:00:00', created_at) as hour,
        COUNT(*) as request_count,
        AVG(latency_ms) as avg_latency
      FROM request_logs
      WHERE user_id = ? AND created_at > ?
      GROUP BY hour
      ORDER BY hour
    `).bind(user.id, startDate.toISOString()).all();

    return c.json({
      timeline: result.results.map((row: any) => ({
        timestamp: row.hour,
        requests: row.request_count,
        averageLatency: Math.round(row.avg_latency || 0)
      })),
      period: {
        hours,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Timeline error:', error);
    return c.json({ error: 'Failed to fetch timeline data' }, 500);
  }
});

export default analytics;
