# Deployment Guide

## Table of Contents
1. [Local Development](#local-development)
2. [Docker Development](#docker-development)
3. [Cloudflare Pages Production](#cloudflare-pages-production)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [CI/CD Setup](#cicd-setup)

## Local Development

### 1. Initial Setup
```bash
# Clone repository
git clone https://github.com/abdullah-v-cmd/Scaleable-Ai-api-system.git
cd Scaleable-Ai-api-system

# Install dependencies
npm install

# Configure environment
cp .env.example .dev.vars
# Edit .dev.vars with your API keys
```

### 2. Database Setup
```bash
# Initialize local D1 database
npm run db:migrate:local

# Seed with test data
npm run db:seed
```

### 3. Build and Run
```bash
# Build application
npm run build

# Clean port (if needed)
fuser -k 3000/tcp 2>/dev/null || true

# Start with PM2
pm2 start ecosystem.config.cjs

# Check logs
pm2 logs ai-platform --nostream

# View running processes
pm2 list
```

### 4. Test the Application
```bash
# Health check
curl http://localhost:3000/api/health

# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"test","password":"test12345"}'

# Access the dashboard
open http://localhost:3000

# Access API documentation
open http://localhost:3000/api/docs
```

### 5. Stop Services
```bash
# Stop PM2 service
pm2 stop ai-platform

# Or delete from PM2
pm2 delete ai-platform
```

## Docker Development

### 1. Prerequisites
- Docker Desktop or Docker Engine installed
- Docker Compose installed

### 2. Start Services
```bash
# Start all services (app, nginx, redis, prometheus, grafana)
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app
```

### 3. Access Services
- **Application**: http://localhost:3000
- **Nginx Proxy**: http://localhost:80
- **Grafana Dashboard**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

### 4. Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Cloudflare Pages Production

### 1. Prerequisites
- Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)
- Cloudflare API token with Pages and D1 permissions

### 2. Authentication
```bash
# Login to Cloudflare
wrangler login

# Or set API token
export CLOUDFLARE_API_TOKEN=your-token-here
export CLOUDFLARE_ACCOUNT_ID=your-account-id
```

### 3. Create D1 Database
```bash
# Create production database
wrangler d1 create ai-platform-db

# Copy the database_id from output
# Update wrangler.jsonc with the database_id
```

### 4. Update Configuration
Edit `wrangler.jsonc`:
```jsonc
{
  "name": "ai-platform",
  "compatibility_date": "2026-02-23",
  "pages_build_output_dir": "./dist",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "ai-platform-db",
      "database_id": "your-actual-database-id-here"
    }
  ]
}
```

### 5. Create Cloudflare Pages Project
```bash
# Create Pages project
wrangler pages project create ai-platform \
  --production-branch main \
  --compatibility-date 2026-02-23
```

### 6. Run Migrations
```bash
# Apply migrations to production database
npm run db:migrate:prod
```

### 7. Set Environment Secrets
```bash
# Set JWT secret
wrangler pages secret put JWT_SECRET --project-name ai-platform
# Enter your secure JWT secret when prompted

# Set AI provider API keys (if you have them)
wrangler pages secret put OPENAI_API_KEY --project-name ai-platform
wrangler pages secret put ANTHROPIC_API_KEY --project-name ai-platform
wrangler pages secret put GOOGLE_API_KEY --project-name ai-platform
wrangler pages secret put COHERE_API_KEY --project-name ai-platform
```

### 8. Deploy
```bash
# Build and deploy
npm run deploy:prod

# Or manual deployment
npm run build
wrangler pages deploy dist --project-name ai-platform
```

### 9. Access Your Deployment
After deployment, you'll receive URLs:
- **Production**: `https://ai-platform.pages.dev`
- **Branch deployments**: `https://main.ai-platform.pages.dev`

### 10. Custom Domain (Optional)
```bash
# Add custom domain
wrangler pages domain add example.com --project-name ai-platform

# Follow the DNS configuration instructions
```

## Environment Configuration

### Development (.dev.vars)
```bash
JWT_SECRET=your-dev-jwt-secret
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
COHERE_API_KEY=...
```

### Production (Cloudflare Secrets)
Use `wrangler pages secret put` for all sensitive values.

## Database Setup

### Local Development
```bash
# Create new migration
echo "-- Your SQL here" > migrations/0002_your_migration.sql

# Apply migration
npm run db:migrate:local

# Reset database (drops all data)
npm run db:reset
```

### Production
```bash
# Apply migrations to production
npm run db:migrate:prod

# Execute SQL commands
wrangler d1 execute ai-platform-db --command="SELECT * FROM users LIMIT 10"

# Execute SQL file
wrangler d1 execute ai-platform-db --file=./script.sql
```

## CI/CD Setup

### GitHub Actions Setup

1. **Add GitHub Secrets**:
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
     - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
     - `DOCKER_USERNAME`: Docker Hub username (optional)
     - `DOCKER_PASSWORD`: Docker Hub password (optional)

2. **Add Workflow File**:
   The workflow file `.github/workflows/ci-cd.yml` is included in the repository.
   It will automatically:
   - Run tests on every push
   - Build Docker images on main branch
   - Deploy to Cloudflare Pages on main branch
   - Run security scans

3. **Enable Workflow Permissions**:
   - Go to repository → Settings → Actions → General
   - Under "Workflow permissions", select "Read and write permissions"
   - Check "Allow GitHub Actions to create and approve pull requests"

## Monitoring and Maintenance

### View Logs
```bash
# Local (PM2)
pm2 logs ai-platform

# Production (Cloudflare)
wrangler pages deployment tail --project-name ai-platform
```

### Monitor Performance
```bash
# Local (Grafana)
# Access http://localhost:3001

# Production (Cloudflare Dashboard)
# Visit Cloudflare Dashboard → Pages → ai-platform → Analytics
```

### Database Backups
```bash
# Local database backup
cp -r .wrangler/state/v3/d1 ./backups/d1_backup_$(date +%Y%m%d)

# Production: Use Cloudflare D1 export (when available)
# Or query and save data
wrangler d1 execute ai-platform-db --command="SELECT * FROM users" > users_backup.json
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
fuser -k 3000/tcp

# Or find and kill manually
lsof -ti:3000 | xargs kill -9
```

### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear dist and rebuild
rm -rf dist
npm run build
```

### Database Issues
```bash
# Reset local database
npm run db:reset

# Check database content
wrangler d1 execute ai-platform-db --local --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### PM2 Issues
```bash
# Restart PM2 daemon
pm2 kill
pm2 start ecosystem.config.cjs

# Clear PM2 logs
pm2 flush
```

## Performance Optimization

### 1. Cloudflare Caching
Configure caching rules in Cloudflare Dashboard:
- Cache static assets for 1 year
- Cache API responses with appropriate TTL
- Use Cache API in Workers for dynamic content

### 2. Database Optimization
- Add indexes for frequently queried columns
- Use prepared statements (already implemented)
- Monitor query performance with EXPLAIN

### 3. Rate Limiting
Adjust rate limits based on your needs in `src/middleware/rateLimit.ts`:
```typescript
const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  '/api/ai/chat': { maxRequests: 100, windowMinutes: 60 },
  '/api/ai/completion': { maxRequests: 100, windowMinutes: 60 },
  default: { maxRequests: 200, windowMinutes: 60 }
};
```

## Security Best Practices

1. **Never commit secrets**: Use .dev.vars locally and Cloudflare secrets in production
2. **Rotate API keys**: Regularly rotate JWT secrets and API keys
3. **Monitor access**: Review request logs regularly
4. **Update dependencies**: Keep dependencies up to date (`npm audit fix`)
5. **Use HTTPS only**: Cloudflare automatically provides HTTPS
6. **Implement CORS properly**: Configure allowed origins in production

## Support and Resources

- **Documentation**: https://github.com/abdullah-v-cmd/Scaleable-Ai-api-system
- **Issues**: https://github.com/abdullah-v-cmd/Scaleable-Ai-api-system/issues
- **Cloudflare Docs**: https://developers.cloudflare.com/
- **Hono Docs**: https://hono.dev/

---

For more detailed information, see the main [README.md](README.md).
