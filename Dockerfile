# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:22-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# ============================================
# Stage 2: Build the application
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ============================================
# Stage 3: Production runtime
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 opencami

# Copy built output and required files
COPY --from=builder --chown=opencami:nodejs /app/dist ./dist
COPY --from=builder --chown=opencami:nodejs /app/src ./src
COPY --from=builder --chown=opencami:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=opencami:nodejs /app/package.json ./
COPY --from=builder --chown=opencami:nodejs /app/vite.config.ts ./
COPY --from=builder --chown=opencami:nodejs /app/tsconfig.json ./

USER opencami

EXPOSE 3000

# Health check using /api/ping endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/ping || exit 1

CMD ["npm", "run", "preview", "--", "--host", "--port", "3000"]
