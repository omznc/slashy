FROM --platform=linux/amd64 node:18-alpine AS install
WORKDIR /app
COPY *.json ./
RUN npm ci --omit=dev
COPY prisma prisma
RUN npx prisma generate

COPY src src
RUN npx tsc --project tsconfig.json
RUN rm -rf src
COPY config config

FROM node:18-alpine as run
COPY --from=install /app /
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 CMD [ "node", "dist/healthcheck.js" ]
ENTRYPOINT ["npm", "run", "start:docker"]
