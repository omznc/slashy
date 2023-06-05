FROM --platform=linux/amd64 node:18-alpine AS install
WORKDIR /app
COPY *.json ./
COPY prisma prisma

RUN apk add --update --no-cache openssl1.1-compat && \
    npm ci --omit=dev --ignore-scripts && \
    npx prisma generate

COPY src src
RUN npx tsc --project tsconfig.json && rm -rf src
COPY config config

FROM node:18-alpine AS run

RUN apk add --update --no-cache openssl1.1-compat \
    addgroup -S nonroot \
    && adduser -S nonroot -G nonroot

COPY --from=install /app /

HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 CMD [ "node", "dist/healthcheck.js" ]

USER nonroot

ENTRYPOINT ["npm", "run", "start:docker"]
