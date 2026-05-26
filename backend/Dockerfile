# syntax=docker/dockerfile:1

# ── Stage 1: Install dependencies ──────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production --prefer-offline

# ── Stage 2: Production image ───────────────────────────────
FROM node:20-alpine AS runner

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S appgen -u 1001 -G nodejs

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps --chown=appgen:nodejs /app/node_modules ./node_modules

# Copy source
COPY --chown=appgen:nodejs . .

USER appgen

EXPOSE 4000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "src/index.js"]
