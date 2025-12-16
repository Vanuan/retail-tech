# VST Backend - Dockerized

Virtual Shelf Testing Backend with Dockerized PostgreSQL and Prisma ORM.

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Git

### Development Setup

1. **Clone and setup environment:**
```bash
git clone <repository-url>
cd vst-backend-dockerized
cp .env.docker .env
```

2. **Start all services with Docker Compose:**
```bash
npm run docker:up
```

This will start:
- PostgreSQL database on port 5432
- Prisma Studio on port 5555
- Backend API on port 3000

3. **Apply database migrations:**
```bash
# In a new terminal, run database migrations
npm run prisma:migrate

# Or seed the database with sample data
npm run prisma:db:seed
```

4. **Access services:**
- API: http://localhost:3000
- Health Check: http://localhost:3000/health
- Prisma Studio: http://localhost:5555

### Development Commands

```bash
# Start services
npm run docker:up

# Start services in detached mode
npm run docker:up:detached

# Stop services
npm run docker:down

# View logs
npm run docker:logs
npm run docker:logs:app
npm run docker:logs:db

# Access database shell
npm run docker:exec:db

# Run Prisma commands
npm run prisma:studio    # Open Prisma Studio
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Create and apply migrations
```

### Testing the Critical Endpoint

The core behavioral tracking endpoint is ready to use:

```bash
# Record an interaction
curl -X POST http://localhost:3000/api/v1/interactions/tests/00000000-0000-0000-0000-000000000001/interactions \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-test-123",
    "anonymousId": "anon-456",
    "type": "CLICK",
    "elementId": "buy-button",
    "elementType": "button",
    "metadata": {
      "x": 150,
      "y": 200,
      "page": "product-page"
    }
  }'
```

### Production Deployment

#### Option 1: Railway (Recommended)
1. Push code to GitHub
2. Connect repository to Railway
3. Add environment variables from `.env.production`
4. Deploy

#### Option 2: Docker Compose Production
```bash
# Build and start production services
npm run docker:prod:up

# Or build first, then start
npm run docker:prod:build
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

#### Option 3: Docker Swarm/Kubernetes
See `deploy/` directory for Kubernetes manifests.

## Project Structure

```
vst-backend-dockerized/
├── src/
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── routes/         # API route definitions
│   ├── services/       # Business logic
│   ├── utils/         # Utility functions
│   └── config/        # Configuration
├── prisma/
│   ├── schema.prisma  # Database schema
│   └── migrations/    # Database migrations
├── docker/
│   └── postgres/     # PostgreSQL config
├── docker-compose.yml      # Development Docker setup
├── docker-compose.prod.yml # Production Docker setup
├── Dockerfile             # Production Dockerfile
└── Dockerfile.dev        # Development Dockerfile
```

## Core Features

✅ **High-volume Interaction Tracking**: POST `/api/v1/interactions/tests/:testId/interactions`
✅ **Dockerized PostgreSQL**: Easy setup and consistent environment
✅ **Prisma ORM**: Type-safe database operations
✅ **JWT Authentication**: Secure API endpoints
✅ **Health Checks**: Built-in monitoring endpoints
✅ **Comprehensive Logging**: Structured logging for debugging
✅ **Rate Limiting**: Protection against abuse
✅ **CORS Support**: Configurable cross-origin requests
✅ **Compression**: Gzip compression for responses
✅ **Input Validation**: Comprehensive request validation

## Environment Variables

See `.env.example` for all available environment variables.

## API Documentation

Once running, visit:
- http://localhost:3000/api/v1/docs (if Swagger is added)
- http://localhost:5555 (Prisma Studio for database exploration)

## Monitoring

- Health endpoint: `GET /health`
- Detailed health: `GET /health/detailed`
- Metrics endpoint: `GET /metrics` (if Prometheus is configured)

## Contributing

1. Create feature branch
2. Make changes
3. Run tests: `npm test`
4. Run linter: `npm run lint`
5. Create pull request
