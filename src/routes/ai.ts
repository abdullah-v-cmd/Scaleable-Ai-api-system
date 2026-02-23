// AI API routes

import { Hono } from 'hono';
import type { Bindings, Variables, AIRequest } from '../types';
import { apiKeyMiddleware } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimit';
import { routeAIRequest } from '../utils/aiProviders';
import { getActiveModels } from '../utils/database';

const ai = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply authentication and rate limiting to all AI routes
ai.use('/*', apiKeyMiddleware);
ai.use('/*', rateLimiter());

/**
 * GET /api/ai/models
 * Get list of available AI models
 */
ai.get('/models', async (c) => {
  try {
    const models = await getActiveModels(c.env.DB);
    
    return c.json({
      models: models.map(m => ({
        provider: m.provider,
        name: m.model_name,
        id: m.model_id,
        description: m.description,
        maxTokens: m.max_tokens,
        costPer1kTokens: m.cost_per_1k_tokens
      }))
    });
  } catch (error) {
    console.error('Get models error:', error);
    return c.json({ error: 'Failed to fetch models' }, 500);
  }
});

/**
 * POST /api/ai/chat
 * Chat completion endpoint (OpenAI-compatible)
 */
ai.post('/chat', async (c) => {
  try {
    const request = await c.req.json() as AIRequest;

    // Validate request
    if (!request.model || !request.messages || !Array.isArray(request.messages)) {
      return c.json({ error: 'Invalid request format' }, 400);
    }

    if (request.messages.length === 0) {
      return c.json({ error: 'Messages array cannot be empty' }, 400);
    }

    // Store model info in context for logging
    c.set('modelProvider' as any, request.model.split('-')[0]);
    c.set('modelName' as any, request.model);

    // Route to appropriate AI provider
    const response = await routeAIRequest(request, c.env);

    return c.json(response);
  } catch (error) {
    console.error('Chat completion error:', error);
    return c.json({ 
      error: 'Chat completion failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/ai/completion
 * Text completion endpoint
 */
ai.post('/completion', async (c) => {
  try {
    const { model, prompt, temperature, max_tokens } = await c.req.json();

    if (!model || !prompt) {
      return c.json({ error: 'Missing model or prompt' }, 400);
    }

    // Convert to chat format
    const request: AIRequest = {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens
    };

    // Store model info in context for logging
    c.set('modelProvider' as any, model.split('-')[0]);
    c.set('modelName' as any, model);

    // Route to appropriate AI provider
    const response = await routeAIRequest(request, c.env);

    return c.json({
      id: response.id,
      model: response.model,
      text: response.choices[0].message.content,
      usage: response.usage
    });
  } catch (error) {
    console.error('Text completion error:', error);
    return c.json({ 
      error: 'Text completion failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/ai/stream
 * Streaming chat completion (basic implementation)
 */
ai.post('/stream', async (c) => {
  try {
    const request = await c.req.json() as AIRequest;

    if (!request.model || !request.messages) {
      return c.json({ error: 'Invalid request format' }, 400);
    }

    // For now, return non-streaming response with a note
    // Streaming would require SSE implementation
    const response = await routeAIRequest(request, c.env);

    return c.json({
      ...response,
      note: 'Streaming not yet implemented, returning complete response'
    });
  } catch (error) {
    console.error('Stream error:', error);
    return c.json({ 
      error: 'Streaming failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/ai/health
 * Health check endpoint
 */
ai.get('/health', async (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'AI Platform API'
  });
});

export default ai;
