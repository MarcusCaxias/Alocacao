# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src
RUN npm run build || (npx tsc)

# --- Production Stage ---
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /usr/src/app/dist ./dist

# Create folder for legacy excel migration file if needed
RUN mkdir -p /usr/src/data

EXPOSE 3001

CMD ["node", "dist/index.js"]
