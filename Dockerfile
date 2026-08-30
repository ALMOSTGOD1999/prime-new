# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

# Copy built assets
COPY --from=builder /app/dist ./dist

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

# Expose the port (Coolify sets PORT env)
EXPOSE 3000

# Run migrations then start server
CMD ["./start.sh"]
