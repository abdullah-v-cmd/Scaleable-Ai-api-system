// Request logging middleware

import { Context, Next } from 'hono';
import type { Bindings, Variables } from '../types';
import { logRequest } from '../utils/database';

/**
 * Request logging middleware
 * Logs all API requests to database
 */
export async function requestLogger(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
) {
  const startTime = Date.now();
  const user = c.get('user');
  const apiKey = c.get('apiKey');

  // Get request details
  const endpoint = c.req.path;
  const method = c.req.method;
  const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For');
  const userAgent = c.req.header('User-Agent');

  // Get request size
  let requestSize = 0;
  try {
    const body = await c.req.raw.clone().text();
    requestSize = new Blob([body]).size;
  } catch (e) {
    // Unable to get request size
  }

  // Execute the request
  await next();

  // Calculate latency
  const latencyMs = Date.now() - startTime;

  // Get response details
  const statusCode = c.res.status;
  let responseSize = 0;
  try {
    const resClone = c.res.clone();
    const resText = await resClone.text();
    responseSize = new Blob([resText]).size;
  } catch (e) {
    // Unable to get response size
  }

  // Extract model info from context if available
  const modelProvider = c.get('modelProvider' as any);
  const modelName = c.get('modelName' as any);

  // Log to database
  try {
    await logRequest(c.env.DB, {
      userId: user?.id,
      apiKeyId: apiKey?.id,
      endpoint,
      method,
      modelProvider,
      modelName,
      statusCode,
      requestSize,
      responseSize,
      latencyMs,
      errorMessage: statusCode >= 400 ? await getErrorMessage(c.res.clone()) : undefined,
      ipAddress,
      userAgent
    });
  } catch (error) {
    console.error('Failed to log request:', error);
    // Don't fail the request if logging fails
  }
}

/**
 * Extract error message from response
 */
async function getErrorMessage(response: Response): Promise<string | undefined> {
  try {
    const json = await response.json();
    return json.error || json.message;
  } catch {
    return undefined;
  }
}

/**
 * Console logger middleware for development
 */
export async function consoleLogger(c: Context, next: Next) {
  const startTime = Date.now();
  const { method, url } = c.req;

  console.log(`--> ${method} ${url}`);

  await next();

  const latency = Date.now() - startTime;
  console.log(`<-- ${method} ${url} ${c.res.status} (${latency}ms)`);
}
