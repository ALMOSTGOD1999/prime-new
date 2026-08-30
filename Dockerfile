# Stage 1: Install ALL dependencies and build (fresh resolve for Linux)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN rm -f package-lock.json && npm install
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN rm -f package-lock.json && npm install --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["sh", "-c", "npx drizzle-kit push --force && node dist/server/server.js"]
