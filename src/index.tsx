import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import { swaggerUI } from '@hono/swagger-ui';
import type { Bindings, Variables } from './types';
import { requestLogger, consoleLogger } from './middleware/logger';
import authRoutes from './routes/auth';
import aiRoutes from './routes/ai';
import analyticsRoutes from './routes/analytics';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Global middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
}));

app.use('*', consoleLogger);
app.use('/api/*', requestLogger);

// Serve static files from public/static directory
app.use('/static/*', serveStatic({ root: './public' }));

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api/ai', aiRoutes);
app.route('/api/analytics', analyticsRoutes);

// Swagger documentation
app.get('/api/docs', swaggerUI({
  url: '/api/openapi.json'
}));

// OpenAPI specification
app.get('/api/openapi.json', (c) => {
  return c.json({
    openapi: '3.0.0',
    info: {
      title: 'Multi-Model AI Platform API',
      version: '1.0.0',
      description: 'A comprehensive API platform for accessing multiple AI models from different providers including OpenAI, Anthropic, Google, and Cohere.',
      contact: {
        name: 'API Support',
        email: 'support@aiplatform.com'
      }
    },
    servers: [
      {
        url: 'https://your-domain.pages.dev',
        description: 'Production server'
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    tags: [
      { name: 'Authentication', description: 'User authentication and management' },
      { name: 'AI', description: 'AI model inference endpoints' },
      { name: 'Analytics', description: 'Usage statistics and logs' }
    ],
    paths: {
      '/api/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'username', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    username: { type: 'string' },
                    password: { type: 'string', minLength: 8 }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'User registered successfully' },
            '400': { description: 'Invalid input' },
            '409': { description: 'User already exists' }
          }
        }
      },
      '/api/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Login and get JWT token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Login successful' },
            '401': { description: 'Invalid credentials' }
          }
        }
      },
      '/api/ai/models': {
        get: {
          tags: ['AI'],
          summary: 'Get list of available AI models',
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': { description: 'List of models' },
            '401': { description: 'Unauthorized' }
          }
        }
      },
      '/api/ai/chat': {
        post: {
          tags: ['AI'],
          summary: 'Chat completion endpoint (OpenAI-compatible)',
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['model', 'messages'],
                  properties: {
                    model: { type: 'string', example: 'gpt-4' },
                    messages: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          role: { type: 'string', enum: ['system', 'user', 'assistant'] },
                          content: { type: 'string' }
                        }
                      }
                    },
                    temperature: { type: 'number', minimum: 0, maximum: 2 },
                    max_tokens: { type: 'integer' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Successful completion' },
            '400': { description: 'Invalid request' },
            '429': { description: 'Rate limit exceeded' }
          }
        }
      },
      '/api/analytics/stats': {
        get: {
          tags: ['Analytics'],
          summary: 'Get user statistics',
          security: [{ BearerAuth: [] }],
          responses: {
            '200': { description: 'User statistics' },
            '401': { description: 'Unauthorized' }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      }
    }
  });
});

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root route - serve dashboard
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi-Model AI Platform</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
</head>
<body class="bg-gray-50">
    <!-- Navigation -->
    <nav class="bg-white shadow-lg">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
                <div class="flex items-center">
                    <i class="fas fa-brain text-3xl text-indigo-600 mr-3"></i>
                    <span class="text-xl font-bold text-gray-800">AI Platform</span>
                </div>
                <div class="flex items-center space-x-4">
                    <a href="/api/docs" class="text-gray-600 hover:text-indigo-600">
                        <i class="fas fa-book mr-2"></i>API Docs
                    </a>
                    <button id="loginBtn" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                        <i class="fas fa-sign-in-alt mr-2"></i>Login
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div class="text-center">
                <h1 class="text-5xl font-bold mb-6">Multi-Model AI Service Platform</h1>
                <p class="text-xl mb-8">Access multiple AI models through a unified API</p>
                <div class="flex justify-center space-x-4">
                    <button class="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
                        Get Started
                    </button>
                    <button class="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-indigo-600 transition">
                        View Documentation
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Features -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 class="text-3xl font-bold text-center mb-12 text-gray-800">Platform Features</h2>
        <div class="grid md:grid-cols-3 gap-8">
            <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition">
                <div class="text-4xl mb-4 text-indigo-600">
                    <i class="fas fa-network-wired"></i>
                </div>
                <h3 class="text-xl font-bold mb-2">Multiple Models</h3>
                <p class="text-gray-600">Access GPT-4, Claude, Gemini, and Cohere through one API</p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition">
                <div class="text-4xl mb-4 text-indigo-600">
                    <i class="fas fa-shield-alt"></i>
                </div>
                <h3 class="text-xl font-bold mb-2">Secure Authentication</h3>
                <p class="text-gray-600">JWT tokens and API keys with role-based access control</p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition">
                <div class="text-4xl mb-4 text-indigo-600">
                    <i class="fas fa-tachometer-alt"></i>
                </div>
                <h3 class="text-xl font-bold mb-2">Rate Limiting</h3>
                <p class="text-gray-600">Built-in rate limiting to protect your infrastructure</p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition">
                <div class="text-4xl mb-4 text-indigo-600">
                    <i class="fas fa-chart-line"></i>
                </div>
                <h3 class="text-xl font-bold mb-2">Analytics</h3>
                <p class="text-gray-600">Detailed usage statistics and request logging</p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition">
                <div class="text-4xl mb-4 text-indigo-600">
                    <i class="fas fa-code"></i>
                </div>
                <h3 class="text-xl font-bold mb-2">OpenAPI Docs</h3>
                <p class="text-gray-600">Interactive Swagger documentation for easy integration</p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition">
                <div class="text-4xl mb-4 text-indigo-600">
                    <i class="fas fa-rocket"></i>
                </div>
                <h3 class="text-xl font-bold mb-2">Edge Deployment</h3>
                <p class="text-gray-600">Global edge network for low latency responses</p>
            </div>
        </div>
    </div>

    <!-- Supported Models -->
    <div class="bg-gray-100 py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 class="text-3xl font-bold text-center mb-12 text-gray-800">Supported AI Models</h2>
            <div class="grid md:grid-cols-4 gap-6">
                <div class="bg-white p-6 rounded-lg text-center shadow">
                    <h3 class="font-bold text-lg mb-2">OpenAI</h3>
                    <p class="text-sm text-gray-600">GPT-4, GPT-3.5 Turbo</p>
                </div>
                <div class="bg-white p-6 rounded-lg text-center shadow">
                    <h3 class="font-bold text-lg mb-2">Anthropic</h3>
                    <p class="text-sm text-gray-600">Claude 3 Opus, Sonnet, Haiku</p>
                </div>
                <div class="bg-white p-6 rounded-lg text-center shadow">
                    <h3 class="font-bold text-lg mb-2">Google</h3>
                    <p class="text-sm text-gray-600">Gemini Pro, Gemini Vision</p>
                </div>
                <div class="bg-white p-6 rounded-lg text-center shadow">
                    <h3 class="font-bold text-lg mb-2">Cohere</h3>
                    <p class="text-sm text-gray-600">Command, Command Light</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="bg-gray-800 text-white py-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p>&copy; 2026 Multi-Model AI Platform. All rights reserved.</p>
            <div class="mt-4 space-x-4">
                <a href="/api/docs" class="hover:text-indigo-400">API Documentation</a>
                <a href="https://github.com" class="hover:text-indigo-400">GitHub</a>
            </div>
        </div>
    </footer>

    <script src="/static/dashboard.js"></script>
</body>
</html>
  `);
});

export default app;
