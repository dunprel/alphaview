# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production=false

# Copy source and build
COPY . .
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# ─── Stage 2: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid  1001 nestjs

# Copy built artifacts
COPY --from=builder --chown=nestjs:nodejs /app/dist      ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Install MaxMind GeoIP database (download at build time)
# In production, mount a volume with updated DB instead
RUN mkdir -p /usr/share/GeoIP && \
    echo "GeoIP directory created — mount real DB at /usr/share/GeoIP/GeoLite2-Country.mmdb"

# Switch to non-root
USER nestjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/v1/health || exit 1

EXPOSE 3001

ENV NODE_ENV=production \
    PORT=3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
