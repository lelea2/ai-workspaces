# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Root deps (includes devDeps for tsc)
COPY package.json package-lock.json ./
RUN npm ci

# Workspace deps
COPY workspace/package.json workspace/package-lock.json ./workspace/
RUN npm ci --prefix workspace

# Server source + config
COPY tsconfig.server.json ./
COPY server ./server

# Workspace source
COPY workspace/index.html ./workspace/
COPY workspace/vite.config.ts ./workspace/
COPY workspace/tsconfig.json workspace/tsconfig.app.json workspace/tsconfig.node.json ./workspace/
COPY workspace/src ./workspace/src
COPY workspace/public ./workspace/public

# Build client (Vite → workspace/dist) then server (tsc → dist-server)
RUN npm run build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

# Production-only dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Built artifacts from builder stage
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/workspace/dist ./workspace/dist

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "dist-server/index.js"]
