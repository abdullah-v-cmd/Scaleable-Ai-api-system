# 🧠 Multi-Model AI Service Platform

A comprehensive, production-ready API platform for accessing multiple AI models from different providers through a unified interface. Built with Hono, TypeScript, and Cloudflare Workers for edge deployment.

[![CI/CD](https://github.com/abdullah-v-cmd/Scaleable-Ai-api-system/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/abdullah-v-cmd/Scaleable-Ai-api-system/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## ✨ Features

### 🤖 Multi-Model AI Support
- **OpenAI**: GPT-4, GPT-3.5 Turbo
- **Anthropic**: Claude 3 Opus, Sonnet, Haiku
- **Google**: Gemini Pro, Gemini Vision
- **Cohere**: Command, Command Light

### 🔐 Security & Authentication
- JWT-based authentication
- API key management
- Role-based access control (RBAC)
- Secure password hashing with Web Crypto API

### 🚦 Rate Limiting
- User-based rate limiting
- IP-based rate limiting for public endpoints
- Configurable limits per endpoint
- Rate limit headers in responses

### 📊 Analytics & Monitoring
- Real-time request logging
- Usage statistics per model
- Performance metrics
- Error tracking
- Request timeline visualization

### 📖 API Documentation
- Interactive Swagger UI
- OpenAPI 3.0 specification
- Complete endpoint documentation
- Example requests and responses

### 🐳 Deployment Options
- **Production**: Cloudflare Pages (Edge deployment)
- **Development**: Docker Compose with Nginx
- Hybrid architecture for flexibility

### 🔄 CI/CD
- Automated testing
- Docker image builds
- Cloudflare Pages deployment
- Security scanning
- GitHub Actions workflows

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- Cloudflare account (for production)
- Docker & Docker Compose (for local development)

### Local Development (Sandbox)

1. **Clone the repository**
```bash
git clone https://github.com/abdullah-v-cmd/Scaleable-Ai-api-system.git
cd Scaleable-Ai-api-system
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup database**
```bash
# Initialize local D1 database
npm run db:migrate:local

# Seed with test data
npm run db:seed
```

4. **Configure environment**
```bash
cp .env.example .dev.vars
# Edit .dev.vars with your API keys
```

5. **Build and start**
```bash
# Build the application
npm run build

# Clean port and start with PM2
fuser -k 3000/tcp 2>/dev/null || true
pm2 start ecosystem.config.cjs

# Check logs
pm2 logs --nostream
```

6. **Access the platform**
- Frontend: http://localhost:3000
- API Docs: http://localhost:3000/api/docs
- Health Check: http://localhost:3000/api/health

### Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services:
- **App**: http://localhost:3000
- **Nginx**: http://localhost:80
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

## 📁 Project Structure

```
webapp/
├── src/
│   ├── index.tsx              # Main application entry
│   ├── routes/                # API route handlers
│   │   ├── auth.ts           # Authentication routes
│   │   ├── ai.ts             # AI inference routes
│   │   └── analytics.ts      # Analytics routes
│   ├── middleware/           # Custom middleware
│   │   ├── auth.ts           # Auth middleware
│   │   ├── rateLimit.ts      # Rate limiting
│   │   └── logger.ts         # Request logging
│   ├── utils/                # Utility functions
│   │   ├── auth.ts           # Auth utilities
│   │   ├── database.ts       # Database helpers
│   │   └── aiProviders.ts    # AI provider integrations
│   └── types/                # TypeScript types
├── public/                   # Static assets
│   └── static/              # JS, CSS files
├── migrations/              # D1 database migrations
├── docker/                  # Docker configuration
│   ├── Dockerfile
│   └── nginx/              # Nginx configs
├── .github/                # GitHub Actions workflows
├── loadtest/               # Load testing scripts
├── docker-compose.yml      # Docker Compose config
├── ecosystem.config.cjs    # PM2 configuration
├── wrangler.jsonc         # Cloudflare configuration
└── package.json           # Dependencies and scripts
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh-api-key` - Generate new API key
- `PUT /api/auth/password` - Change password

### AI Services
- `GET /api/ai/models` - List available models
- `POST /api/ai/chat` - Chat completion (OpenAI-compatible)
- `POST /api/ai/completion` - Text completion
- `POST /api/ai/stream` - Streaming completion
- `GET /api/ai/health` - Service health check

### Analytics
- `GET /api/analytics/stats` - User statistics
- `GET /api/analytics/logs` - Recent request logs
- `GET /api/analytics/usage` - Usage by model
- `GET /api/analytics/timeline` - Request timeline

## 🔐 Authentication Methods

### 1. JWT Token (for frontend/dashboard)
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"user","password":"password123"}'

# Use token in subsequent requests
curl -X GET http://localhost:3000/api/analytics/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. API Key (for API access)
```bash
# Get API key from registration response or dashboard
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## 🤖 AI Provider Configuration

Add your AI provider API keys to `.dev.vars`:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
COHERE_API_KEY=...
```

## 📊 Database Schema

The platform uses Cloudflare D1 (SQLite) with the following tables:

- **users** - User accounts and authentication
- **api_keys** - API key management
- **request_logs** - Request logging and analytics
- **rate_limits** - Rate limiting data
- **ai_models** - Available AI model configurations
- **usage_stats** - User usage statistics

## 🚀 Production Deployment

### Cloudflare Pages

1. **Setup Cloudflare API token**
```bash
# This will be handled by GitHub Actions
export CLOUDFLARE_API_TOKEN=your-token
export CLOUDFLARE_ACCOUNT_ID=your-account-id
```

2. **Create D1 database**
```bash
npx wrangler d1 create ai-platform-db
# Copy database_id to wrangler.jsonc
```

3. **Deploy**
```bash
# Automated via GitHub Actions on push to main
# Or manual deployment:
npm run deploy:prod
```

4. **Run migrations**
```bash
npm run db:migrate:prod
```

5. **Set environment secrets**
```bash
npx wrangler pages secret put OPENAI_API_KEY --project-name ai-platform
npx wrangler pages secret put ANTHROPIC_API_KEY --project-name ai-platform
npx wrangler pages secret put GOOGLE_API_KEY --project-name ai-platform
npx wrangler pages secret put COHERE_API_KEY --project-name ai-platform
npx wrangler pages secret put JWT_SECRET --project-name ai-platform
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Load Testing
```bash
# Install k6
brew install k6  # macOS
# or download from https://k6.io/

# Run load test
k6 run loadtest/script.js

# Test production
k6 run --env BASE_URL=https://your-domain.pages.dev loadtest/script.js
```

### API Testing
```bash
# Health check
curl http://localhost:3000/api/health

# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"test","password":"test1234"}'

# Test AI endpoint
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Hi"}]}'
```

## 📈 Performance

- **Response Time**: p95 < 500ms, p99 < 1000ms
- **Rate Limits**: 100 requests/minute per user (configurable)
- **Concurrent Users**: Tested up to 100 concurrent users
- **Edge Deployment**: Global CDN with low latency

## 🛠️ Development

### Available Scripts
```bash
npm run dev              # Vite dev server
npm run dev:sandbox      # Wrangler dev server (sandbox)
npm run build            # Build for production
npm run preview          # Preview production build
npm run deploy           # Deploy to Cloudflare
npm run deploy:prod      # Deploy to production
npm run db:migrate:local # Apply migrations locally
npm run db:migrate:prod  # Apply migrations to production
npm run db:seed          # Seed database
npm run db:reset         # Reset local database
npm run clean-port       # Kill process on port 3000
npm run test             # Run tests
npm run docker:up        # Start Docker services
npm run docker:down      # Stop Docker services
npm run loadtest         # Run load tests
```

### PM2 Commands
```bash
pm2 start ecosystem.config.cjs  # Start service
pm2 stop ai-platform            # Stop service
pm2 restart ai-platform         # Restart service
pm2 logs ai-platform --nostream # View logs
pm2 delete ai-platform          # Remove from PM2
```

## 🔒 Security

- JWT tokens with configurable expiration
- API key authentication for programmatic access
- Rate limiting to prevent abuse
- CORS configuration
- SQL injection protection
- Input validation
- Secure password hashing

## 📝 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `JWT_SECRET` | Secret key for JWT signing | Yes | - |
| `OPENAI_API_KEY` | OpenAI API key | No | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | No | - |
| `GOOGLE_API_KEY` | Google API key | No | - |
| `COHERE_API_KEY` | Cohere API key | No | - |
| `PORT` | Server port | No | 3000 |
| `NODE_ENV` | Environment | No | development |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Hono](https://hono.dev/) - Lightweight web framework
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge computing platform
- [OpenAI](https://openai.com/) - AI models
- [Anthropic](https://anthropic.com/) - Claude AI
- [Google AI](https://ai.google/) - Gemini models
- [Cohere](https://cohere.ai/) - NLP platform

## 📧 Support

For support, email support@aiplatform.com or open an issue on GitHub.

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=abdullah-v-cmd/Scaleable-Ai-api-system&type=Date)](https://star-history.com/#abdullah-v-cmd/Scaleable-Ai-api-system&Date)

---

Built with ❤️ by Abdullah using Hono and Cloudflare Workers
