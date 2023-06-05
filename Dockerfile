# Stage 1: Build stage
FROM --platform=$BUILDPLATFORM node:18-alpine AS build
WORKDIR /app

# Install necessary packages
RUN apk add --update --no-cache openssl1.1-compat

# Copy package.json and package-lock.json for dependency installation
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --omit=dev

# Copy Prisma schema and generate Prisma client
COPY prisma prisma
RUN npx prisma generate

# Copy source code, compile TypeScript, and remove unnecessary files
COPY src src
COPY config config
RUN npx tsc --project tsconfig.json

# Stage 2: Run stage
FROM --platform=$TARGETPLATFORM node:18-alpine AS run
# Install necessary packages
RUN apk add --update --no-cache openssl1.1-compat

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy build artifacts from the previous stage
COPY --from=build --chown=appuser /app /

# Healthcheck command
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 CMD [ "node", "dist/healthcheck.js" ]

# Set the entrypoint command
ENTRYPOINT ["npm", "run", "start:docker"]
