# Revive Market - Docker Deployment Guide

## Prerequisites
- Docker (v20.10+)
- Docker Compose (v1.29+)
- Git

## Quick Start (Development)

### 1. Clone and Setup
```bash
git clone https://github.com/choclinton/Revive-market.git
cd Revive-market
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Build and Run
```bash
docker-compose up -d
```

Access the application at `http://localhost:3000`

### 4. View Logs
```bash
docker-compose logs -f web
```

## Production Deployment

### 1. Build Image for Production
```bash
docker build -t revive-market:latest .
```

### 2. Push to Registry (Docker Hub)
```bash
docker tag revive-market:latest your-username/revive-market:latest
docker push your-username/revive-market:latest
```

### 3. Deploy with Production Compose
```bash
# Set production environment variables
export SUPABASE_URL=your_supabase_url
export SUPABASE_ANON_KEY=your_anon_key

docker-compose -f docker-compose.prod.yml up -d
```

## Docker Commands Reference

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### Rebuild Image
```bash
docker-compose build --no-cache
```

### View Container Logs
```bash
docker-compose logs web
docker-compose logs -f  # follow logs
```

### Execute Command in Container
```bash
docker-compose exec web npm run lint
```

### Remove All Data (including database)
```bash
docker-compose down -v
```

## Environment Variables

### Required for Production
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Optional
- `NODE_ENV` - Set to `production` for prod builds
- `PORT` - Application port (default: 3000)

## Troubleshooting

### Port Already in Use
```bash
# Change port in docker-compose.yml
# Or kill the process
lsof -ti:3000 | xargs kill -9
```

### Container Won't Start
```bash
docker-compose logs web
# Check the error messages
```

### Clear Everything and Start Fresh
```bash
docker-compose down -v
docker system prune -a
docker-compose up -d
```

## Health Checks

The container includes built-in health checks. Monitor status:
```bash
docker-compose ps
```

## Deployment to Cloud Platforms

### AWS ECS
1. Push image to ECR
2. Create ECS task definition
3. Deploy via CloudFormation or ECS console

### Google Cloud Run
```bash
gcloud run deploy revive-market \
  --image gcr.io/your-project/revive-market:latest \
  --port 3000 \
  --allow-unauthenticated
```

### Azure Container Instances
```bash
az container create \
  --resource-group myresourcegroup \
  --name revive-market \
  --image your-registry/revive-market:latest \
  --port 3000
```

### Railway.app / Render.com
- Push GitHub repo with Dockerfile
- Connect to service
- Deploy automatically

## Performance Optimization

### Reduce Image Size
- Use Alpine Linux base (already configured)
- Multi-stage builds (already configured)

### Caching
- Use `.dockerignore` to exclude unnecessary files
- Layer dependencies efficiently

## Security Best Practices

1. **Never commit secrets** - Use `.env` files and secrets management
2. **Use non-root user** (consider adding to Dockerfile):
   ```dockerfile
   RUN addgroup -g 1001 -S nodejs
   RUN adduser -S nodejs -u 1001
   USER nodejs
   ```
3. **Scan images** for vulnerabilities:
   ```bash
   docker scan revive-market:latest
   ```
4. **Keep base images updated** - Regularly rebuild

## Monitoring

### Container Logs
```bash
docker-compose logs -f web
```

### Resource Usage
```bash
docker stats revive-market_web_1
```

## Support
For issues, check logs and ensure:
- All environment variables are set
- Ports are available
- Sufficient disk space
- Docker daemon is running
