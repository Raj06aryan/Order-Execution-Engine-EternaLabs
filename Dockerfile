# Build Stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=builder /app/dist ./dist

# Copy migrations for runtime execution
# In the build stage, we copy src/db/migrations to dist/db/migrations via the build script or here
# Let's do it here to be safe
COPY --from=builder /app/src/db/migrations ./dist/db/migrations

EXPOSE 3000
CMD ["node", "dist/server.js"]