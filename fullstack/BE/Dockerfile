FROM node:18-alpine

WORKDIR /app

# Copy package files from fullstack/BE
COPY fullstack/BE/package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code from fullstack/BE
COPY fullstack/BE/ ./

# Build TypeScript
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Expose port (Railway will set PORT env var)
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 4000) + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["npm", "start"]

