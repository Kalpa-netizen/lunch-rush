# Use official Node.js 22 LTS alpine image
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install dependencies cleanly
RUN npm ci

# Copy full application code
COPY . .

# Build the client bundle (Vite SPA into dist/)
RUN npm run build

# Production image
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy built dist, server code, and necessary runtime packages
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/public ./public
COPY --from=builder /app/leaderboard.json ./leaderboard.json

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server/index.js"]
