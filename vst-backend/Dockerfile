FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install system dependencies for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package.json bun.lockb ./
COPY prisma ./prisma/

# Install dependencies
RUN bun install --production

# Generate Prisma client
RUN bun run prisma:generate

# Copy source code
COPY . .

# Build the application (optional - Bun can run TypeScript directly)
RUN bun build src/server.ts --outdir dist --target node

# Production stage
FROM oven/bun:1-alpine

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json .

# Create non-root user
RUN addgroup -g 1001 -S bun && \
    adduser -S bun -u 1001

USER bun

# Expose port
EXPOSE 3000

# Start the application
CMD ["bun", "run", "dist/server.js"]
