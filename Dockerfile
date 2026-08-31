# Stage 1: Install ALL dependencies and build
FROM node:22-alpine AS builder
WORKDIR /app
ENV NODE_ENV=development
COPY package.json ./
RUN npm install
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3333

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts
RUN npm install --no-save drizzle-kit

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/drizzle.config.ts ./

EXPOSE 3333

CMD ["sh", "-c", "npx drizzle-kit push --force || echo 'DB migration failed, starting server anyway...'; exec node .output/server/index.mjs"]
