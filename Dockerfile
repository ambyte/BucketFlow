# syntax=docker/dockerfile:1
# BucketFlow - S3-compatible storage file manager

# Build stage
FROM node:22-alpine AS builder

# Enable Corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies (frozen lockfile for reproducible builds)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
ENV NODE_ENV=production
RUN pnpm build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy built output from builder
COPY --from=builder /app/.output /app/.output

# Create data directory for persistent storage
RUN mkdir -p /app/.data/storage

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
