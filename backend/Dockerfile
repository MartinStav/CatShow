# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22-alpine

# ---- Base ----
FROM node:${NODE_VERSION} AS base
WORKDIR /app
ENV CI=true

# ---- Dev deps (for build) ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node ace build

# ---- Production deps (only) ----
FROM base AS prod-deps
COPY --from=build /app/build/package.json /app/build/package-lock.json ./
RUN npm ci --omit=dev

# ---- Runtime ----
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3333 \
    LOG_LEVEL=info

RUN apk add --no-cache tini \
    && addgroup -S app \
    && adduser -S app -G app

COPY --from=build --chown=app:app /app/build /app
COPY --from=prod-deps --chown=app:app /app/node_modules /app/node_modules
COPY --chown=app:app docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER app
EXPOSE 3333

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "bin/server.js"]
